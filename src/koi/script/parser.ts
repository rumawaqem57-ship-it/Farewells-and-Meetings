import type { SceneLocation, ScenePhase, SceneWeather, ScriptLine } from './types.ts';

/**
 * 剧本解析器：楼层文本 → ScriptLine[]。
 *
 * 纯函数，零酒馆依赖，可直接用 Node 跑单测。
 * 解析顺序（不可颠倒）：先剥思维链 → 再取 <content> → 再逐行状态机。
 */

/** 思维链标签（成对剥离）。新标签往这里加，播放/历史/重生成共用这一份。 */
const THINKING_TAGS = [
  'think',
  'thinking',
  'thinking_process',
  'Chain_of_Thought',
  'chain_of_thought',
  'cot',
  'draft',
  'simple_thinking',
  'analysis',
  'reflection',
  'reasoning',
  'thought',
  'inner_thoughts',
  'deepthink',
  'scratchpad',
] as const;

// 不用反向引用：模型常见 <Think>…</think> 大小写不一致；标签也可能带属性
const THINKING_RE = new RegExp(
  `<(${THINKING_TAGS.join('|')})\\b[^>]*>[\\s\\S]*?<\\/(?:${THINKING_TAGS.join('|')})\\s*>`,
  'gi',
);

/** 去掉成对思维链标签（含内容）。 */
export function stripThinking(raw: string): string {
  return raw.replace(THINKING_RE, '');
}

const CONTENT_BLOCK_RE = /<content>([\s\S]*?)<\/content>/gi;

