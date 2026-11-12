import { useState } from 'react';

interface Props {
  onArchive: () => void;
  onChapters: () => void;
  onRegenerate: () => void;
  onFullscreen: () => void;
  onSettings: () => void;
}

/** 顶部可收缩菜单：圆钮收在胶囊里，右侧圆钮开关（结构参考用户截图）。 */
export default function TopNav({ onArchive, onChapters, onRegenerate, onFullscreen, onSettings }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`koi-nav ${open ? 'is-open' : 'is-collapsed'}`} onClick={event => event.stopPropagation()}>
      <div className="koi-nav__pill" aria-hidden={!open}>
        <button type="button" className="koi-nav__btn" aria-label="角色档案" title="角色档案" onClick={onArchive}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
            <circle cx="17" cy="9" r="2.4" />
            <path d="M15.6 14.6c2.3.2 4.2 1.8 4.7 4.4" />
          </svg>
        </button>
        <button type="button" className="koi-nav__btn" aria-label="章节回看" title="章节回看" onClick={onChapters}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
        </button>
        <button type="button" className="koi-nav__btn" aria-label="重生成对话" title="重生成对话" onClick={onRegenerate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" />
            <path d="M20 4v4h-4" />
            <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" />
            <path d="M4 20v-4h4" />
          </svg>
        </button>
        <button type="button" className="koi-nav__btn" aria-label="全屏" title="全屏" onClick={onFullscreen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 9V4h5" />
            <path d="M15 4h5v5" />
            <path d="M20 15v5h-5" />
            <path d="M9 20H4v-5" />
          </svg>
        </button>
        <button type="button" className="koi-nav__btn" aria-label="设置" title="设置" onClick={onSettings}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="koi-nav__toggle"
        aria-label={open ? '收起菜单' : '展开菜单'}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
