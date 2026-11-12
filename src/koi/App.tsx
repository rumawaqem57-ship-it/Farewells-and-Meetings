import { useCallback, useEffect, useState } from 'react';
import { useIframeHeight } from './useIframeHeight';
import TitleScreen from './TitleScreen';
import Playback from './playback/Playback';
import { readSession, writeSession, readRerollGuard, clearRerollGuard } from './session';
import { loadSettings, saveSettings, type KoiSettings } from './settings';
import { useGameEngine } from './game/useGameEngine';
import type { ChapterSave } from './saves';
import PlayerNameModal from './components/PlayerNameModal';
import { readPlayerName, writePlayerName } from './playerName';
import { configureAudio, resumeAll, setAudioVolume, suspendAll, unlockAudio } from './audio';
import { useDisplayMode } from './display';
import { applyLiteMode } from './liteMode';

export default function App() {
  const [boot] = useState(() => {
    const guard = readRerollGuard();
    if (guard) {
      clearRerollGuard();
      return { v: 1 as const, page: 'play' as const, index: guard.index };
    }
    return readSession();
  });
  const [view, setView] = useState<'title' | 'play'>(() => (boot?.page === 'play' ? 'play' : 'title'));
  const [index, setIndex] = useState(() => Math.max(0, boot?.index ?? 0));
  const [settings, setSettings] = useState<KoiSettings>(() => loadSettings());
  const [playKey, setPlayKey] = useState(0);
  const [playerName, setPlayerName] = useState(() => readPlayerName());
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const engine = useGameEngine();
  useIframeHeight();
  useDisplayMode(settings.display);

  useEffect(() => {
    applyLiteMode();
    window.__koiBooted = true;
    document.documentElement.dataset.koiBooted = '1';
  }, []);

  // 音频：开关 + 音量。全部旁挂，失败静默。只有一次性音效，没有常驻背景层。
  useEffect(() => {
    configureAudio({
      enabled: settings.audioEnabled,
      typing: settings.typingSfx,
    });
  }, [settings.audioEnabled, settings.typingSfx]);

  useEffect(() => {
    setAudioVolume(settings.se);
  }, [settings.se]);

  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) suspendAll();
      else resumeAll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const updateSettings = useCallback((patch: Partial<KoiSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const exitToTitle = useCallback((nextIndex: number) => {
    clearRerollGuard();
    setIndex(nextIndex);
    writeSession({ v: 1, page: 'title', index: nextIndex });
    setView('title');
  }, []);

  const begin = useCallback((from: number) => {
    unlockAudio(); // 必须在这里：这是真实用户手势（开始/继续按钮）
    setIndex(from);
    writeSession({ v: 1, page: 'play', index: from });
    setView('play');
  }, []);

  const start = useCallback(
    (from: number) => {
      if (!playerName) {
        setPendingStart(from);
        return;
      }
      begin(from);
    },
    [begin, playerName],
  );

  const confirmName = useCallback(
    (name: string) => {
      writePlayerName(name);
      setPlayerName(name);
      const from = pendingStart ?? index;
      setPendingStart(null);
      begin(from);
    },
    [begin, index, pendingStart],
  );

  const backFromName = useCallback(() => {
    setPendingStart(null);
    if (view === 'play') exitToTitle(index);
  }, [exitToTitle, index, view]);

  const progress = useCallback((nextIndex: number) => {
    writeSession({ v: 1, page: 'play', index: nextIndex });
  }, []);

  const restoreAt = useCallback(
    async (floorId: number | null, nextIndex: number) => {
      if (floorId != null) await engine.gotoFloor(floorId);
      setIndex(nextIndex);
      writeSession({ v: 1, page: 'play', index: nextIndex });
      setPlayKey(value => value + 1);
      setView('play');
    },
    [engine],
  );

  const restoreChapter = useCallback(
    async (save: ChapterSave) => {
      await restoreAt(save.floorId, save.index);
    },
    [restoreAt],
  );

  if (pendingStart !== null || (view === 'play' && !playerName)) {
    return <PlayerNameModal onConfirm={confirmName} onBack={backFromName} />;
  }

  if (view === 'play') {
    return (
      <Playback
        key={playKey}
        initialIndex={index}
        engine={engine}
        settings={settings}
        playerName={playerName}
        onSettingsChange={updateSettings}
        onExit={exitToTitle}
        onProgress={progress}
        onRestoreChapter={restoreChapter}
        onRestoreAt={restoreAt}
      />
    );
  }

  return (
    <TitleScreen
      hasProgress={index > 0}
      progressLabel={index + 1}
      onStartNew={() => start(0)}
      onContinue={() => start(index)}
      settings={settings}
      onSettingsChange={updateSettings}
    />
  );
}
