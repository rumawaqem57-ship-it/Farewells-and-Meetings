import { useEffect } from 'react';
import type { SceneLocation } from '../script/types';
import { imagesFor, themeFor } from './locations';

interface Props {
  location?: SceneLocation;
  playerName?: string;
}

/** 场景背景：优先用图床直链；没有图就退回昼夜渐变。 */
export default function SceneBackground({ location, playerName }: Props) {
  const theme = themeFor(location, playerName);
  const images = imagesFor(location, playerName);
  const phase = location?.phase ?? '昼';
  const image = phase === '夜' ? images.night : images.day;
  const gradient = phase === '夜' ? theme.night : theme.day;

  // 预加载昼/夜两张，切换场景时不闪空白
  useEffect(() => {
    for (const url of [images.day, images.night]) {
      if (!url) continue;
      const img = new Image();
      img.src = url;
    }
  }, [images.day, images.night]);

  const layerStyle = image
    ? {
        backgroundImage: `linear-gradient(rgba(9, 11, 16, 0.22), rgba(9, 11, 16, 0.42)), url(${image})`,
      }
    : { background: gradient };

  return (
    <div className="koi-bg" aria-hidden>
      <div
        className="koi-bg__layer"
        data-phase={phase}
        key={`${location?.path ?? 'default'}-${phase}`}
        style={layerStyle}
      />
      <div className="koi-bg__tint" data-phase={phase} />
    </div>
  );
}
