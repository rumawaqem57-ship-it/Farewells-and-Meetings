/**
 * 音频统一出口。
 * 外部只 import 这个文件；内部实现（context/sfx）不对外暴露。
 *
 * 2026-11-03：背景音乐（drone）与地点环境音（ambience）整体下线，
 * 只保留一次性交互音效。对外 API 相应收窄，避免留下"能调但其实无声"的假开关。
 */
import {
  getBus,
  getOptions,
  isBuilt,
  setAudioOptions,
  setLevel,
  suspendAll,
  resumeAll,
  debugState,
  unlockAudio as unlockContext,
  type AudioOptions,
} from './context';
import { playSfx, setGenerating, type SfxName } from './sfx';

export type { SfxName };

export { playSfx, setGenerating, suspendAll, resumeAll };

/** 手势内调用：解锁 AudioContext（首次点击"开始游戏"或播放页首次点击）。 */
export function unlockAudio(): void {
  unlockContext();
}

/** 开关变化：总开关 / 打字音。 */
export function configureAudio(next: Partial<AudioOptions>): void {
  setAudioOptions(next);
  // 总开关关着且上下文还没建过 —— 保持静默，别提前创建
  if (!getOptions().enabled && !isBuilt()) return;
}

/** 滑杆变化：0–100 的音效音量。 */
export function setAudioVolume(sePct: number): void {
  setLevel(sePct);
}

/** CDP 断言用的只读快照。 */
export function audioSnapshot() {
  return {
    ...debugState(),
    bus: {
      branches: getBus() ? ['sfx', 'reverb'] : [],
    },
  };
}

/** 只在浏览器里挂调试钩子，不参与逻辑。 */
if (typeof window !== 'undefined') {
  (window as unknown as { __koiAudio?: unknown }).__koiAudio = {
    get snapshot() {
      return audioSnapshot();
    },
    unlock: unlockAudio,
    play: playSfx,
  };
}
