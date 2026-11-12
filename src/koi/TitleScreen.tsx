import { useCallback, useEffect, useState } from 'react';
import { AmbientParticles } from './components/AmbientParticles';
import SettingsPanel from './components/SettingsPanel';
import GalleryPanel from './components/GalleryPanel';
import { TITLE_BG } from './titleAssets';
import type { KoiSettings } from './settings';

interface Props {
  hasProgress: boolean;
  progressLabel: number;
  onStartNew: () => void;
  onContinue: () => void;
  settings: KoiSettings;
  onSettingsChange: (patch: Partial<KoiSettings>) => void;
}

interface MenuItem {
  cn: string;
  en: string;
  action: () => void;
  disabled?: boolean;
  note?: string;
}

/**
 * 标题页（V3.2 重做）：照参考图的 galgame 版式 ——
 * 左侧竖排「中文大标题 + 英文衬线斜体小字」，无卡片无底板，直接压在整屏插画上；
 * 右下角是作品名艺术字，左下角是制作信息。
 */
export default function TitleScreen({
  hasProgress,
  progressLabel,
  onStartNew,
  onContinue,
  settings,
  onSettingsChange,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!settingsOpen && !galleryOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settingsOpen) setSettingsOpen(false);
      else setGalleryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, galleryOpen]);

  const items: MenuItem[] = [
    { cn: '开始游戏', en: 'New Game', action: onStartNew },
    {
      cn: '继续游戏',
      en: 'Continue',
      action: onContinue,
      disabled: !hasProgress,
      note: hasProgress ? `第 ${progressLabel} 句` : undefined,
    },
    { cn: '环境设定', en: 'Config', action: () => setSettingsOpen(true) },
    { cn: 'CG 回忆', en: 'Gallery', action: () => setGalleryOpen(true) },
    {
      cn: '结束游戏',
      en: 'End Game',
      action: () => showToast('在酒馆中请直接关闭本页面或标签页'),
    },
  ];

  return (
    <main className="koi-title">
      <div className="koi-title__bg" style={{ backgroundImage: `url(${TITLE_BG})` }} />
      <div className="koi-title__veil" />
      <div className="koi-title__grain" aria-hidden />
      <AmbientParticles density={26} tone="warm" />

      <header className="koi-topbar koi-topbar--slim">
        <span className="koi-topbar__brand">
          KOI<span className="koi-topbar__slash">/</span>恋喰者
        </span>
        <span className="koi-topbar__stage">{hasProgress ? `进度 · 第 ${progressLabel} 句` : ''}</span>
      </header>

      <nav className="koi-title__menu" aria-label="主菜单">
        {items.map(item => (
          <button
            key={item.en}
            type="button"
            className={`koi-menu__item ${item.disabled ? 'is-disabled' : ''}`}
            disabled={item.disabled}
            onClick={item.action}
          >
            <span className="koi-menu__cn">{item.cn}</span>
            <span className="koi-menu__en">
              {item.en}
              {item.note ? <i className="koi-menu__note">{item.note}</i> : null}
            </span>
          </button>
        ))}
      </nav>

      <div className="koi-title__brand">
        <span className="koi-title__brand-seal" aria-hidden>
          喰
        </span>
        <span className="koi-title__brand-text">
          <b>KOI / 恋喰者</b>
          <i>日常恋爱轻推理 · v0.3.0</i>
        </span>
      </div>

      <div className="koi-title__wordmark">
        <h1 className="koi-title__logo">恋喰者</h1>
        <span className="koi-title__romaji">A Modern Romance Mystery</span>
      </div>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          onClose={() => setSettingsOpen(false)}
          onHome={() => setSettingsOpen(false)}
        />
      )}

      {galleryOpen && <GalleryPanel onClose={() => setGalleryOpen(false)} />}

      {toast && <div className="koi-toast">{toast}</div>}
    </main>
  );
}
