interface Props {
  options: string[];
  onPick: (text: string) => void;
}

/**
 * 选项栏（2026-10-23）：吃预设 `<options>` 块。
 * 独立浮层，浮在对话框上方，不推挤对话框（否则会把名字顶进立绘区）。
 */
export default function ChoiceBar({ options, onPick }: Props) {
  if (options.length === 0) return null;

  return (
    <div className="koi-choices">
      <span className="koi-choices__hint">你的回应</span>
      {options.map((text, i) => (
        <button
          key={`${i}-${text.slice(0, 8)}`}
          type="button"
          className="koi-choice"
          style={{ animationDelay: `${i * 45}ms` }}
          onClick={event => {
            event.stopPropagation();
            onPick(text);
          }}
        >
          <span className="koi-choice__no">{String(i + 1).padStart(2, '0')}</span>
          <span className="koi-choice__text">{text}</span>
        </button>
      ))}
    </div>
  );
}