/** 预设的演出层标签：这些块不属于正文，整块丢弃。 */
const NON_BODY_BLOCKS = [
  'tucao',
  'options',
  'guifan',
  'danmu',
  'disclaimer',
  'htmlcontent',
  'advice',
  'current_event',
  'progress',
  'details',
  'summary',
  'IzumiEdit',
  'konatan_chat',
  'konatan_planning',
  'konatan_planning~',
  'think',
  'thinking',
  'analysis',
  'reasoning',
  'thought',
  'style',
  'script',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 酒馆楼层常见的分隔标记：`（第2楼）` / `【第3楼】` / `第 2 层` / `#2`。
 * 不是剧情内容——出现过整屏只有一行「（第2楼）」的情况。
 */
const FLOOR_MARK_RE = /^[（(【[「]?\s*(?:第\s*\d+\s*[楼層层]|#\s*\d+)\s*[）)】\]」]?$/;

/**
 * 思维链 / 小节规划块：正文和选项都不该看到，必须在任何演出层处理**之前**剥掉。
 *
 * 必须前置的原因（真机踩过）：预设规定的字面量
 *   「本文の後に <options>（4つの選択肢）を配置する。」
 * 会出现在 <konatan_planning~> 里。若先跑 <options> 的成对正则，
 * 它会把思维链里的这个字面量当成开标签，一路吞到文末真正的 </options>，
 * 于是正文只剩下思维链的前半段、选项则变成"思维链若干行 + 正文前几段"。
 */
function stripMetaBlocks(text: string): string {
  let out = stripThinking(text);
  // 标签名末尾带波浪号：<konatan_planning~>…</konatan_planning~>
  out = out.replace(/<konatan_planning~?[^>]*>[\s\S]*?<\/konatan_planning~?\s*>/gi, '');
  out = out.replace(/<IzumiEdit\b[^>]*>[\s\S]*?<\/IzumiEdit\s*>/gi, '');
  return out;
}

/** 去掉预设的演出层块，只留下正文文字；<user>/<clue> 等协议标签不动。 */
export function stripNonBodyBlocks(text: string): string {
  let out = stripMetaBlocks(text);
  for (const tag of NON_BODY_BLOCKS) {
    const name = escapeRegExp(tag);
    // 用 lookahead 代替 \b：标签名可能以 ~ 结尾（konatan_planning~），\b 在 ~ 与 > 之间不成立；
    // 同时避免 konatan_planning 误吃 konatan_planning~ 的开标签。
    out = out.replace(new RegExp(`<${name}(?=[\\s/>]|$)[^>]*>[\\s\\S]*?<\\/${name}\\s*>`, 'gi'), '');
  }
  // 自闭合/残留的演出层标签
  out = out.replace(/<StatusPlaceHolderImpl\b[^>]*\/?>/gi, '');
  out = out.replace(/<\/?konatan_planning~?[^>]*>/gi, '');
  out = out.replace(/<br\s*\/?>/gi, '\n');
  // 模型偶尔漏掉 </options>，未闭合块会把选项原文漏进正文 —— 从该标签起截掉尾巴。
  // 但正文里也可能**提到**这个字面量（"下次讨论 <options> 怎么写"），
  // 所以只在整个标签独占行首时才认定是块开始。
  const openOptions = out.search(/<options\b/i);
  if (openOptions >= 0 && !/<\/options\s*>/i.test(out)) {
    const lineStart = out.lastIndexOf('\n', openOptions) + 1;
    if (out.slice(lineStart, openOptions).trim() === '') out = out.slice(0, openOptions);
  }
  // 同理：<tucao>/<htmlcontent> 未闭合且独占行首时，一并截断
  for (const tag of ['tucao', 'htmlcontent', 'disclaimer', 'advice']) {
    const open = out.search(new RegExp(`<${tag}\\b`, 'i'));
    if (open < 0) continue;
    if (new RegExp(`</${tag}\\s*>`, 'i').test(out)) continue;
    const lineStart = out.lastIndexOf('\n', open) + 1;
    if (out.slice(lineStart, open).trim() === '') out = out.slice(0, open);
  }
  // 只剥 HTML 外壳，保留里面的文字；注意不要把 <user> 误当成 <u>
  out = out.replace(
    /<\/?(?:span|div|p|b|strong|i|em|u|s|section|article|h[1-6]|ul|ol|li|blockquote)(?=\s|\/?>)[^>]*>/gi,
    '',
  );
  return out;
}

/** 预设偶尔把整段正文包在 markdown 代码块里，先剥掉外层围栏。 */
function stripOuterFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```$/);
  return match ? match[1].trim() : trimmed;
}

/** 工具调用型预设：消息可能是 {"content":"…"} 或 tool_calls[].function.arguments。 */
function extractJsonContent(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const value = JSON.parse(trimmed) as any;
    if (typeof value?.content === 'string') return value.content;
    const args = value?.tool_calls?.[0]?.function?.arguments;
    if (typeof args === 'string') {
      const inner = JSON.parse(args) as any;
      if (typeof inner?.content === 'string') return inner.content;
    }
  } catch {
    // 不是 JSON：交给正常流程
  }
  return null;
}

/**
 * 取出可播正文：
 * - 有 <content> 块：只取块内，并剥掉块内的演出层标签；
 * - 没有：先看是不是工具调用 JSON，再降级为「剥完思维链的全文」。
 */
export function extractPlayable(raw: string): string {
  const cleaned = stripOuterFence(stripThinking(raw));
  const jsonContent = cleaned.includes('<content>') ? null : extractJsonContent(cleaned);
  const source = jsonContent ?? cleaned;
  const blocks: string[] = [];
  CONTENT_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CONTENT_BLOCK_RE.exec(source)) !== null) {
    blocks.push(match[1]);
  }
  const body = stripNonBodyBlocks(blocks.length > 0 ? blocks.join('\n') : source);
  // 楼层标记（第2楼）不是剧情，历史/播放都不该看到
  return body
    .split(/\r?\n/)
    .filter(line => !FLOOR_MARK_RE.test(line.trim()))
    .join('\n')
    .trim();
}

/** 播放前剥掉线索标签，避免它们被当成旁白念出来。 */
/** 兼容旧楼层：世界书 V2 已删除线索系统，但历史记录里可能残留 <clue> 标签。 */
export function stripClueTags(text: string): string {
  return text.replace(/<clue\b[^>]*>[\s\S]*?<\/clue>/gi, '').replace(/<\/?clue\b[^>]*>/gi, '');
}

/* ============================================================
 * 选项解析（Izumi 预设的 <options> 块）
 * 预设格式：
 *   <options>
 *   >选项一：[…]
 *   >选项二：[…]
 *   </options>
 * ============================================================ */

const OPTIONS_BLOCK_RE = /<options\b[^>]*>([\s\S]*?)<\/options\s*>/gi;
const OPTION_LINE_RE = /^\s*[>＞]?\s*选项\s*[一二三四五六七八九十\d]*\s*[：:.、]\s*/;
const OPTION_MAX = 6;
const OPTION_LEN = 140;

/** 单行清洗：去引用符、列表符、编号、「选项X：」前缀、包裹的引号。 */
function cleanOptionLine(line: string): string {
  let text = line.trim();
  if (!text) return '';

  text = text.replace(/^[>＞]\s*/, '');
  text = text.replace(/^[-*+•]\s*/, '');
  text = text.replace(/^\d+\s*[.、)]\s*/, '');
  text = text.replace(OPTION_LINE_RE, '');
  text = text.replace(/\*\*/g, ''); // markdown 粗体标记（可能是片段，不一定是整行包裹）
  text = text.replace(/^["“「『]([\s\S]*)["”」』]$/, '$1');
  text = text.replace(/<[^>]+>/g, '').trim();

  // 纯标签行、纯分隔符直接丢
  if (!text || /^[-—=_·.。]+$/.test(text)) return '';
  return text.slice(0, OPTION_LEN);
}

/**
 * 从楼层原文里抽选项。
 * 只认「选项X：」前缀行 —— 模型经常把思维链/正文整段塞进 <options>，
 * 那些行没有前缀，按"收所有非空行"会把思维链当成四个选项显示出来。
 */
export function extractOptions(raw: string): string[] {
  // 先剥思维链/规划块：里面可能写着「<options>（4つの選択肢）を配置する。」
  const source = stripMetaBlocks(raw);

  const collectPrefixed = (body: string): string[] =>
    body
      .split(/\r?\n/)
      .filter(line => OPTION_LINE_RE.test(line.trim()))
      .map(cleanOptionLine)
      .filter(Boolean);

  // 优先：合格的 <options> 块（至少两条带前缀）
  for (const block of source.matchAll(OPTIONS_BLOCK_RE)) {
    const items = collectPrefixed(block[1]);
    if (items.length >= 2) return dedupeOptions(items);
  }

  // 兜底：没有块 / 块不合格 → 全文扫前缀行，同样要连续两条以上
  const loose = collectPrefixed(source);
  return loose.length >= 2 ? dedupeOptions(loose) : [];
}

function dedupeOptions(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= OPTION_MAX) break;
  }
  return out;
}

const SCENE_RE = /^\[scene:(.+?)\]$/;
const SCENE_TAIL_RE = /-(晴|阴|雪)?(昼|夜)$/;

// 对话 / 独白：行首整行锚定，不做自由文本扫描；容忍全角冒号与「」引号。
const USER_DIALOG_RE = /^<user>\s*[:：]\s*["“「]([\s\S]+)["”」]$/;
const DIALOG_RE = /^(.+?)\[(.+?)\]\s*[:：]\s*["“「]([\s\S]+)["”」]$/;
const MD_DIALOG_RE = /^\*\*(.+?)\*\*\s*[:：]\s*["“「]([\s\S]+)["”」]$/;
/**
 * 模型省略情绪标签时的写法：`澄子:"…"`。
 * 只认角色表里已知的名字（见下方 known 判断）——正文里的「他说:"…"」不会被误当说话人。
 * 参考项目只支持 `角色名[情绪]:"…"` 一种格式、完全不推断；我们保留推断作为兜底，
 * 但只要模型给了名字就走精确匹配，能不猜就不猜。
 */
const PLAIN_DIALOG_RE = /^([^\s:：\[\]"“”「」]{1,12})\s*[:：]\s*["“「]([\s\S]+)["”」]$/;
const THOUGHT_RE = /^(.+?)\[(.+?)\]\s*[:：]\s*\*([\s\S]+)\*$/;
/** 小说体：整行只有一句引号对白，说话人靠上下文推断。 */
const QUOTE_ONLY_RE = /^["“「]([\s\S]+)["”」]$/;
/** 小说体：`桐谷朔说：“…”` / `她低声问：“…”` */
const NAMED_SPEECH_RE = /^(.{1,20}?)(?:说|问|答|喊|道|低语|笑道|开口)\s*[:：]?\s*["“「]([\s\S]+)["”」]$/;
/** 隐藏说话人标记：<!--speaker:名字--> 或 <speaker>名字</speaker> */
const SPEAKER_MARK_RE = /^(?:<!--\s*speaker\s*:\s*(.+?)\s*-->|<speaker>(.+?)<\/speaker>)$/i;

/** AI 偶尔把人物名写成行首标签，如 `[人物:茶客甲][害怕]:"…"`。 */
const SPEAKER_PREFIX_RE = /^\[[^\]]*[:：]([^\]]+)\]\s*/;

/**
 * 方括号标注说话人 + 台词：`[人物:何清]"…"` / `[人物:何清]:"…"`。
 * 预设若要保「对白孑然一身」的排版，只要在行首加这个标签，前端就能精确取名字，不必推断。
 */
const TAG_SPEAKER_DIALOG_RE = /^\[[^\]]*[:：]([^\]]+)\]\s*[:：]?\s*["“「]([\s\S]+)["”」]\s*$/;

function parseScene(line: string): SceneLocation | null {
  const match = line.match(SCENE_RE);
  if (!match) return null;

  let body = match[1].trim();
  let phase: ScenePhase | undefined;
  let weather: SceneWeather | undefined;
  // 尾段两种写法：-夜 / -雪夜 / -晴昼
  const tail = body.match(SCENE_TAIL_RE);
  if (tail) {
    weather = (tail[1] as SceneWeather | undefined) || undefined;
    phase = tail[2] as ScenePhase;
    body = body.slice(0, -tail[0].length).trim();
  }

  return {
    path: body,
    displayName: body.split('/').filter(Boolean).pop() ?? body,
    phase,
    // 只有真写了天气才带这个键，避免老楼层对比时多出 undefined 字段
    ...(weather ? { weather } : {}),
  };
}

/** 楼层文本 → 剧本行。 */
export interface ParseOptions {
  /** 已知角色名：用于小说体推断说话人 */
  names?: string[];
  /** 推断不出时使用的默认说话人（通常是玩家 persona 名） */
  defaultSpeaker?: string;
  /**
   * 别名 → 正式名。同一角色在正文里可能写全名也可能写简称
   *（「七海澄子」/「澄子」），不归一会被当成两个人：立绘两套、说话人牌两套。
   */
  aliases?: Record<string, string>;
}

function findMentioned(text: string, names: string[]): string {
  let best = '';
  let position = -1;
  // names 已按长度降序：长名先占位，短名若被长名包含就跳过，
  // 否则「七海澄子」会被同一行里的「澄子」顶掉。
  for (const name of names) {
    if (best && best.includes(name)) continue;
    const at = text.lastIndexOf(name);
    if (at > position) {
      position = at;
      best = name;
    }
  }
  return best;
}

function inferSpeaker(
  text: string,
  lastMentioned: string,
  lastSpeaker: string,
  defaultSpeaker: string,
  names: string[],
  canon: (name: string) => string,
): string {
  // “桐谷同学。”这类呼语：如果最近提到的人正是被称呼的人，优先用上一个说话人
  const vocative = names.find(name => {
    if (!text.startsWith(name)) return false;
    const tail = text.slice(name.length, name.length + 4);
    return /同学|君|桑|先生|小姐|前辈/.test(tail);
  });
  if (vocative) {
    const full = canon(vocative);
    if (full === lastMentioned && lastSpeaker && lastSpeaker !== full) return lastSpeaker;
  }
  return lastMentioned || lastSpeaker || defaultSpeaker;
}

export function parseScript(raw: string, options: ParseOptions = {}): ScriptLine[] {
  const text = stripClueTags(extractPlayable(raw));
  const lines: ScriptLine[] = [];
  const names = [...new Set((options.names ?? []).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  const aliases = options.aliases ?? {};
  /** 别名折叠：所有写入 ScriptLine 的说话人都过这一层，保证同一角色只有一个名字 */
  const canon = (name: string): string => {
    const trimmed = name.trim();
    return aliases[trimmed] || trimmed;
  };
  const defaultSpeaker = canon(options.defaultSpeaker ?? '');
  let location: SceneLocation | undefined;
  let lastMentioned = '';
  let lastSpeaker = '';
  let pendingSpeaker = '';

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    line = line.replace(/^>\s*/, '');

    if (FLOOR_MARK_RE.test(line)) continue;

    const scene = parseScene(line);
    if (scene) {
      location = scene;
      continue;
    }

    const marker = line.match(SPEAKER_MARK_RE);
    if (marker) {
      pendingSpeaker = canon(marker[1] || marker[2] || '');
      continue;
    }

    // [人物:何清]"…" —— 预设用方括号标注说话人时，直接精确取，不推断
    const tagSpeaker = line.match(TAG_SPEAKER_DIALOG_RE);
    if (tagSpeaker) {
      const name = canon(tagSpeaker[1]);
      lines.push({ type: 'dialog', speaker: name, text: tagSpeaker[2].trim(), location });
      lastSpeaker = name;
      lastMentioned = name;
      pendingSpeaker = '';
      continue;
    }

    line = line.replace(SPEAKER_PREFIX_RE, '$1');

    const userDialog = line.match(USER_DIALOG_RE);
    if (userDialog) {
      lines.push({ type: 'dialog', speaker: '<user>', text: userDialog[1].trim(), location });
      lastSpeaker = '<user>';
      continue;
    }

    const dialog = line.match(DIALOG_RE);
    if (dialog) {
      const speaker = canon(dialog[1]);
      lines.push({
        type: 'dialog',
        speaker,
        emotion: dialog[2].trim(),
        text: dialog[3].trim(),
        location,
      });
      lastSpeaker = speaker;
      lastMentioned = speaker;
      pendingSpeaker = '';
      continue;
    }

    // 名字:"台词"（省略情绪标签）—— 只认角色表里已知的名字，不猜
    const plainDialog = line.match(PLAIN_DIALOG_RE);
    if (plainDialog) {
      const candidate = canon(plainDialog[1]);
      const known =
        candidate === defaultSpeaker || names.some(name => canon(name) === candidate);
      if (known) {
        lines.push({
          type: 'dialog',
          speaker: candidate,
          text: plainDialog[2].trim(),
          location,
        });
        lastSpeaker = candidate;
        lastMentioned = candidate;
        pendingSpeaker = '';
        continue;
      }
    }

    // 预设把台词写成 **角色**：“…” 时的兜底。
    const mdDialog = line.match(MD_DIALOG_RE);
    if (mdDialog) {
      const speaker = canon(mdDialog[1]);
      lines.push({
        type: 'dialog',
        speaker,
        text: mdDialog[2].trim(),
        location,
      });
      lastSpeaker = speaker;
      lastMentioned = speaker;
      pendingSpeaker = '';
      continue;
    }

    const thought = line.match(THOUGHT_RE);
    if (thought) {
      const speaker = canon(thought[1]);
      lines.push({
        type: 'thought',
        speaker,
        emotion: thought[2].trim(),
        text: thought[3].trim(),
        location,
      });
      lastSpeaker = speaker;
      lastMentioned = speaker;
      pendingSpeaker = '';
      continue;
    }

    // 小说体：`桐谷朔说：“…”` 或 `她低声问：“…”`
    const namedSpeech = line.match(NAMED_SPEECH_RE);
    if (namedSpeech) {
      const before = namedSpeech[1].trim();
      const speaker = canon(
        names.find(name => before.includes(name)) ||
          before.replace(/[，,。.\s]/g, '').slice(-12) ||
          defaultSpeaker,
      );
      lines.push({
        type: 'dialog',
        speaker: speaker || defaultSpeaker,
        text: namedSpeech[2].trim(),
        location,
      });
      lastSpeaker = speaker || defaultSpeaker;
      lastMentioned = lastSpeaker;
      pendingSpeaker = '';
      continue;
    }

    // 小说体：整行只有引号对白，说话人靠上下文推断
    const quoteOnly = line.match(QUOTE_ONLY_RE);
    if (quoteOnly) {
      const speaker =
        pendingSpeaker ||
        inferSpeaker(quoteOnly[1], lastMentioned, lastSpeaker, defaultSpeaker, names, canon);
      // 推断不出就留空 —— 不显示名字牌，好过挂一个错的（曾把卡名「恋喰者」当说话人）
      const resolved = speaker || defaultSpeaker || '';
      lines.push({
        type: 'dialog',
        speaker: resolved || undefined,
        text: quoteOnly[1].trim(),
        location,
      });
      lastSpeaker = resolved;
      if (speaker) lastMentioned = speaker;
      pendingSpeaker = '';
      continue;
    }

    // 兜底：旁白（独立成段；旁白里的引号台词不会被误认，因为只做行首整行匹配）。
    lines.push({ type: 'narrator', text: line, location });
    const mentioned = findMentioned(line, names);
    if (mentioned) lastMentioned = canon(mentioned);
  }

  return lines;
}
