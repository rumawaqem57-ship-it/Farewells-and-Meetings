/**
 * 音频总线：懒建单例 + 音效支路。
 * 铁律：任何一步失败都返回 null，调用方静默跳过——声音绝不能影响播放。
 *
 * 2026-11-03 起只保留一次性交互音效：背景音乐（drone）与地点环境音已下线，
 * 所以总线里不再有 bgm / amb 两条常驻支路，只剩 sfx + 共享混响。
 */

export interface KoiAudioBus {
  ctx: AudioContext;
  master: GainNode;
  /** 音效支路（唯一出声的支路） */
  sfx: GainNode;
  /** 共享卷积混响（湿声总入口） */
  reverb: ConvolverNode;
}

export interface AudioOptions {
  /** 总开关；false 时所有声音立即静音 */
  enabled: boolean;
  /** 打字音开关 */
  typing: boolean;
}

let bus: KoiAudioBus | null = null;
let failed = false;

/** 音量记为 0–1 的原始比例，AudioContext 未建时也要能记住 */
let level = 0.6;

let options: AudioOptions = { enabled: true, typing: true };

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/** 程序生成脉冲响应：噪声 × 指数衰减，不用加载任何音频文件。 */
function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

/** 取总线；首次调用时创建。老浏览器/被策略禁用 → 永久返回 null。 */
export function getBus(): KoiAudioBus | null {
  if (bus) return bus;
  if (failed) return null;
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      failed = true;
      return null;
    }
    const ctx = new Ctor();

    const master = ctx.createGain();
    master.gain.value = 0.9;

    // 压缩器：连续点击/打字时压住峰值，避免叠成刺耳的爆音
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;

    master.connect(compressor);
    compressor.connect(ctx.destination);

    const sfx = ctx.createGain();
    sfx.gain.value = level;
    sfx.connect(master);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.4, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    reverb.connect(wet);
    wet.connect(master);

    bus = { ctx, master, sfx, reverb };
    applyOptions();
    return bus;
  } catch {
    failed = true;
    return null;
  }
}

/** 必须在用户手势内调用（标题页开始按钮 / 播放页首次点击）。 */
export function unlockAudio(): void {
  const current = getBus();
  if (!current) return;
  if (current.ctx.state !== 'running') {
    void current.ctx.resume().catch(() => {});
  }
}

/** 0–100 的音效滑杆值 → 总线增益（平滑过渡，不爆音）。 */
export function setLevel(sePct: number): void {
  level = clamp01(sePct / 100);
  if (!bus) return;
  bus.sfx.gain.setTargetAtTime(level, bus.ctx.currentTime, 0.05);
}

export function getOptions(): AudioOptions {
  return options;
}

/** 上下文是否已经建过（用于避免在未解锁时就创建）。 */
export function isBuilt(): boolean {
  return !!bus;
}

/** 总开关 / 打字音 两态集中下发。 */
export function setAudioOptions(next: Partial<AudioOptions>): void {
  options = { ...options, ...next };
  applyOptions();
}

function applyOptions(): void {
  if (!bus) return;
  const now = bus.ctx.currentTime;
  const target = options.enabled ? 0.9 : 0;
  bus.master.gain.setTargetAtTime(target, now, 0.08);
}

/** 页面切到后台时挂起，省电也避免奇怪的重复音。 */
export function suspendAll(): void {
  if (bus && bus.ctx.state === 'running') void bus.ctx.suspend().catch(() => {});
}

export function resumeAll(): void {
  if (bus && bus.ctx.state === 'suspended' && options.enabled) void bus.ctx.resume().catch(() => {});
}

/** 供 CDP 断言用；不参与任何逻辑。 */
export function debugState() {
  return {
    built: !!bus,
    failed,
    state: bus?.ctx.state ?? 'none',
    se: level,
    options,
  };
}
