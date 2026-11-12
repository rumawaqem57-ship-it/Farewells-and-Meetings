import { useEffect } from 'react';

/**
 * iframe 高度守卫（S6 的前置子集）。
 *
 * 酒馆助手把楼层提升成 iframe 后，iframe 默认高度往往只有两百多像素；
 * 我们的页面是"全屏居中"布局，视口一矮就裁掉标题。这里在 iframe 内
 * 直接把宿主 iframe 撑高（同源可访问 window.frameElement；跨域则静默放弃）。
 *
 * 目标高度：桌面 min(820, 父视口 - 120)，移动 min(700, 父视口 - 40)，下限 400。
 */
export function useIframeHeight() {
  useEffect(() => {
    let frame: HTMLIFrameElement | null = null;
    try {
      frame = window.frameElement as HTMLIFrameElement | null;
    } catch {
      return; // 跨域：本地预览或非酒馆环境
    }
    if (!frame) return;

    const apply = () => {
      try {
        const parentHeight = window.parent?.innerHeight || 800;
        const isMobile = parentHeight < 640;
        const target = Math.max(
          400,
          Math.min(isMobile ? 700 : 820, parentHeight - (isMobile ? 40 : 120)),
        );
        const current = Number.parseFloat(frame!.style.height || '0');
        if (Math.abs(current - target) > 1) {
          frame!.style.height = `${target}px`;
          frame!.style.width = '100%';
          frame!.style.display = 'block';
        }
        document.documentElement.dataset.koiFrameHeight = String(target);
      } catch {
        // 宿主不允许：放弃，交给紧凑排版兜底
      }
    };

    apply();
    const timer = window.setTimeout(apply, 300);
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.clearTimeout(timer);
    };
  }, []);
}
