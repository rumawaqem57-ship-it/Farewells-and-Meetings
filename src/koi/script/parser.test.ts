import assert from 'node:assert/strict';
import { extractOptions, extractPlayable, parseScript, stripThinking } from './parser.ts';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log('  ok -', name);
}

const fullSample = `<think>
这段是思维链，播放器不能看见。
</think>

<content>
[scene:住宅/公寓一室-夜]
心春[担心]:"哥哥，你回来得好晚。"
<user>:"路上遇到点事。"
心春[平静]:*他肯定又在查那件事。*
窗外的雨还在下，公寓里只开着一盏灯。
</content>`;

console.log('S1 · scriptParser 单测');

test('stripThinking 成对剥离所有思维链标签', () => {
  const raw = '<think>a</think>正文<Chain_of_Thought>b</Chain_of_Thought>';
  assert.equal(stripThinking(raw), '正文');
});

test('extractPlayable 优先取 <content> 块', () => {
  const playable = extractPlayable(fullSample);
  assert.ok(!playable.includes('思维链'));
  assert.ok(playable.includes('哥哥，你回来得好晚。'));
});

test('无 <content> 时降级为剥完思维链的全文', () => {
  const raw = '<thinking>藏起来</thinking>\n旁白第一行\n灯[冷淡]:"……"';
  const playable = extractPlayable(raw);
  assert.ok(playable.startsWith('旁白第一行'));
  assert.ok(!playable.includes('藏起来'));
});

test('多个 <content> 块按顺序合并', () => {
  const raw = '<content>第一段</content>\n<content>第二段</content>';
  assert.equal(extractPlayable(raw), '第一段\n第二段');
});

test('预设演出层只取 <content> 正文，丢掉其他标签块', () => {
  const raw = `<konatan_planning~>这里是思考</konatan_planning~><content>
[scene:住宅/客厅-夜]
灯[平静]:"你回来了。"
<tucao>这里的吐槽不能播</tucao>
</content>
<tucao>正文结束后的吐槽</tucao>
<details><summary>摘要</summary>摘要内容</details>
<options>选项</options>`;
  const playable = extractPlayable(raw);
  assert.ok(playable.includes('你回来了。'));
  assert.ok(!playable.includes('这里是思考'));
  assert.ok(!playable.includes('吐槽'));
  assert.ok(!playable.includes('摘要'));
  assert.ok(!playable.includes('选项'));
});

test('工具调用 JSON 只取 content 字段', () => {
  const raw = JSON.stringify({
    content: '<content>[scene:住宅/客厅-夜]\n灯[平静]:"你回来了。"</content>',
  });
  const playable = extractPlayable(raw);
  assert.ok(playable.includes('你回来了。'));
  assert.ok(!playable.includes('content'));
});

test('小说体引号对白按上下文补说话人', () => {
  const raw = `[scene:住宅/客厅-夜]
桐谷朔停下脚步，向她打了声招呼。
“你好。”
<!--speaker:心春-->
“桐谷同学。”`;
  const lines = parseScript(raw, {
    names: ['桐谷朔', '心春'],
    defaultSpeaker: '桐谷朔',
  });
  const dialogs = lines.filter(line => line.type === 'dialog');
  assert.equal(dialogs.length, 2);
  assert.equal(dialogs[0].speaker, '桐谷朔');
  assert.equal(dialogs[1].speaker, '心春');
});

test('基础四类行 + 场景继承', () => {
  const lines = parseScript(fullSample);

  assert.equal(lines.length, 4);

  assert.deepEqual(lines[0], {
    type: 'dialog',
    speaker: '心春',
    emotion: '担心',
    text: '哥哥，你回来得好晚。',
    location: { path: '住宅/公寓一室', displayName: '公寓一室', phase: '夜' },
  });

  assert.equal(lines[1].type, 'dialog');
  assert.equal(lines[1].speaker, '<user>');
  assert.equal(lines[1].text, '路上遇到点事。');

  assert.equal(lines[2].type, 'thought');
  assert.equal(lines[2].speaker, '心春');
  assert.equal(lines[2].emotion, '平静');
  assert.equal(lines[2].text, '他肯定又在查那件事。');

  assert.equal(lines[3].type, 'narrator');
  assert.equal(lines[3].text, '窗外的雨还在下，公寓里只开着一盏灯。');

  // 场景对之后所有行生效，不是只对下一行
  for (const line of lines) {
    assert.equal(line.location?.path, '住宅/公寓一室');
    assert.equal(line.location?.phase, '夜');
  }
});

