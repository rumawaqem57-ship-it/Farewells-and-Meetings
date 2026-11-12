import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseScript, stripThinking } from '../script/parser';
import type { ScriptLine } from '../script/types';
import { SAMPLE_FLOOR } from '../playback/sample';
import { getIframeEvents, getTavernEvents, getTavernFn, getSillyTavernContext } from './api';
import { clearRerollGuard } from '../session';
import { CHARACTERS } from '../playback/characters';

export const STORY_EVENT = 'koi_story_updated';

export interface GameEngine {
  available: boolean;
  lines: ScriptLine[];
  /** 当前楼层原文：给线索标签/关键词发牌用 */
  raw: string;
  floorId: number | null;
  lastFloorId: number | null;
  viewingFloorId: number | null;
  floors: number[];
  isGenerating: boolean;
  storyKey: string;
  error: string | null;
  send: (text: string) => Promise<void>;
  reroll: () => Promise<void>;
  gotoFloor: (id: number) => Promise<void>;
  prevFloor: () => void;
  nextFloor: () => void;
  followLatest: () => void;
}

interface ChatMessage {
  message_id?: number;
  message?: string;
  role?: string;
}

/** generate 可能返回字符串或带 content/message/text 的对象。 */
function extractGeneratedText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const key of ['content', 'message', 'text', 'response']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
  }
  return '';
}

/**
 * 楼层三态 + 生成锁 + 事件四信号。
 * 无酒馆（本地预览）时：lines = 样例剧本，其余能力静默降级。
 */
