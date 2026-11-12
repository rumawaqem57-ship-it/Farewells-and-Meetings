/** 会话进度：sessionStorage（关标签即清），只存页面与行号，对应参考文件的 saveSession/restoreSession。 */
export interface KoiSession {
  v: 1;
  page: 'title' | 'play';
  index: number;
}

const KEY = 'koi-session';

export function readSession(): KoiSession | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!raw || raw.v !== 1) return null;
    if (raw.page !== 'title' && raw.page !== 'play') return null;
    return { v: 1, page: raw.page, index: Number.isFinite(raw.index) ? raw.index : 0 };
  } catch {
    return null;
  }
}

export function writeSession(session: KoiSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // 隐私模式/配额满：静默降级，不影响主流程
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 忽略
  }
}

/**
 * 重 roll 保护：酒馆重生成会重渲染消息 iframe，sessionStorage 可能丢失。
 * 点重生成前写 localStorage，重载后 30 秒内直接回播放页。
 */
const REROLL_KEY = 'koi-reroll-guard';

export function writeRerollGuard(index: number): void {
  try {
    localStorage.setItem(REROLL_KEY, JSON.stringify({ index, at: Date.now() }));
  } catch {
    // 忽略
  }
}

export function readRerollGuard(): { index: number } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(REROLL_KEY) || 'null');
    if (!raw || typeof raw.index !== 'number' || Date.now() - raw.at > 30000) {
      localStorage.removeItem(REROLL_KEY);
      return null;
    }
    return { index: Math.max(0, raw.index) };
  } catch {
    return null;
  }
}

export function clearRerollGuard(): void {
  try {
    localStorage.removeItem(REROLL_KEY);
  } catch {
    // 忽略
  }
}
