import { useRef, useState } from 'react';
import { readPlayerName } from '../playerName';

interface Props {
  onConfirm: (name: string) => void;
  onBack: () => void;
}

/** 开局名字弹窗：必须填写酒馆里的玩家名，场景匹配/变量才对得上。 */
export default function PlayerNameModal({ onConfirm, onBack }: Props) {
  const [value, setValue] = useState(() => readPlayerName());
  const [attempted, setAttempted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const name = value.trim();
  const valid = name.length > 0 && name.length <= 24;
  const invalid = attempted && !valid;

  // 提交时才校验：空名字点「确认」给出提示并把焦点送回输入框，而不是把按钮灰住不解释。
  const submit = () => {
    if (!valid) {
      setAttempted(true);
      inputRef.current?.focus();
      return;
    }
    onConfirm(name);
  };

  return (
    <div className="koi-name" onClick={event => event.stopPropagation()}>
      <section className="koi-name__panel">
        <div className="koi-name__icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
          </svg>
        </div>

        <h2>设置你的名字</h2>
        <p className="koi-name__desc">
          剧情里会用这个名字称呼你，场景与变量也按它对齐。
          请填你在酒馆里使用的同一个名字。
        </p>

        <input
          ref={inputRef}
          className="koi-name__input"
          value={value}
          maxLength={24}
          autoFocus
          placeholder="输入你在酒馆里使用的名字…"
          aria-invalid={invalid || undefined}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') submit();
          }}
        />
        {invalid && <span className="koi-name__hint">请先填一个名字</span>}

        <footer className="koi-name__foot">
          <button type="button" className="koi-name__back" onClick={onBack}>
            返回标题
          </button>
          <button type="button" className="koi-name__go" onClick={submit}>
            确认并启程
          </button>
        </footer>
      </section>
    </div>
  );
}