test('场景切换后新行使用新场景', () => {
  const raw = `<content>
[scene:住宅/公寓一室-夜]
心春[担心]:"早点睡。"
[scene:店/便利店-昼]
涟[疲惫]:"欢迎光临。"
</content>`;
  const lines = parseScript(raw);
  assert.equal(lines[0].location?.path, '住宅/公寓一室');
  assert.equal(lines[1].location?.path, '店/便利店');
  assert.equal(lines[1].location?.phase, '昼');
});

test('全角冒号与全角引号也容忍', () => {
  const raw = '<content>灯[冷淡]：“……你来了。”</content>';
  const [line] = parseScript(raw);
  assert.equal(line.type, 'dialog');
  assert.equal(line.speaker, '灯');
  assert.equal(line.text, '……你来了。');
});

test('行首 [人物:名字] 标签替换为说话人', () => {
  const raw = '<content>[人物:茶客甲][害怕]:"那东西……真的存在吗？"</content>';
  const [line] = parseScript(raw);
  assert.equal(line.type, 'dialog');
  assert.equal(line.speaker, '茶客甲');
  assert.equal(line.emotion, '害怕');
});

test('旁白里的引号台词不误判为对话', () => {
  const raw = '<content>他低声说了句"别去"，然后走了。</content>';
  const [line] = parseScript(raw);
  assert.equal(line.type, 'narrator');
});

test('空行与纯空白被跳过', () => {
  const raw = '<content>\n\n   \n[scene:学校/教室-昼]\n\n心春[平静]:"上课了。"\n</content>';
  const lines = parseScript(raw);
  assert.equal(lines.length, 1);
});

test('抽 <options> 块：四条、前缀剥净、不进正文', () => {
  const raw = `<content>
心春[担心]:"哥哥，你回来得好晚。"
<options>
>选项一：走过去拍拍她的头。
>选项二：先把伞收好，再回答。
>选项三：问她今天怎么还没睡。
>选项四：把便利店袋子递过去。
</options>
</content>`;
  const options = extractOptions(raw);
  assert.equal(options.length, 4);
  assert.equal(options[0], '走过去拍拍她的头。');
  assert.equal(options[3], '把便利店袋子递过去。');

  const lines = parseScript(raw);
  assert.equal(lines.length, 1);
  assert.ok(!lines.some(line => line.text.includes('选项一')));
});

test('没有 <options> 包裹时按「选项X：」兜底抽取', () => {
  const raw = `<content>
灯[冷淡]:"你还在查那件事？"
选项一：承认。
选项二：岔开话题。
选项三：反问她。
</content>`;
  const options = extractOptions(raw);
  assert.equal(options.length, 3);
  assert.equal(options[1], '岔开话题。');
});

test('单条「选项一」不误判（需连续两条以上）', () => {
  const raw = '<content>她提了一句「选项一：随便看看」就走了。</content>';
  assert.equal(extractOptions(raw).length, 0);
});

test('选项里的思考链与占位方括号被清掉', () => {
  const raw = `<think>内部推理</think>
<options>
>选项一：**[激动]** 冲上去抱住她。
>选项二：「先冷静一下。」
</options>`;
  const options = extractOptions(raw);
  assert.equal(options.length, 2);
  assert.equal(options[0], '[激动] 冲上去抱住她。');
  assert.equal(options[1], '先冷静一下。');
});

