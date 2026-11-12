import { useEffect, useState } from 'react';
import { CG_ITEMS, type CgItem } from '../cgAssets';

interface Props {
  onClose: () => void;
}

/**
 * CG 回忆：角色 CG 收藏册。
 * 数据来自 `cgAssets.ts` 的 CG_ITEMS —— 背景图不再冒充 CG，
 * 等角色 CG 导入后往清单里加条目即可。
 */
export default function GalleryPanel({ onClose }: Props) {
  const [preview, setPreview] = useState<CgItem | null>(null);
  const entries = CG_ITEMS;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (preview) setPreview(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, onClose]);

  return (
    <div className="koi-gallery" onClick={onClose}>
      <section className="koi-gallery__card" onClick={event => event.stopPropagation()}>
        <header className="koi-gallery__head">
          <div>
            <span className="koi-gallery__kicker">GALLERY</span>
            <h2>CG 回忆</h2>
            <p>{entries.length > 0 ? `共 ${entries.length} 张 · 点开放大` : '尚未导入角色 CG'}</p>
          </div>
          <button type="button" className="koi-gallery__close" aria-label="关闭 CG 回忆" onClick={onClose}>
            ×
          </button>
        </header>

        {entries.length === 0 ? (
          <div className="koi-gallery__empty">
            <span className="koi-gallery__empty-mark" aria-hidden>
              ◇
            </span>
            <b>这里还空着</b>
            <p>导入角色 CG 后，它们会一张张出现在这里。</p>
          </div>
        ) : (
          <div className="koi-gallery__grid">
            {entries.map(entry => (
              <button
                key={entry.id}
                type="button"
                className="koi-gallery__cell"
                onClick={() => setPreview(entry)}
              >
                <img className="koi-gallery__thumb" src={entry.url} alt={entry.title} loading="lazy" />
                <span className="koi-gallery__meta">
                  <b>{entry.title}</b>
                  {entry.caption ? <i>{entry.caption}</i> : null}
                </span>
              </button>
            ))}
          </div>
        )}

        <footer className="koi-gallery__foot">
          <span className="koi-gallery__hint">{entries.length > 0 ? '点击缩略图查看大图' : '待导入'}</span>
          <button type="button" className="koi-gallery__done" onClick={onClose}>
            返回
          </button>
        </footer>
      </section>

      {preview && (
        <div className="koi-gallery__lightbox" onClick={() => setPreview(null)}>
          <img src={preview.url} alt={preview.title} />
          <span className="koi-gallery__caption">
            {preview.title}
            {preview.caption ? ` · ${preview.caption}` : ''} · 点击任意处返回
          </span>
        </div>
      )}
    </div>
  );
}
