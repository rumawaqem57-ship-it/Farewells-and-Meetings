import type { SceneLocation, SceneWeather } from '../script/types.ts';
import { LOCATION_IMAGES, type LocationImageSet } from './locationImages.ts';

export interface LocationTheme {
  label: string;
  /** 昼间渐变（背景图未提供时的兜底） */
  day: string;
  /** 夜间渐变 */
  night: string;
  /** 真实背景图（用户提供后填这里，优先于渐变） */
  imageDay?: string;
  imageNight?: string;
}

const DEFAULT_THEME: LocationTheme = {
  label: '街景',
  day: 'linear-gradient(160deg, #f4ece0 0%, #e6d8c6 100%)',
  night: 'linear-gradient(160deg, #242a33 0%, #141821 100%)',
};

/**
 * 地点主题表。key 用 `[scene:父地点/…]` 的第一段；也接受末级地点名兜底。
 * 背景图就绪后只改这里，不动渲染代码。
 */
const THEMES: Record<string, LocationTheme> = {
  住宅: {
    label: '公寓',
    day: 'linear-gradient(160deg, #f6efe3 0%, #e8d9c4 100%)',
    night: 'linear-gradient(160deg, #2a2d36 0%, #15171d 100%)',
  },
  学校: {
    label: '大学',
    day: 'linear-gradient(160deg, #eef0ea 0%, #d8ddd4 100%)',
    night: 'linear-gradient(160deg, #202832 0%, #10151b 100%)',
  },
  店: {
    label: '便利店',
    day: 'linear-gradient(160deg, #f2efe8 0%, #e2dccd 100%)',
    night: 'linear-gradient(160deg, #1d242c 0%, #0e1216 100%)',
  },
  喫茶店: {
    label: '咖啡馆',
    day: 'linear-gradient(160deg, #f1e7d6 0%, #ddc9ab 100%)',
    night: 'linear-gradient(160deg, #2b2119 0%, #17110c 100%)',
  },
  餐厅: {
    label: '家庭餐厅',
    day: 'linear-gradient(160deg, #f7e9d9 0%, #ecd0b4 100%)',
    night: 'linear-gradient(160deg, #2c1f1a 0%, #15100d 100%)',
  },
  研究室: {
    label: '研究室',
    day: 'linear-gradient(160deg, #eef0f4 0%, #d8dde6 100%)',
    night: 'linear-gradient(160deg, #1e2530 0%, #101520 100%)',
  },
  社团: {
    label: '活动室',
    day: 'linear-gradient(160deg, #f2efe8 0%, #e1dbcd 100%)',
    night: 'linear-gradient(160deg, #22232a 0%, #121316 100%)',
  },
  网吧: {
    label: '网吧',
    day: 'linear-gradient(160deg, #e9e7e2 0%, #cfc9c0 100%)',
    night: 'linear-gradient(160deg, #18151f 0%, #0b0a10 100%)',
  },
  神社: {
    label: '神社',
    day: 'linear-gradient(160deg, #f1ead8 0%, #ddd2b4 100%)',
    night: 'linear-gradient(160deg, #1c2026 0%, #0e1116 100%)',
  },
};

export function themeFor(location?: SceneLocation, playerName?: string): LocationTheme {
  if (!location) return DEFAULT_THEME;
  const first = resolvePlayerName(location.path.split('/')[0]?.trim() ?? '', playerName);
  const display = resolvePlayerName(location.displayName, playerName);
  return THEMES[first] ?? THEMES[display] ?? DEFAULT_THEME;
}

/** 把 {{user}} / [玩家名] / <user> 换成玩家填写的名字。 */
function resolvePlayerName(text: string, playerName?: string): string {
  if (!playerName) return text;
  return text
    .replace(/\{\{\s*user\s*\}\}/gi, playerName)
    .replace(/\{\{\s*name\s*\}\}/gi, playerName)
    .replace(/\[玩家名\]/g, playerName)
    .replace(/<user>/gi, playerName)
    .trim();
}

/** 地点没写末级名时的兜底：父地点 → 常用子地点图。 */
const SEGMENT_ALIAS: Record<string, string> = {
  住宅: '公寓一室',
  店: '便利店',
  学校: '教室',
  神社: '参道',
  其他: '网吧包厢',
  交通: '站台',
  职场: 'LiveHouse',
  自然: '河堤',
  街: '商店街',
};

/** 按天气挑图；没写天气或该地点没有对应变体时，回落到基础昼/夜。 */
function pickByWeather(
  set: LocationImageSet,
  phase: 'day' | 'night',
  weather?: SceneWeather,
): string | undefined {
  const variant =
    weather === '晴'
      ? phase === 'day'
        ? set.sunnyDay
        : set.sunnyNight
      : weather === '阴'
        ? phase === 'day'
          ? set.cloudyDay
          : set.cloudyNight
        : weather === '雪'
          ? phase === 'day'
            ? set.snowyDay
            : set.snowyNight
          : undefined;
  return variant ?? set[phase];
}

/** 取该地点的图床直链：先按末级地点名精确匹配，再按父地点兜底。 */
export function imagesFor(
  location?: SceneLocation,
  playerName?: string,
): { day?: string; night?: string } {
  if (!location) return {};
  const first = resolvePlayerName(location.path.split('/')[0]?.trim() ?? '', playerName);
  const display = resolvePlayerName(location.displayName, playerName);
  const stripped = playerName ? display.split(playerName).join('').trim() : display;
  const candidates = [...new Set([display, stripped].filter(Boolean))];

  let set: LocationImageSet | undefined;
  for (const name of candidates) {
    set = LOCATION_IMAGES[name];
    if (set) break;
  }
  set ??=
    LOCATION_IMAGES[SEGMENT_ALIAS[first] ?? ''] ??
    (stripped ? LOCATION_IMAGES[SEGMENT_ALIAS[stripped] ?? ''] : undefined);

  if (!set) return {};
  return {
    day: pickByWeather(set, 'day', location.weather),
    night: pickByWeather(set, 'night', location.weather),
  };
}
