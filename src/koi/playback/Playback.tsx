import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScriptLine } from '../script/types';
import { CHARACTERS } from './characters';
import CharacterStage, { type CastMember } from './CharacterStage';
import DialogueBox from './DialogueBox';
import ChoiceBar from './ChoiceBar';
import SceneBackground from './SceneBackground';
import { AmbientParticles } from '../components/AmbientParticles';
import TopNav from '../components/TopNav';
import SettingsPanel from '../components/SettingsPanel';
import CharacterArchive from '../components/CharacterArchive';
import ChapterPanel from '../components/ChapterPanel';
import SavePanel from '../components/SavePanel';
import { readChapterSaves, writeChapterSave, clearChapterSaves, type ChapterSave } from '../saves';
import type { GameEngine } from '../game/useGameEngine';
import { extractOptions } from '../script/parser';
import { writeRerollGuard, clearRerollGuard } from '../session';
import { AUTO_DELAY, SPEED_CPS, SPEED_LABEL, type KoiSettings, type TextSpeed } from '../settings';
import { playSfx, setGenerating, unlockAudio } from '../audio';
import { imagesFor, themeFor } from './locations';

const SPEED_ORDER: TextSpeed[] = ['instant', 'slow', 'normal', 'fast'];

interface Props {
  initialIndex: number;
  engine: GameEngine;
  settings: KoiSettings;
  playerName: string;
  onSettingsChange: (patch: Partial<KoiSettings>) => void;
  onExit: (index: number) => void;
  onProgress: (index: number) => void;
  onRestoreChapter: (save: ChapterSave) => void;
  /** 存读档：跳到指定楼层 + 行号 */
  onRestoreAt: (floorId: number | null, index: number) => void;
}

function computeCast(lines: ScriptLine[], index: number): CastMember[] {
  const current = lines[index];
  if (!current) return [];

  let start = index;
  while (start > 0 && lines[start - 1].location?.path === current.location?.path) {
    start -= 1;
  }

  const seen = new Map<string, { name: string; emotion: string }>();
  for (let i = start; i <= index; i += 1) {
    const line = lines[i];
    if (!line?.speaker || line.speaker === '<user>' || !CHARACTERS[line.speaker]) continue;
    seen.set(line.speaker, { name: line.speaker, emotion: line.emotion ?? '平静' });
  }

  const entries = [...seen.values()].slice(-3);
  const activeName =
    current.type !== 'narrator' && current.speaker && current.speaker !== '<user>' ? current.speaker : null;

  return entries.map((entry, i) => ({
    meta: CHARACTERS[entry.name],
    emotion: entry.emotion,
    active: entry.name === activeName,
    pos:
      entries.length === 1
        ? 'center'
        : i === 0
          ? 'left'
          : i === entries.length - 1
            ? 'right'
            : 'center',
  }));
}

