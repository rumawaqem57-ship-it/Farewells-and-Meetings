import type { ChapterSave } from '../saves';

interface Props {
  saves: ChapterSave[];
  currentFloorId: number | null;
  onRestore: (save: ChapterSave) => void;
  onClear: () => void;
  onClose: () => void;
}

function formatTime(value: number): string {
  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** 章节回看：自动存档列表，点一条回到对应楼层与句子。 */
export default function ChapterPanel({ saves, currentFloorId, onRestore, onClear, onClose }: Props) {
  return (
    <div className="koi-chapters" onClick={onClose}>
      <section className="koi-chapters__panel" onClick={event => event.stopPropagation()}>
        <header className="koi-chapters__head">
          <div>
            <span className="koi-chapters__kicker">AUTO SAVE</span>
            <h2>章节回看</h2>
            <p>CHAPTERS</p>
          </div>
          <button type="button" className="koi-chapters__close" aria-label="关闭章节回看" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="koi-chapters__list">
          {saves.length === 0 ? (
            <p className="koi-chapters__empty">还没有自动存档。播一段剧情，这里会记录每一层。</p>
          ) : (
            saves.map(save => {
              const active = save.floorId != null && save.floorId === currentFloorId;
              return (
                <button
                  key={save.id}
                  type="button"
                  className={`koi-chapters__item ${active ? 'is-active' : ''}`}
                  onClick={() => onRestore(save)}
                >
                  <span className="koi-chapters__num">
                    {save.floorId != null ? `#${save.floorId}` : '—'}
                  </span>
                  <span className="koi-chapters__meta">
                    <b>{save.preview || '（无预览）'}</b>
                    <i>
                      {formatTime(save.at)} · 第 {save.index + 1} 句
                      {active ? ' · 当前' : ''}
                    </i>
                  </span>
                  <span className="koi-chapters__go">回到这里</span>
                </button>
              );
            })
          )}
        </div>

        <footer className="koi-chapters__foot">
          <button type="button" className="koi-chapters__clear" onClick={onClear}>
            清空记录
          </button>
          <button type="button" className="koi-chapters__done" onClick={onClose}>
            返回游戏
          </button>
        </footer>
      </section>
    </div>
  );
}
