import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ARCHIVE_MEMBERS, bondRank } from '../archiveData';
import { CHARACTER_SPRITES, spriteFor } from '../playback/characterImages';

interface Props {
  onClose: () => void;
}

type TabKey = 'status' | 'bond' | 'profile';

const TABS: { key: TabKey; label: string; en: string }[] = [
  { key: 'status', label: '状态', en: 'STATUS' },
  { key: 'bond', label: '关系', en: 'BOND' },
  { key: 'profile', label: '档案', en: 'FILE' },
];

const DEFAULT_EMOTION = '平静';

/**
 * 角色状态面板（V4）。
 *
 * 版式取自 BV1gant6mETF 的 LENA status：左侧立绘 + 米金数值卡 + 黑头特征卡 + 背景压字。
 * 切换走「三页常驻 + 位移淡入」，不重挂载 DOM —— 这是流畅的关键；
 * 立绘切表情走「六层叠放只切 opacity」，不换 src，不会闪白。
 */
export default function CharacterArchive({ onClose }: Props) {
  const [selectedId, setSelectedId] = useState(ARCHIVE_MEMBERS[0].id);
  const [tab, setTab] = useState<TabKey>('status');
  const [rosterOpen, setRosterOpen] = useState(true);
  const [emotion, setEmotion] = useState(DEFAULT_EMOTION);

  const member = useMemo(
    () => ARCHIVE_MEMBERS.find(item => item.id === selectedId) ?? ARCHIVE_MEMBERS[0],
    [selectedId],
  );
  const bond = bondRank(member.favor);
  const emotions = useMemo(() => Object.keys(CHARACTER_SPRITES[member.name] ?? {}), [member.name]);
  const hasSprite = emotions.length > 0;
  const activeTab = TABS.findIndex(item => item.key === tab);

  // 换角色：表情回到平静（没有平静就用第一张），避免上一个人的表情串到下一个人身上
  useEffect(() => {
    if (!emotions.length) return;
    setEmotion(emotions.includes(DEFAULT_EMOTION) ? DEFAULT_EMOTION : emotions[0]);
  }, [member.id, emotions]);

  const panelStyle = {
    '--arc-accent': member.color,
    '--arc-roster': rosterOpen ? '260px' : '0px',
  } as CSSProperties;

  const stageWord = (member.codename ?? member.romaji.split(' ')[0]).toUpperCase();
  const [bondName, bondGrade] = bond.rank.split(' · ');

  return (
    <div className="koi-arc" onClick={onClose}>
      <section className="koi-arc__panel koi-sp" onClick={event => event.stopPropagation()} style={panelStyle}>
        <button type="button" className="koi-sp__close" aria-label="关闭角色档案" onClick={onClose}>
          ×
        </button>

        <aside className="koi-sp__roster" data-open={rosterOpen}>
          <header className="koi-sp__roster-head">
            <span className="koi-sp__kicker">KOI ARCHIVE</span>
            <h2>人物档案</h2>
          </header>

          <div className="koi-sp__list" role="listbox" aria-label="人物名册">
            {ARCHIVE_MEMBERS.map(item => {
              const active = item.id === member.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`koi-sp__roster-item ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedId(item.id);
                    setTab('status');
                  }}
                >
                  <span className="koi-sp__avatar" style={{ background: item.color }}>
                    {item.initial}
                  </span>
                  <span className="koi-sp__roster-meta">
                    <b>{item.name}</b>
                    <i>{item.title.split(' · ')[0]}</i>
                  </span>
                  <span className="koi-sp__roster-favor">{item.favor}</span>
                </button>
              );
            })}
          </div>

          <button type="button" className="koi-sp__back" onClick={onClose}>
            返回游戏
          </button>
        </aside>

        <button
          type="button"
          className="koi-sp__collapse"
          aria-label={rosterOpen ? '收起名册' : '展开名册'}
          onClick={() => setRosterOpen(value => !value)}
        >
          {rosterOpen ? '‹' : '›'}
        </button>

        <div className="koi-sp__stage">
          <span className="koi-sp__bgword" aria-hidden>
            {stageWord}
          </span>

          {/* 窄屏隐藏了名册，用这排小头像补上角色切换 */}
          <div className="koi-sp__quickroster" role="listbox" aria-label="角色切换">
            {ARCHIVE_MEMBERS.map(item => (
              <button
                key={item.id}
                type="button"
                role="option"
                title={item.name}
                aria-selected={item.id === member.id}
                className={item.id === member.id ? 'is-active' : ''}
                style={{ background: item.color }}
                onClick={() => {
                  setSelectedId(item.id);
                  setTab('status');
                }}
              >
                {item.initial}
              </button>
            ))}
          </div>

          {hasSprite ? (
            <div className="koi-sp__figure">
              {emotions.map(key => (
                <img
                  key={key}
                  className="koi-sp__sprite"
                  src={spriteFor(member.name, key)}
                  alt=""
                  draggable={false}
                  aria-hidden={key !== emotion}
                  style={{ opacity: key === emotion ? 1 : 0 }}
                />
              ))}
            </div>
          ) : (
            <div className="koi-sp__sigil" aria-hidden>
              <i className="koi-sp__sigil-ring" />
              <b>{member.initial}</b>
            </div>
          )}

          <div className="koi-sp__stage-foot">
            <div className="koi-sp__nameplate">
              <b>{stageWord}</b>
              <span>status</span>
            </div>

            {hasSprite && (
              <div className="koi-sp__emotions" role="group" aria-label="切换表情">
                {emotions.map(key => (
                  <button
                    key={key}
                    type="button"
                    className={key === emotion ? 'is-on' : ''}
                    aria-pressed={key === emotion}
                    onClick={() => setEmotion(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="koi-sp__info" data-word={member.name}>
          <header className="koi-sp__head" key={member.id}>
            <div className="koi-sp__head-main">
              <h2>{member.name}</h2>
              <span>{member.romaji}</span>
            </div>
            <i className="koi-sp__title">{member.title}</i>
          </header>

          <nav className="koi-sp__tabs">
            {TABS.map(item => (
              <button
                key={item.key}
                type="button"
                className={`koi-sp__tab ${item.key === tab ? 'is-active' : ''}`}
                onClick={() => setTab(item.key)}
              >
                <b>{item.label}</b>
                <span>{item.en}</span>
              </button>
            ))}
          </nav>

          <div className="koi-sp__panes">
            {/* ---- 状态 ---- */}
            <section
              className="koi-sp__pane"
              data-active={tab === 'status'}
              data-rel={activeTab > 0 ? 'left' : 'right'}
            >
              <div className="koi-sp__card">
                <div className="koi-sp__card-top">
                  <div className="koi-sp__favor">
                    <span>好感</span>
                    <b>{member.favor}</b>
                    <small>/100</small>
                  </div>
                  <span className="koi-sp__bond-tag">{bondName}</span>
                </div>
                <div className="koi-sp__card-sub">
                  <span>
                    <b>关系</b>
                    {bondGrade}
                  </span>
                  <span>
                    <b>兴趣</b>
                    {member.hobby}
                  </span>
                </div>
              </div>

              <div className="koi-sp__traits">
                {(member.traits ?? []).map(trait => (
                  <div className="koi-sp__trait" key={trait.title}>
                    <span className="koi-sp__trait-head">
                      <i>{trait.label}</i>
                      {trait.title}
                    </span>
                    <p>{trait.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ---- 关系 ---- */}
            <section
              className="koi-sp__pane"
              data-active={tab === 'bond'}
              data-rel={activeTab > 1 ? 'left' : 'right'}
            >
              <div className="koi-sp__bond">
                <div className="koi-sp__bond-top">
                  <b>{bondName}</b>
                  <span>{bondGrade}</span>
                </div>
                <div className="koi-sp__bond-hearts" aria-label={`好感 ${member.favor}`}>
                  {[1, 2, 3, 4, 5].map(value => (
                    <span key={value} className={value <= bond.hearts ? 'is-on' : ''}>
                      ♥
                    </span>
                  ))}
                </div>
                <div className="koi-sp__bond-bar">
                  <i style={{ width: `${member.favor}%` }} />
                  <em>{member.favor}</em>
                </div>
                <ul className="koi-sp__bond-lines">
                  {(member.bondLines ?? []).map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* ---- 档案 ---- */}
            <section
              className="koi-sp__pane"
              data-active={tab === 'profile'}
              data-rel={activeTab > 2 ? 'left' : 'right'}
            >
              <div className="koi-sp__meta">
                <div>
                  <span>性别</span>
                  <b>{member.gender}</b>
                </div>
                <div>
                  <span>年龄</span>
                  <b>{member.age}</b>
                </div>
                <div>
                  <span>生日</span>
                  <b>{member.birthday}</b>
                </div>
                <div>
                  <span>兴趣</span>
                  <b>{member.hobby}</b>
                </div>
              </div>

              <div className="koi-sp__bio">
                <span aria-hidden>“</span>
                <p>{member.desc}</p>
              </div>

              <div className="koi-sp__tags">
                {member.tags.map(tag => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