test('<options> 里混入思维链时只取带前缀的行', () => {
  const raw = `<content>
何清推开门。
<options>
（4つの選択肢）を配置する。
文字数コントロール：風景のディテールを丁寧に描写する。
よし、準備完了！最高の映画的オープニングを書いてやるぞ！
>选项一：直接走进去。
>选项二：先在门口听一会儿。
</options>
</content>`;
  const options = extractOptions(raw);
  assert.equal(options.length, 2);
  assert.equal(options[0], '直接走进去。');
  assert.equal(options[1], '先在门口听一会儿。');
});

test('<options> 里全是思维链（无前缀）时不产选项', () => {
  const raw = `<content>
正文。
<options>
01 （4つの選択肢）を配置する。
02 文字数コントロール：800トークン以上は確保する。
03 よし、準備完了！
</options>
</content>`;
  assert.equal(extractOptions(raw).length, 0);
});

test('漏掉 </options> 时不污染正文，选项仍能解析', () => {
  const raw = `<content>
心春点了点头。
<options>
>选项一：去便利店看看。
>选项二：留在公寓等她。
</content>`;
  const lines = parseScript(raw);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, '心春点了点头。');
  assert.equal(extractOptions(raw).length, 2);
});

test('思维链标签大小写不一致也剥得掉', () => {
  const raw = '<content><Think>内部推理</think>心春[平静]:"走吧。"</content>';
  const [line] = parseScript(raw);
  assert.equal(line.speaker, '心春');
  assert.ok(!line.text.includes('内部推理'));
});

test('思维链里写了 <options> 字面量时不会吞掉正文与真选项', () => {
  const raw = `<konatan_planning~>
- 思考をすぐ日本語に切り替える！
- 本文の前に <tucao>、本文の後に <options>（4つの選択肢）を配置する。
- 文字数コントロール：800トークン以上。
</konatan_planning~><tucao>这是第一幕的吐槽。</tucao>社团楼二层的走廊里没开灯。

何清站在走廊中段的那扇木门前。

<options>
>选项一：走过去看看那扇门。
>选项二：先敲两下门。
</options>`;

  const playable = extractPlayable(raw);
  assert.ok(playable.includes('社团楼二层的走廊里没开灯'), '正文第一段应保留');
  assert.ok(playable.includes('何清站在走廊中段'), '正文第二段应保留');
  assert.ok(!playable.includes('4つの選択肢'), '思维链不应进正文');
  assert.ok(!playable.includes('这是第一幕的吐槽'), 'tucao 不应进正文');

  const options = extractOptions(raw);
  assert.equal(options.length, 2);
  assert.equal(options[0], '走过去看看那扇门。');
  assert.equal(options[1], '先敲两下门。');
});

test('konatan_planning 不带波浪号时也能剥', () => {
  const raw = '<konatan_planning>内部计划</konatan_planning><content>心春点了点头。</content>';
  const lines = parseScript(raw);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, '心春点了点头。');
});

test('正文提到 <options> 字面量但真的没有选项时不产选项', () => {
  const raw = '<content>她指了指白板右下角，那里写着"下次讨论 <options> 怎么写"。</content>';
  assert.equal(extractOptions(raw).length, 0);
  const [line] = parseScript(raw);
  assert.ok(line.text.includes('options'));
});

test('楼层标记（第2楼）整行被丢弃', () => {
  const raw = '<content>（第2楼）\n心春点了点头。\n【第3楼】\n她转过身。\n第 4 层\n走廊空了。</content>';
  const lines = parseScript(raw);
  assert.equal(lines.length, 3);
  assert.ok(!lines.some(line => /第\s*\d+\s*[楼层層]/.test(line.text)));
});

test('引号对白推断不出说话人时留空，不挂默认名', () => {
  const raw = '<content>走廊里没有开灯。\n"你好。"</content>';
  const lines = parseScript(raw, { names: ['心春'], defaultSpeaker: '' });
  assert.equal(lines[1].type, 'dialog');
  assert.equal(lines[1].speaker, undefined);
});

