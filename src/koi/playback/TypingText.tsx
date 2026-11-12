import { memo, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { playSfx } from '../audio';

interface Props {
  text: string;
  /** 每秒字数；0 = 瞬间显示 */
  cps: number;
  /** 父级置 true 时立刻补全（点击跳过） */
  skipRef: MutableRefObject<boolean>;
  /** 打字状态上抛：父组件据此决定点击是"跳过"还是"下一句" */
  onTypingChange: (typing: boolean) => void;
}

/**
 * 打字机子组件（S3 铁律：打字进度绝不放主画面组件）。
 *
 * V3.4（2026-10-27）：改成**直接写 DOM 文本**，不再每吐几个字就 setState。
 * 原来每 2~3 字触发一次 React 重渲染，手机上光 reconcile 就吃掉不少帧；
 * 现在打字全程 0 次渲染，只在「开始/结束」各变一次 state。
 */
export const TypingText = memo(function TypingText({ text, cps, skipRef, onTypingChange }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const paint = (count: number) => {
      node.textContent = text.slice(0, count);
    };

    paint(0);

    if (cps <= 0) {
      paint(text.length);
      setDone(true);
      onTypingChange(false);
      return;
    }

    setDone(false);
    onTypingChange(true);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let index = 0;
    let cancelled = false;
    // 打字音节流：普通语速每 2 字一声，快速档每 4 字一声，避免机关枪
    let tickChars = 0;
    const stride = cps >= 60 ? 4 : 2;

    const finish = () => {
      paint(text.length);
      setDone(true);
      onTypingChange(false);
    };

    const tick = (now: number) => {
      if (cancelled) return;
      if (skipRef.current) {
        finish();
        return;
      }
      acc += ((now - last) / 1000) * cps;
      last = now;
      const step = Math.floor(acc);
      if (step > 0) {
        acc -= step;
        index = Math.min(text.length, index + step);
        paint(index);
        tickChars += step;
        if (tickChars >= stride) {
          tickChars = 0;
          if (Math.random() > 0.15) playSfx('type');
        }
      }
      if (index < text.length) {
        raf = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [text, cps, skipRef, onTypingChange]);

  return (
    <>
      <span ref={ref} />
      {!done && (
        <span className="koi-typing-caret" aria-hidden>
          ▍
        </span>
      )}
    </>
  );
});
