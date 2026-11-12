/**
 * 短音效：全部实时合成，零素材。
 * 约定：一次性节点的 onended 里 disconnect，不留悬挂图。
 *
 * 2026-11-03 优化：
 * - 背景音乐 / 地点环境音已下线，短音效是唯一出声的东西，所以做了一次整体重校：
 *   打字音从"纯三角波电子音"改成"极短噪声舌尖 + 三角波身体"，更像笔尖落纸；
 *   推进/回退的气流声压窄了频带，不再呼啦一片；
 *   统一加了 35ms 同名节流，快速连点不会叠成机关枪。
 * - 生成中的"低频嗡"原本是常驻循环（等于背景底噪），已改成一次性的两声轻提示。
 */
import { getBus, getOptions } from './context';

export type SfxName =
  | 'type'
  | 'advance'
  | 'back'
  | 'click'
  | 'clue'
  | 'deduce'
  | 'truth'
  | 'overturn'
  | 'error';

let noiseCache: AudioBuffer | null = null;

/** 同名音效的最小间隔：同一毫秒级连点只响一声。 */
const THROTTLE_MS = 35;
const lastPlayed = new Map<SfxName, number>();

/** 1 秒白噪声，复用到所有噪声类音效。 */
function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseCache) return noiseCache;
  const length = Math.floor(ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseCache = buffer;
  return buffer;
}

function cleanup(...nodes: AudioNode[]) {
  return () => {
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {
        // 已断开
      }
    }
  };
}

interface PingOptions {
  freq: number;
  at: number;
  duration: number;
  peak: number;
  type?: OscillatorType;
  /** 送进共享混响的湿声量 0–1 */
  wet?: number;
}

/** 单个衰减音：起音 2ms、指数衰减到静音。 */
function ping(ctx: AudioContext, out: AudioNode, opts: PingOptions): void {
  const { freq, at, duration, peak, type = 'sine', wet = 0 } = opts;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(gain);
  gain.connect(out);

  let sendGain: GainNode | null = null;
  const bus = getBus();
  if (wet > 0 && bus) {
    sendGain = ctx.createGain();
    sendGain.gain.value = wet;
    gain.connect(sendGain);
    sendGain.connect(bus.reverb);
  }

  osc.start(at);
  osc.stop(at + duration + 0.02);
  const done = cleanup(osc, gain, ...(sendGain ? [sendGain] : []));
  osc.onended = done;
}

/** 噪声扫频：推进/回退都用它。窄频带 + 短包络，避免"呼啦"一片。 */
function whoosh(
  ctx: AudioContext,
  out: AudioNode,
  from: number,
  to: number,
  peak: number,
  duration: number,
  q = 1.6,
): void {
  const at = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), at + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(out);

  source.start(at);
  source.stop(at + duration + 0.03);
  source.onended = cleanup(source, filter, gain);
}

/** 一撮极短的高频噪声：给音效加"质感"，单独听几乎不可闻。 */
function tickNoise(ctx: AudioContext, out: AudioNode, peak: number, duration: number, cutoff = 2600): void {
  const at = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  source.start(at);
  source.stop(at + duration + 0.02);
  source.onended = cleanup(source, filter, gain);
}

/** 打字音：噪声舌尖（纸/笔）+ 极短三角波身体，音量压低避免机关枪。 */
function typeTick(ctx: AudioContext, out: AudioNode): void {
  const at = ctx.currentTime;
  const freq = 760 + Math.random() * 460;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, at);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.026, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.016);

  osc.connect(gain);
  gain.connect(out);
  osc.start(at);
  osc.stop(at + 0.022);
  osc.onended = cleanup(osc, gain);

  tickNoise(ctx, out, 0.012, 0.01, 2400);
}

/** 音阶（等十二平均律，从 A4=440 起算的常用音高）。 */
const HZ = {
  E5: 659.25,
  B5: 987.77,
  C5: 523.25,
  E4: 329.63,
  G4: 392.0,
  B4: 493.88,
  D5: 587.33,
  F5: 698.46,
  A5: 880.0,
  G5: 783.99,
};

