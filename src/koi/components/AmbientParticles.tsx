import { memo, useEffect, useRef } from 'react';
import { isLiteMode } from '../liteMode';

interface Props {
  density?: number;
  tone?: 'warm' | 'cool';
  className?: string;
}

/**
 * 氛围粒子（尘埃 / 微光）。独立 canvas + rAF，不把状态写进父组件。
 * 尊重 prefers-reduced-motion；页面隐藏时停帧。
 */
export const AmbientParticles = memo(function AmbientParticles({
  density = 26,
  tone = 'warm',
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // 低端机直接不画：canvas 每帧重绘是纯耗电项
  const lite = useRef(isLiteMode()).current;

  useEffect(() => {
    if (lite) return;
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;
    let raf = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const color = tone === 'warm' ? '255, 226, 196' : '214, 236, 238';
    const parts = Array.from({ length: density }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.5,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.22 + 0.05),
      a: Math.random() * 0.32 + 0.08,
    }));

    const tick = () => {
      if (document.hidden) {
        raf = requestAnimationFrame(tick);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [density, tone, lite]);

  if (lite) return null;
  return <canvas ref={ref} className={`koi-particles ${className ?? ''}`} aria-hidden />;
});
