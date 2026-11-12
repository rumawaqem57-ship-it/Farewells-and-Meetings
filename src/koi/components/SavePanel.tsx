import { useEffect, useRef, useState } from 'react';
import {
  SLOT_COUNT,
  exportSaveFile,
  firstEmptySlot,
  importSaveFile,
  readSaveSlots,
  removeSaveSlot,
  writeSaveSlot,
  type SaveSlotData,
} from '../saves';

interface Props {
  /** 当前播放位置，用来写槽 */
  current: {
    floorId: number | null;
    index: number;
    preview: string;
    speaker?: string;
    location?: string;
    phase?: string;
  };
  onLoad: (slot: SaveSlotData) => void;
  onClose: () => void;
  onToast: (message: string) => void;
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

/** 手动存读档：9 个槽位 + 导入导出。自动章节回看不在这里。 */
export default function SavePanel({ current, onLoad, onClose, onToast }: Props) {
  const [slots, setSlots] = useState<Array<SaveSlotData | null>>(() => readSaveSlots());
  const [pending, setPending] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSlots(readSaveSlots());
  }, []);

  const save = (slot: number) => {
    const next = writeSaveSlot(slot, {
      floorId: current.floorId,
      index: current.index,
      preview: current.preview,
      speaker: current.speaker,
      location: current.location,
      phase: current.phase,
    });
    setSlots(next);
    setPending(null);
    onToast(`已保存到存档位 ${String(slot).padStart(2, '0')}`);
  };

  const remove = (slot: number) => {
    setSlots(removeSaveSlot(slot));
    setPending(null);
    onToast(`已删除存档位 ${String(slot).padStart(2, '0')}`);
  };

  const quickSave = () => {
    const slot = firstEmptySlot();
    save(slot);
  };

  const doExport = () => {
    try {
      const data = exportSaveFile();
      const filled = data.slots.filter(Boolean).length;
      if (filled === 0) {
        onToast('还没有可导出的存档');
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `koi-saves-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      onToast(`已导出 ${filled} 个存档位`);
    } catch {
      onToast('导出失败：当前环境不允许下载');
    }
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importSaveFile(String(reader.result ?? ''));
      if (!result.ok) {
        onToast(`导入失败：${result.message}`);
        return;
      }
      setSlots(readSaveSlots());
      onToast(`已导入 ${result.count} 个存档位`);
    };
    reader.onerror = () => onToast('读取文件失败');
    reader.readAsText(file);
  };

  return (
    <div className="koi-savepanel" onClick={onClose}>
      <section className="koi-savepanel__card" onClick={event => event.stopPropagation()}>
        <header className="koi-savepanel__head">
          <div>
            <span className="koi-savepanel__kicker">SAVE DATA</span>
            <h2>存读档</h2>
            <p>
              {current.floorId != null ? `第 ${current.floorId} 层` : '本地演示'} · 第 {current.index + 1} 句 ·{' '}
              {current.location || '未知地点'}
            </p>
          </div>
          <button type="button" className="koi-savepanel__close" aria-label="关闭存读档" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="koi-savepanel__grid">
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            const slot = i + 1;
            const data = slots[i];
            const isCurrent = !!data && data.floorId === current.floorId && data.index === current.index;

            return (
              <div
                key={slot}
                role="button"
                tabIndex={0}
                className={`koi-slot ${data ? 'is-filled' : 'is-empty'} ${isCurrent ? 'is-current' : ''}`}
                onClick={() => (data ? onLoad(data) : save(slot))}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (data) onLoad(data);
                    else save(slot);
                  }
                }}
              >
                <span className="koi-slot__no">{String(slot).padStart(2, '0')}</span>

                {data ? (
                  <>
                    <div className="koi-slot__meta">
                      <b>{data.location || '未知地点'}</b>
                      <i>{formatTime(data.at)}</i>
                    </div>
                    <p className="koi-slot__preview">{data.preview || '（无预览）'}</p>
                    <div className="koi-slot__foot">
                      <span>
                        {data.floorId != null ? `第 ${data.floorId} 层` : '本地'} · 第 {data.index + 1} 句
                      </span>
                      <span className="koi-slot__acts">
                        <button
                          type="button"
                          title="用当前进度覆盖"
                          onClick={event => {
                            event.stopPropagation();
                            save(slot);
                          }}
                        >
                          覆
                        </button>
                        <button
                          type="button"
                          title={pending === slot ? '再点一次确认删除' : '删除这个存档位'}
                          className={pending === slot ? 'is-danger' : ''}
                          onClick={event => {
                            event.stopPropagation();
                            if (pending === slot) remove(slot);
                            else {
                              setPending(slot);
                              onToast('再点一次 ✕ 确认删除');
                            }
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="koi-slot__hint">空档位 · 点此保存</span>
                )}
              </div>
            );
          })}
        </div>

        <footer className="koi-savepanel__foot">
          <div className="koi-savepanel__tools">
            <button type="button" onClick={quickSave}>
              存到空位
            </button>
            <button type="button" onClick={doExport}>
              导出
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}>
              导入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) doImport(file);
                event.target.value = '';
              }}
            />
          </div>
          <button type="button" className="koi-savepanel__done" onClick={onClose}>
            返回游戏
          </button>
        </footer>
      </section>
    </div>
  );
}
