/**
 * 精简渲染模式（lite）。
 *
 * 触发条件（任一）：
 * - 系统开了「减少动态效果」
 * - CPU 核心 ≤ 4（中低端手机 / 老平板）
 * - 设备内存 ≤ 4GB
 *
 * 打开后由 CSS 统一降级：关掉 backdrop-filter（手机 GPU 最贵的一项）、
 * 隐藏粒子与颗粒层、减弱大范围阴影。逻辑照旧，只减画面成本。
 */
export function detectLiteMode(): boolean {
  if (typeof window === 'undefined') return false;
  // 手动开关（localStorage 或 URL ?lite=1），给自动检测失灵的老机器兜底
  try {
    if (localStorage.getItem('koi-force-lite') === '1') return true;
    if (localStorage.getItem('koi-force-lite') === '0') return false;
  } catch {}
  if (new URLSearchParams(location.search).get('lite') === '1') return true;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return reduced || cores <= 4 || memory <= 4;
}

/** 首帧就要定下来，避免粒子先跑起来再被关掉。 */
export function applyLiteMode(): boolean {
  const lite = detectLiteMode();
  document.documentElement.dataset.lite = lite ? 'true' : 'false';
  return lite;
}

export function isLiteMode(): boolean {
  return document.documentElement.dataset.lite === 'true';
}
