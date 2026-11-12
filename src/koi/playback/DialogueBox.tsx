import type { MutableRefObject } from 'react';
import type { ScriptLine } from '../script/types';
import { TypingText } from './TypingText';

interface Props {
  line: ScriptLine;
  index: number;
  total: number;
  cps: number;
  skipRef: MutableRefObject<boolean>;
  onTypingChange: (typing: boolean) => void;
}

/**
 * 对话框 V3（2026-10-23）：移植老项目的「浮字式」版式。
 * 无底板、无边框、无玻璃 —— 名字居中成簇 + 下方发光横线，正文白字三重投影直接压在画面上。
 */
export default function DialogueBox({ line, index, total, cps, skipRef, onTypingChange }: Props) {
  const isNarrator = line.type === 'narrator';
  const isUser = line.speaker === '<user>';
  const displayName = isUser ? '你' : line.speaker;
  const tag = isUser ? '你的话' : line.type === 'thought' ? '心声' : line.emotion;

  return (
    <section className={`koi-dialog ${isNarrator ? 'is-narrator' : ''} ${isUser ? 'is-user' : ''}`}>
      {!isNarrator && displayName && (
        <div className="koi-dialog__speaker">
          <div className="koi-dialog__name-row">
            <span className="koi-dialog__name">{displayName}</span>
            {tag && <span className="koi-dialog__emotion">{tag}</span>}
          </div>
          <span className="koi-dialog__underline" aria-hidden />
        </div>
      )}

      <p className={`koi-dialog__text ${line.type === 'thought' ? 'is-thought' : ''}`}>
        <TypingText key={index} text={line.text} cps={cps} skipRef={skipRef} onTypingChange={onTypingChange} />
      </p>

      <div className="koi-dialog__foot">
        <span className="koi-dialog__next" aria-hidden>
          ⌄
        </span>
      </div>
    </section>
  );
}
