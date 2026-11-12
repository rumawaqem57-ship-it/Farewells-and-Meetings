import type { CharacterMeta } from './characters';
import { spriteFor } from './characterImages';

export interface CastMember {
  meta: CharacterMeta;
  emotion: string;
  active: boolean;
  pos: 'left' | 'center' | 'right';
}

interface Props {
  cast: CastMember[];
}

/** 立绘舞台：最多 3 人同屏；发言者亮，在场未发言者压暗。 */
export default function CharacterStage({ cast }: Props) {
  return (
    <div className="koi-stage" data-count={cast.length} aria-hidden={cast.length === 0}>
      {cast.map(member => {
        const sprite = spriteFor(member.meta.name, member.emotion);
        return (
        <div
          key={member.meta.name}
          className={`koi-char koi-char--${member.pos} ${member.active ? 'is-active' : 'is-idle'}`}
        >
          {/* 有立绘时不挂头顶名牌：对话框已显示名字，放大后名牌会顶出屏幕 */}
          {!sprite && (
            <div className="koi-char__plate">
              <span className="koi-char__name">{member.meta.name}</span>
              <span className="koi-char__role">
                {member.meta.role} · {member.emotion}
              </span>
            </div>
          )}
          <div
            className={`koi-char__body ${sprite ? 'has-sprite' : ''}`}
            style={
              sprite
                ? undefined
                : {
                    background: `linear-gradient(180deg, ${member.meta.color}33 0%, ${member.meta.color}b3 55%, ${member.meta.color}dd 100%)`,
                  }
            }
          >
            {sprite ? (
              <img className="koi-char__sprite" src={sprite} alt={member.meta.name} draggable={false} />
            ) : (
              <span className="koi-char__initial">{member.meta.initial}</span>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