export function useGameEngine(): GameEngine {
  const [available, setAvailable] = useState(false);
  const [raw, setRaw] = useState(SAMPLE_FLOOR);
  const [floorId, setFloorId] = useState<number | null>(null);
  const [lastFloorId, setLastFloorId] = useState<number | null>(null);
  const [floors, setFloors] = useState<number[]>([]);
  const [viewingFloorId, setViewingFloorId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyVersion, setStoryVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const viewingRef = useRef<number | null>(null);
  const generatingRef = useRef(false);
  const lastRawRef = useRef(raw);

  // 小说体预设不给说话人；用已知角色名 + 玩家 persona 做上下文推断。
  // 注意：不能把 name2（角色卡名）当人名 —— 多角色剧情卡的卡名常是世界/组织名
  //（本卡就是「恋喰者」），一旦进候选表，正文提到它就会把所有对白都标成它。
  const parseOptions = useMemo(() => {
    const context = getSillyTavernContext<{ name1?: string; name2?: string }>();
    const playerName = typeof context?.name1 === 'string' ? context.name1.trim() : '';
    const usablePlayer = /^(user|用户|你|you|player|玩家)$/i.test(playerName) ? '' : playerName;
    const names = [
      ...new Set([...Object.keys(CHARACTERS), usablePlayer].filter(Boolean)),
    ];
    // 别名 → 正式名：正文里「澄子」「七海澄子」混着写，不折叠会在立绘/名牌上变成两个人
    const aliases: Record<string, string> = {};
    for (const [key, meta] of Object.entries(CHARACTERS)) {
      if (key !== meta.name) aliases[key] = meta.name;
    }
    return {
      names,
      defaultSpeaker: usablePlayer || undefined,
      aliases,
    };
  }, []);

  const loadFloor = useCallback(async (id: number) => {
    const getMsgs = getTavernFn<(range: string, options?: any) => Promise<ChatMessage[]>>('getChatMessages');
    if (!getMsgs) return;
    try {
      const msgs = await getMsgs(`${id}-${id}`);
      const message = msgs?.[0];
      if (!message) return;
      const text = String(message.message ?? '');
      setRaw(text);
      setFloorId(id);
      if (text !== lastRawRef.current) {
        lastRawRef.current = text;
        setStoryVersion(value => value + 1);
      }
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const gotoFloor = useCallback(
    async (id: number) => {
      viewingRef.current = id;
      setViewingFloorId(id);
      await loadFloor(id);
    },
    [loadFloor],
  );

  const reload = useCallback(
    async (follow: boolean) => {
      const getLast = getTavernFn<() => Promise<number>>('getLastMessageId');
      const getMsgs = getTavernFn<(range: string, options?: any) => Promise<ChatMessage[]>>('getChatMessages');
      if (!getLast || !getMsgs) return;
      try {
        const last = await getLast();
        setLastFloorId(last);
        const all = await getMsgs(`0-${last}`, { role: 'assistant' });
        const ids = (all ?? [])
          .map(item => item.message_id)
          .filter((id): id is number => typeof id === 'number');
        setFloors(ids);
        const target = follow || viewingRef.current == null ? ids[ids.length - 1] : viewingRef.current;
        if (typeof target === 'number') await loadFloor(target);
      } catch (e) {
        setError(String(e));
      }
    },
    [loadFloor],
  );

  useEffect(() => {
    const on = getTavernFn<(event: string, handler: (...args: any[]) => void) => any>('eventOn');
    const events = getTavernEvents();
    if (!on || !events) return;

    setAvailable(true);
    const offs: Array<() => void> = [];
    const sub = (event: string | undefined, handler: (...args: any[]) => void) => {
      if (!event) return;
      try {
        const handle = on(event, handler);
        if (handle && typeof handle.stop === 'function') offs.push(() => handle.stop());
      } catch {
        /* 事件不可用：忽略 */
      }
    };

    sub(events.CHAT_CHANGED, () => {
      viewingRef.current = null;
      setViewingFloorId(null);
      void reload(true);
    });

    sub(events.MESSAGE_RECEIVED, () => {
      // 流式期间只记录楼层号，不重新加载、不 bump（防抖①）
      if (generatingRef.current) return;
      void reload(viewingRef.current == null);
    });

    sub(events.MESSAGE_UPDATED, (id: number) => {
      if (generatingRef.current && id !== viewingRef.current) return;
      void reload(viewingRef.current == null);
    });

    const iframeEvents = getIframeEvents();
    sub(iframeEvents?.GENERATION_ENDED, () => {
      window.setTimeout(() => {
        generatingRef.current = false;
        setIsGenerating(false);
        viewingRef.current = null;
        setViewingFloorId(null);
        void reload(true);
      }, 300);
    });

    sub(STORY_EVENT, () => {
      void reload(viewingRef.current == null);
    });

    void reload(true);

    return () => {
      offs.forEach(off => off());
    };
  }, [reload]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content) return;
      const slash = getTavernFn<(command: string) => Promise<any>>('triggerSlash');
      if (!slash) {
        setError('未连接酒馆：当前为本地演示');
        return;
      }
      generatingRef.current = true;
      setIsGenerating(true);
      if (viewingRef.current == null && lastFloorId != null) {
        viewingRef.current = lastFloorId;
        setViewingFloorId(lastFloorId);
      }
      try {
        await slash(`/send ${content}`);
        await slash('/trigger await=true');
      } catch (e) {
        generatingRef.current = false;
        setIsGenerating(false);
        setError(String(e));
      }
    },
    [lastFloorId],
  );

  /** 重 roll：静默生成 + 原地替换，不触发酒馆重渲染（iframe 不会退出）。 */
  const reroll = useCallback(async () => {
    if (generatingRef.current) return;
    const getMsgs = getTavernFn<(range: string, options?: any) => Promise<ChatMessage[]>>(
      'getChatMessages',
    );
    const getLast = getTavernFn<() => Promise<number>>('getLastMessageId');
    const generate = getTavernFn<(config: any) => Promise<any>>('generate');
    const setMsgs = getTavernFn<(msgs: any[], options?: any) => Promise<any>>('setChatMessages');
    if (!getMsgs || !getLast || !generate || !setMsgs) {
      setError('当前环境不支持重生成（缺少 generate/setChatMessages）');
      return;
    }

    generatingRef.current = true;
    setIsGenerating(true);
    try {
      const last = await getLast();
      const lastMsg = (await getMsgs(`${last}-${last}`))?.[0];
      if (!lastMsg || lastMsg.role !== 'assistant') {
        throw new Error('最后一层不是 AI 楼层，无法重生成');
      }

      let userText = '';
      let userFloor = -1;
      for (let i = last - 1; i >= 0; i -= 1) {
        const msg = (await getMsgs(`${i}-${i}`))?.[0];
        if (msg?.role === 'user') {
          userText = String(msg.message ?? '');
          userFloor = i;
          break;
        }
      }
      if (!userText) throw new Error('未找到上一层的用户输入');

      const history = (await getMsgs(`0-${userFloor}`)) ?? [];
      const prompts = history.map(msg => ({
        role: msg.role as 'system' | 'assistant' | 'user',
        content: String(msg.message ?? ''),
      }));

      const raw = await generate({
        user_input: userText,
        should_stream: false,
        should_silence: true,
        overrides: { chat_history: { prompts } },
      });
      let text = extractGeneratedText(raw);
      if (!text.trim()) {
        console.warn('[koi][reroll] generate 返回空', {
          type: typeof raw,
          keys: raw && typeof raw === 'object' ? Object.keys(raw) : [],
        });
        // 兜底：用 generateRaw 按同样的历史与角色信息再生成一次
        const generateRaw = getTavernFn<(config: any) => Promise<any>>('generateRaw');
        if (generateRaw) {
          const fallback = await generateRaw({
            should_silence: true,
            ordered_prompts: [
              'world_info_before',
              'char_description',
              'char_personality',
              'scenario',
              'world_info_after',
              ...prompts,
            ],
          });
          text = extractGeneratedText(fallback);
          if (text.trim()) console.info('[koi][reroll] generateRaw 兜底成功');
        }
      }
      if (!text.trim()) {
        throw new Error('AI 返回了空响应：generate 与 generateRaw 都没有拿到正文');
      }
      const filtered = stripThinking(text).trim();
      if (!filtered) throw new Error('AI 只返回了思维链，没有正文');

      // refresh:'none' 是关键：不触发消息 iframe 重渲染，前端自己更新。
      await setMsgs([{ message_id: last, message: filtered }], { refresh: 'none' });
      setRaw(filtered);
      lastRawRef.current = filtered;
      setStoryVersion(value => value + 1);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
      clearRerollGuard();
    }
  }, []);

  const prevFloor = useCallback(() => {
    if (floorId == null) return;
    const at = floors.indexOf(floorId);
    if (at > 0) void gotoFloor(floors[at - 1]);
  }, [floorId, floors, gotoFloor]);

  const nextFloor = useCallback(() => {
    if (floorId == null) return;
    const at = floors.indexOf(floorId);
    if (at >= 0 && at < floors.length - 1) void gotoFloor(floors[at + 1]);
    else {
      viewingRef.current = null;
      setViewingFloorId(null);
      void reload(true);
    }
  }, [floorId, floors, gotoFloor, reload]);

  const followLatest = useCallback(() => {
    viewingRef.current = null;
    setViewingFloorId(null);
    void reload(true);
  }, [reload]);

  const lines = useMemo(() => parseScript(raw, parseOptions), [raw, parseOptions]);
  const storyKey = `${floorId ?? 'sample'}:${storyVersion}`;

  return {
    available,
    lines,
    raw,
    floorId,
    lastFloorId,
    viewingFloorId,
    floors,
    isGenerating,
    storyKey,
    error,
    send,
    reroll,
    gotoFloor,
    prevFloor,
    nextFloor,
    followLatest,
  };
}