export default function Playback({
  initialIndex,
  engine,
  settings,
  playerName,
  onSettingsChange,
  onExit,
  onProgress,
  onRestoreChapter,
  onRestoreAt,
}: Props) {
  const lines = engine.lines;
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, lines.length - 1)));
  const [typing, setTyping] = useState(false);
  const [boxHidden, setBoxHidden] = useState(false);
  const [auto, setAuto] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [chapterSaves, setChapterSaves] = useState<ChapterSave[]>([]);
  const [inputOpen, setInputOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const typingRef = useRef(false);
  const skipRef = useRef(false);
  const toastTimer = useRef(0);
  const firstStoryKey = useRef(engine.storyKey);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const current = lines[index];
  const last = lines.length - 1;
  const cps = SPEED_CPS[settings.speed];
  const overlayOpen =
    historyOpen || settingsOpen || archiveOpen || inputOpen || chaptersOpen || saveOpen;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    if (!engine.error) return;
    clearRerollGuard();
    showToast(engine.error);
  }, [engine.error, showToast]);

  // 楼层内容变了（新楼/重生成）→ 从第 0 行重新播
  useEffect(() => {
    if (firstStoryKey.current === engine.storyKey) return;
    firstStoryKey.current = engine.storyKey;
    skipRef.current = false;
    setIndex(0);
  }, [engine.storyKey]);

  const onTypingChange = useCallback((value: boolean) => {
    typingRef.current = value;
    setTyping(value);
  }, []);

  const advance = useCallback(() => {
    skipRef.current = false;
    if (index < last) playSfx('advance');
    setIndex(i => Math.min(last, i + 1));
  }, [index, last]);

  const back = useCallback(() => {
    skipRef.current = false;
    if (index > 0) playSfx('back');
    setIndex(i => Math.max(0, i - 1));
  }, [index]);

  const handleClick = useCallback(() => {
    unlockAudio(); // 从未走标题页（会话直接恢复）时靠首次点击解锁，已解锁则立即返回
    if (engine.isGenerating || overlayOpen) return;
    if (typingRef.current) {
      skipRef.current = true;
      return;
    }
    advance();
  }, [advance, engine.isGenerating, overlayOpen]);

  useEffect(() => {
    if (!auto || typing || boxHidden || overlayOpen || engine.isGenerating) return;
    if (index >= last) {
      setAuto(false);
      return;
    }
    const timer = window.setTimeout(() => {
      skipRef.current = false;
      setIndex(i => Math.min(last, i + 1));
    }, AUTO_DELAY[settings.autoWait]);
    return () => window.clearTimeout(timer);
  }, [auto, typing, index, last, boxHidden, overlayOpen, engine.isGenerating, settings.autoWait]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false);
        else if (archiveOpen) setArchiveOpen(false);
        else if (chaptersOpen) setChaptersOpen(false);
        else if (saveOpen) setSaveOpen(false);
        else if (historyOpen) setHistoryOpen(false);
        else if (inputOpen) setInputOpen(false);
        else onExit(index);
        return;
      }
      if (overlayOpen) return;
      if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        handleClick();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClick, back, onExit, historyOpen, index, settingsOpen, archiveOpen, chaptersOpen, inputOpen, saveOpen, overlayOpen]);

  useEffect(() => {
    if (inputOpen) textareaRef.current?.focus();
  }, [inputOpen]);

  const cast = useMemo(() => computeCast(lines, index), [lines, index]);

  // 提前一句把下一个场景的昼夜图拉进缓存，跨场景切换时不会白闪
  useEffect(() => {
    const nextLocation = lines[index + 1]?.location;
    if (!nextLocation) return;
    const next = imagesFor(nextLocation, playerName);
    for (const url of [next.day, next.night]) {
      if (!url) continue;
      const img = new Image();
      img.src = url;
    }
  }, [index, lines, playerName]);

  // 预设 <options> 块 → 选项栏：本层播到最后一句、且没被弹层挡住时才出现
  const options = useMemo(() => extractOptions(engine.raw ?? ''), [engine.raw]);
  const showChoices =
    options.length > 0 && index >= last && !typing && !engine.isGenerating && !overlayOpen && !boxHidden;

  const pickOption = useCallback(
    (text: string) => {
      if (engine.isGenerating) return;
      if (!engine.available) {
        showToast('未连接酒馆：当前为本地演示');
        return;
      }
      playSfx('click');
      void engine.send(text);
    },
    [engine, showToast],
  );

  // 音频：只剩一次性交互音效（背景音乐与地点环境音已下线），不再随场景切层。
  useEffect(() => {
    setGenerating(engine.isGenerating);
    return () => setGenerating(false);
  }, [engine.isGenerating]);

  useEffect(() => {
    onProgress(index);
  }, [index, onProgress]);

  // 自动存档：同一楼层只保留最新一行，最多 30 层。
  useEffect(() => {
    if (!engine.raw || !current) return;
    const timer = window.setTimeout(() => {
      writeChapterSave({
        floorId: engine.floorId,
        index,
        preview: lines[0]?.text ?? current.text,
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [engine.floorId, engine.storyKey, engine.raw, index, current?.text, lines]);

  const openChapters = useCallback(() => {
    setChapterSaves(readChapterSaves());
    setChaptersOpen(true);
  }, []);

  const cycleSpeed = () => {
    const next = SPEED_ORDER[(SPEED_ORDER.indexOf(settings.speed) + 1) % SPEED_ORDER.length];
    onSettingsChange({ speed: next });
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
      else void document.exitFullscreen?.();
    } catch {
      showToast('当前环境不支持全屏');
    }
  };

  const submit = () => {
    const content = draft.trim();
    if (!content) return;
    if (!engine.available) {
      showToast('未连接酒馆：当前为本地演示');
      return;
    }
    void engine.send(content);
    setDraft('');
    setInputOpen(false);
  };

  if (!current) {
    return (
      <main className="koi-play">
        <div className="koi-loading">等待楼层内容…</div>
      </main>
    );
  }

  return (
    <main className="koi-play" onClick={handleClick} role="presentation">
      <SceneBackground location={current.location} playerName={playerName} />
      <div className="koi-play__shade" aria-hidden />
      {settings.particles && <AmbientParticles density={20} tone="warm" />}

      <TopNav
        onArchive={() => setArchiveOpen(true)}
        onChapters={openChapters}
        onRegenerate={() => {
          if (!engine.available) {
            showToast('未连接酒馆：当前为本地演示');
            return;
          }
          if (engine.viewingFloorId != null) {
            showToast('只能重生成最新楼层');
            return;
          }
          if (engine.isGenerating) return;
          writeRerollGuard(index);
          showToast('正在重生成…');
          void engine.reroll();
        }}
        onFullscreen={toggleFullscreen}
        onSettings={() => setSettingsOpen(true)}
      />

      <CharacterStage cast={cast} />

      {showChoices && <ChoiceBar options={options} onPick={pickOption} />}

      {engine.isGenerating && <div className="koi-generating">生成中…</div>}

      <div className={`koi-bottom ${boxHidden ? 'is-hidden' : ''}`}>
        <DialogueBox
          line={current}
          index={index}
          total={lines.length}
          cps={cps}
          skipRef={skipRef}
          onTypingChange={onTypingChange}
        />

        <button
          type="button"
          className="koi-bottom__hide"
          aria-label="隐藏对话框"
          onClick={event => {
            event.stopPropagation();
            setBoxHidden(true);
          }}
        >
          ˅
        </button>

        <div className="koi-bottom__bar" onClick={event => event.stopPropagation()}>
          <div className="koi-bottom__group">
            <button
              type="button"
              className="is-icon"
              title="输入"
              onClick={() => {
                if (!engine.available) {
                  showToast('未连接酒馆：当前为本地演示');
                  return;
                }
                setInputOpen(true);
              }}
            >
              ✎
            </button>
            <button
              type="button"
              title="存读档（9 个存档位）"
              onClick={() => setSaveOpen(true)}
            >
              存档
            </button>
            <button type="button" onClick={() => setHistoryOpen(true)}>
              历史
            </button>
            <button type="button" onClick={back} disabled={index === 0}>
              上一句
            </button>
            <button
              type="button"
              className={auto ? 'is-active' : ''}
              onClick={() => setAuto(value => !value)}
            >
              AUTO
            </button>
            <button type="button" onClick={cycleSpeed} title="切换打字速度">
              语速：{SPEED_LABEL[settings.speed]}
            </button>
          </div>

          <div className="koi-bottom__group">
            {engine.viewingFloorId != null && (
              <button type="button" className="is-live" onClick={engine.followLatest}>
                回到最新
              </button>
            )}
            <button
              type="button"
              title="上一楼层"
              onClick={engine.prevFloor}
              disabled={!engine.available || engine.floors.length === 0}
            >
              上层
            </button>
            <button
              type="button"
              title="下一楼层"
              onClick={engine.nextFloor}
              disabled={!engine.available || engine.floors.length === 0}
            >
              下层
            </button>
          </div>
        </div>
      </div>

      {boxHidden && (
        <button
          type="button"
          className="koi-play__show"
          aria-label="显示对话框"
          onClick={event => {
            event.stopPropagation();
            setBoxHidden(false);
          }}
        >
          ˄
        </button>
      )}

      {historyOpen && (
        <div className="koi-history" onClick={event => event.stopPropagation()}>
          <div className="koi-history__panel">
            <header className="koi-history__head">
              <span>对话历史</span>
              <button type="button" onClick={() => setHistoryOpen(false)}>
                关闭
              </button>
            </header>
            <div className="koi-history__list">
              {lines.slice(0, index + 1).map((line, i) => (
                <button
                  key={`${i}-${line.text.slice(0, 8)}`}
                  type="button"
                  className={`koi-history__item is-${line.type} ${i === index ? 'is-current' : ''}`}
                  title="跳回这一句"
                  onClick={() => {
                    skipRef.current = false;
                    setIndex(i);
                    setHistoryOpen(false);
                  }}
                >
                  <span className="koi-history__who">
                    {line.speaker === '<user>' ? '你' : line.speaker ?? '旁白'}
                  </span>
                  <span className="koi-history__text">{line.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {inputOpen && (
        <div className="koi-input" onClick={event => event.stopPropagation()}>
          <div className="koi-input__panel">
            <textarea
              ref={textareaRef}
              className="koi-input__area"
              value={draft}
              placeholder="输入你想说的话…（Enter 发送，Shift+Enter 换行）"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <div className="koi-input__bar">
              <span>{engine.isGenerating ? '生成中，请稍候…' : '发送后锁定画面，等待新楼层'}</span>
              <div className="koi-input__actions">
                <button type="button" onClick={() => setInputOpen(false)}>
                  取消
                </button>
                <button
                  type="button"
                  className="is-primary"
                  onClick={submit}
                  disabled={!draft.trim() || engine.isGenerating}
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          onClose={() => setSettingsOpen(false)}
          onHome={() => {
            setSettingsOpen(false);
            onExit(index);
          }}
        />
      )}

      {archiveOpen && <CharacterArchive onClose={() => setArchiveOpen(false)} />}

      {chaptersOpen && (
        <ChapterPanel
          saves={chapterSaves}
          currentFloorId={engine.floorId}
          onRestore={save => {
            setChaptersOpen(false);
            onRestoreChapter(save);
          }}
          onClear={() => {
            clearChapterSaves();
            setChapterSaves([]);
          }}
          onClose={() => setChaptersOpen(false)}
        />
      )}

      {saveOpen && (
        <SavePanel
          current={{
            floorId: engine.floorId,
            index,
            preview: current.text,
            speaker: current.speaker === '<user>' ? playerName : current.speaker,
            location: themeFor(current.location, playerName).label,
            phase: current.location?.phase,
          }}
          onLoad={slot => {
            setSaveOpen(false);
            onRestoreAt(slot.floorId, slot.index);
          }}
          onClose={() => setSaveOpen(false)}
          onToast={showToast}
        />
      )}

      {toast && <div className="koi-toast">{toast}</div>}
    </main>
  );
}