test('正文提到卡名不会把后续对白全标成卡名', () => {
  const raw = '<content>她低声提起恋喰者这个词。\n"你好。"\n"请进。"</content>';
  // 关键：names 里没有卡名（恋喰者），所以不会被 findMentioned 捕获
  const lines = parseScript(raw, { names: ['心春'], defaultSpeaker: '' });
  assert.equal(lines[1].speaker, undefined);
  assert.equal(lines[2].speaker, undefined);
});

test('给出了默认说话人时，推断失败才回落到它', () => {
  const raw = '<content>门开着。\n"进来吧。"</content>';
  const lines = parseScript(raw, { names: ['心春'], defaultSpeaker: '何清' });
  assert.equal(lines[1].speaker, '何清');
});

test('同一角色的全名与简称归一到同一个名字', () => {
  const raw = `<content>
澄子[平静]:"你来了。"
七海澄子[平静]:"坐吧。"
澄子[平静]:"喝茶吗？"
</content>`;
  const lines = parseScript(raw, { aliases: { 澄子: '七海澄子' } });
  assert.deepEqual(
    lines.map(line => line.speaker),
    ['七海澄子', '七海澄子', '七海澄子'],
  );
});

test('小说体推断出来的简称也会归一', () => {
  const raw = '<content>澄子抬起头，把杯子推过来。\n"你来了。"</content>';
  const lines = parseScript(raw, {
    names: ['七海澄子', '澄子'],
    aliases: { 澄子: '七海澄子' },
  });
  assert.equal(lines[1].speaker, '七海澄子');
});

test('归一后说话人集合只剩一个键（立绘不会出两套）', () => {
  const raw = `<content>
澄子[平静]:"嗯。"
七海澄子[平静]:"……"
澄子[平静]:"走吧。"
</content>`;
  const lines = parseScript(raw, { aliases: { 澄子: '七海澄子' } });
  const unique = new Set(lines.map(line => line.speaker).filter(Boolean));
  assert.equal(unique.size, 1);
});

test('名字:"台词"（无情绪标签）且名字已知 → 精确识别并归一', () => {
  const raw = '<content>澄子:"你来了。"</content>';
  const lines = parseScript(raw, {
    names: ['七海澄子', '澄子'],
    aliases: { 澄子: '七海澄子' },
  });
  assert.equal(lines[0].type, 'dialog');
  assert.equal(lines[0].speaker, '七海澄子');
});

test('未知名字的 名字:"台词" 不当说话人', () => {
  const raw = '<content>注意:"别碰那个。"</content>';
  const lines = parseScript(raw, { names: ['心春'], aliases: {} });
  assert.equal(lines[0].type, 'narrator');
});

test('[人物:名字]"台词" 精确取说话人并归一', () => {
  const raw = `<content>
[人物:澄子]“你来了。”
[人物:七海澄子]：“坐吧。”
</content>`;
  const lines = parseScript(raw, { aliases: { 澄子: '七海澄子' } });
  assert.equal(lines.length, 2);
  assert.equal(lines[0].type, 'dialog');
  assert.equal(lines[0].speaker, '七海澄子');
  assert.equal(lines[1].speaker, '七海澄子');
});

test('场景标签支持天气位：-雪夜 / -晴昼 / -夜 / 无后缀', () => {
  const raw = `<content>
[scene:街/商店街-雪夜]
雪落下来了。
[scene:街/商店街-晴昼]
阳光很亮。
[scene:住宅/公寓一室-夜]
灯亮着。
[scene:学校/教室]
上课了。
</content>`;
  const lines = parseScript(raw);
  const loc = (i: number) => lines[i].location!;

  assert.equal(loc(0).weather, '雪');
  assert.equal(loc(0).phase, '夜');
  assert.equal(loc(0).displayName, '商店街');
  assert.equal(loc(0).path, '街/商店街');

  assert.equal(loc(1).weather, '晴');
  assert.equal(loc(1).phase, '昼');

  assert.equal(loc(2).weather, undefined);
  assert.equal(loc(2).phase, '夜');

  assert.equal(loc(3).phase, undefined);
  assert.equal(loc(3).weather, undefined);
  assert.equal(loc(3).displayName, '教室');
});

console.log(`\n${passed} passed`);