export function playSfx(name: SfxName): void {
  const bus = getBus();
  if (!bus) return;
  if (bus.ctx.state !== 'running') return;
  if (!getOptions().enabled) return;
  if (name === 'type' && !getOptions().typing) return;

  const nowMs = bus.ctx.currentTime * 1000;
  const previous = lastPlayed.get(name);
  if (previous !== undefined && nowMs - previous < THROTTLE_MS) return;
  lastPlayed.set(name, nowMs);

  const { ctx } = bus;
  const out = bus.sfx;
  const now = ctx.currentTime;

  switch (name) {
    case 'type':
      typeTick(ctx, out);
      break;

    case 'advance':
      // 翻页：气流从中频收向低频，像纸页掠过
      whoosh(ctx, out, 980, 320, 0.07, 0.13);
      break;

    case 'back':
      whoosh(ctx, out, 320, 980, 0.058, 0.13);
      break;

    case 'click':
      ping(ctx, out, { freq: 640, at: now, duration: 0.04, peak: 0.026, type: 'sine' });
      tickNoise(ctx, out, 0.006, 0.008, 3000);
      break;

    case 'clue':
      ping(ctx, out, { freq: HZ.E5, at: now, duration: 0.22, peak: 0.055, type: 'triangle', wet: 0.25 });
      ping(ctx, out, { freq: HZ.B5, at: now + 0.07, duration: 0.3, peak: 0.045, type: 'triangle', wet: 0.3 });
      break;

    case 'deduce':
      [HZ.C5, HZ.E5, HZ.G5].forEach((freq, i) => {
        ping(ctx, out, { freq, at: now + i * 0.07, duration: 0.4, peak: 0.05, type: 'triangle', wet: 0.35 });
      });
      break;

    case 'truth':
      [HZ.C5, HZ.E5, HZ.G5, HZ.B5, HZ.F5].forEach((freq, i) => {
        ping(ctx, out, { freq, at: now + i * 0.11, duration: 1.1, peak: 0.05, type: 'triangle', wet: 0.5 });
      });
      ping(ctx, out, { freq: 130.81, at: now, duration: 1.6, peak: 0.06, type: 'sine', wet: 0.2 });
      break;

    case 'overturn':
      ping(ctx, out, { freq: HZ.G5, at: now, duration: 0.3, peak: 0.04, type: 'triangle', wet: 0.3 });
      ping(ctx, out, { freq: 698.46 * Math.pow(2, -1 / 12), at: now + 0.1, duration: 0.45, peak: 0.04, type: 'triangle', wet: 0.3 });
      whoosh(ctx, out, 1200, 400, 0.03, 0.25);
      break;

    case 'error':
      // 原来是方波，太刺；换成三角波 + 小二度，闷一点更像"不行"
      ping(ctx, out, { freq: 233, at: now, duration: 0.1, peak: 0.028, type: 'triangle' });
      ping(ctx, out, { freq: 220, at: now + 0.11, duration: 0.14, peak: 0.028, type: 'triangle' });
      break;
  }
}

/**
 * 生成中提示：一次性两声轻响，不再常驻循环。
 * 背景底噪已下线，这里必须"响完就停"，否则又变成一层持续嗡嗡声。
 */
let generating = false;

export function setGenerating(on: boolean): void {
  if (on === generating) return;
  generating = on;
  if (!on) return;

  const bus = getBus();
  if (!bus || bus.ctx.state !== 'running' || !getOptions().enabled) return;

  const { ctx } = bus;
  const now = ctx.currentTime;
  ping(ctx, bus.sfx, { freq: 174.61, at: now, duration: 0.34, peak: 0.03, type: 'sine', wet: 0.25 });
  ping(ctx, bus.sfx, { freq: 130.81, at: now + 0.16, duration: 0.5, peak: 0.026, type: 'sine', wet: 0.3 });
}
