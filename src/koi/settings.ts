/** 玩家偏好：localStorage（跨会话），与 sessionStorage 的会话进度分开。 */
export type TextSpeed = 'instant' | 'slow' | 'normal' | 'fast';
export type AutoWait = 'short' | 'normal' | 'long';
export type DisplayMode = 'auto' | 'desktop' | 'mobile';

export interface KoiSettings {
  /** 音频总开关 */
  audioEnabled: boolean;
  /** 打字音 */
  typingSfx: boolean;
  /** 音效音量 0–100（背景音乐与环境音已下线，只剩这一档） */
  se: number;
  speed: TextSpeed;
  autoWait: AutoWait;
  display: DisplayMode;
  particles: boolean;
}

export const DEFAULT_SETTINGS: KoiSettings = {
  audioEnabled: true,
  typingSfx: true,
  se: 60,
  speed: 'normal',
  autoWait: 'normal',
  display: 'auto',
  particles: true,
};

const KEY = 'koi-settings';

export const SPEED_CPS: Record<TextSpeed, number> = {
  instant: 0,
  slow: 26,
  normal: 42,
  fast: 64,
};

export const SPEED_LABEL: Record<TextSpeed, string> = {
  instant: '瞬间',
  slow: '慢速',
  normal: '普通',
  fast: '快速',
};

export const AUTO_DELAY: Record<AutoWait, number> = {
  short: 900,
  normal: 1600,
  long: 2600,
};

export const AUTO_LABEL: Record<AutoWait, string> = {
  short: '短',
  normal: '普通',
  long: '长',
};

const TEXT_SPEEDS: TextSpeed[] = ['instant', 'slow', 'normal', 'fast'];
const AUTO_WAITS: AutoWait[] = ['short', 'normal', 'long'];
const DISPLAY_MODES: DisplayMode[] = ['auto', 'desktop', 'mobile'];

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pickPercent(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * 只挑当前版本认识的字段：老存档里的 bgm / ambience 等已下线字段
 * 会在读取时被丢掉，不会写回、也不会残留在内存里。
 */
export function loadSettings(): KoiSettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || 'null');
    const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      audioEnabled: pickBool(parsed.audioEnabled, DEFAULT_SETTINGS.audioEnabled),
      typingSfx: pickBool(parsed.typingSfx, DEFAULT_SETTINGS.typingSfx),
      se: pickPercent(parsed.se, DEFAULT_SETTINGS.se),
      speed: pickEnum(parsed.speed, TEXT_SPEEDS, DEFAULT_SETTINGS.speed),
      autoWait: pickEnum(parsed.autoWait, AUTO_WAITS, DEFAULT_SETTINGS.autoWait),
      display: pickEnum(parsed.display, DISPLAY_MODES, DEFAULT_SETTINGS.display),
      particles: pickBool(parsed.particles, DEFAULT_SETTINGS.particles),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: KoiSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 隐私模式/配额满：静默降级
  }
}
