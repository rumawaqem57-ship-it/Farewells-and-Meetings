import { useEffect } from 'react';
import type { DisplayMode } from './settings';

/**
 * 显示模式（借鉴老项目 + zujie24/租借男友）：
 * - auto：窄屏（≤768px）自动进手机布局，宽屏走桌面
 * - desktop：强制全屏铺满
 * - mobile：强制「手机框」—— 430×900 竖屏居中，弹层/导航全部收进框内
 *
 * 两个 data 属性分工不同，别合并：
 * - data-display-mode = 原始选择（决定要不要画手机框）
 * - data-mobile       = 实际是否紧凑布局（mobile 或 auto+窄屏）
 * 因为手机框只有 430px 宽，但视口还是 1280，@media (max-width) 不会触发，
 * 所以紧凑规则必须挂在 data-mobile 上。
 */
export function applyDisplayMode(mode: DisplayMode): void {
  const root = document.documentElement;
  if (root.dataset.displayMode !== mode) root.dataset.displayMode = mode;

  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const mobile = mode === 'mobile' || (mode === 'auto' && narrow);
  const value = mobile ? 'true' : 'false';
  if (root.dataset.mobile !== value) root.dataset.mobile = value;
}

/** 订阅 settings.display；auto 模式下跟随视口变化。 */
export function useDisplayMode(mode: DisplayMode): void {
  useEffect(() => {
    applyDisplayMode(mode);
    if (mode !== 'auto') return;

    const query = window.matchMedia('(max-width: 768px)');
    const onChange = () => applyDisplayMode('auto');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode]);
}
