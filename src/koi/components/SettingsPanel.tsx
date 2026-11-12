import { useState, type CSSProperties } from 'react';
import {
  AUTO_LABEL,
  SPEED_LABEL,
  type AutoWait,
  type DisplayMode,
  type KoiSettings,
  type TextSpeed,
} from '../settings';

type Tab = 'audio' | 'text' | 'display';

interface Props {
  settings: KoiSettings;
  onChange: (patch: Partial<KoiSettings>) => void;
  onClose: () => void;
  onHome: () => void;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}

function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="koi-seg">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          className={optionValue === value ? 'is-active' : ''}
          onClick={() => onChange(optionValue)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** 设置面板：音频 / 文字 / 画面（结构参考用户截图）。 */
export default function SettingsPanel({ settings, onChange, onClose, onHome }: Props) {
  const [tab, setTab] = useState<Tab>('audio');

  return (
    <div className="koi-settings" onClick={event => event.stopPropagation()}>
      <section className="koi-settings__card">
        <header className="koi-settings__head">
          <div>
            <h2>设置</h2>
            <p>PREFERENCES</p>
          </div>
          <button type="button" className="koi-settings__close" aria-label="关闭设置" onClick={onClose}>
            ×
          </button>
        </header>

        <nav className="koi-settings__tabs">
          {([
            ['audio', '音频'],
            ['text', '文字'],
            ['display', '画面'],
          ] as Array<[Tab, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={tab === value ? 'is-active' : ''}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="koi-settings__body">
          {tab === 'audio' && (
            <>
              <div className="koi-settings__group koi-settings__group--row">
                <div>
                  <p className="koi-settings__group-title">音频总开关</p>
                  <p className="koi-settings__desc">关闭后全部静音，音量数值与各分项开关保持不变。</p>
                </div>
                <button
                  type="button"
                  className={`koi-toggle ${settings.audioEnabled ? 'is-on' : ''}`}
                  aria-pressed={settings.audioEnabled}
                  onClick={() => onChange({ audioEnabled: !settings.audioEnabled })}
                >
                  <span />
                </button>
              </div>

              <div className="koi-settings__group koi-settings__group--audio">
                <div className="koi-settings__row">
                  <span className="koi-settings__label">
                    <svg className="koi-settings__audio-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9.6 4.6A2 2 0 1 1 11 8H3" />
                      <path d="M12.6 19.4A2 2 0 1 0 14 16H3" />
                      <path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H3" />
                    </svg>
                    音效音量
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.se}
                  disabled={!settings.audioEnabled}
                  style={{ '--koi-fill': `${settings.se}%` } as CSSProperties}
                  onChange={event => onChange({ se: Number(event.target.value) })}
                />
                <div className="koi-settings__meter">
                  <span className="koi-settings__value">{settings.se}%</span>
                </div>
                <p className="koi-settings__desc">按钮、翻页、打字与线索提示的提示音；没有背景音乐与地点环境音。</p>
              </div>

              <div className="koi-settings__group koi-settings__group--row">
                <div>
                  <p className="koi-settings__group-title">打字音</p>
                  <p className="koi-settings__desc">逐字落下的轻响；快速档会自动降频。</p>
                </div>
                <button
                  type="button"
                  className={`koi-toggle ${settings.typingSfx ? 'is-on' : ''}`}
                  aria-pressed={settings.typingSfx}
                  onClick={() => onChange({ typingSfx: !settings.typingSfx })}
                >
                  <span />
                </button>
              </div>

              <p className="koi-settings__note">
                音效由浏览器实时合成，不加载外部音频。首次点击「开始游戏」后才会出声，没有任何持续背景声。
              </p>
            </>
          )}

          {tab === 'text' && (
            <>
              <div className="koi-settings__group">
                <p className="koi-settings__group-title">文字速度</p>
                <Segmented<TextSpeed>
                  value={settings.speed}
                  options={[
                    ['instant', SPEED_LABEL.instant],
                    ['slow', SPEED_LABEL.slow],
                    ['normal', SPEED_LABEL.normal],
                    ['fast', SPEED_LABEL.fast],
                  ]}
                  onChange={value => onChange({ speed: value })}
                />
                <p className="koi-settings__desc">「瞬间」不做逐字动画，整段直接落下；其余档位只影响打字节奏。</p>
              </div>

              <div className="koi-settings__group">
                <p className="koi-settings__group-title">AUTO 模式等待时间</p>
                <Segmented<AutoWait>
                  value={settings.autoWait}
                  options={[
                    ['short', AUTO_LABEL.short],
                    ['normal', AUTO_LABEL.normal],
                    ['long', AUTO_LABEL.long],
                  ]}
                  onChange={value => onChange({ autoWait: value })}
                />
                <p className="koi-settings__desc">一段台词读完后停留多久，再自动推进到下一句。</p>
              </div>
            </>
          )}

          {tab === 'display' && (
            <>
              <div className="koi-settings__group">
                <p className="koi-settings__group-title">显示模式</p>
                <Segmented<DisplayMode>
                  value={settings.display}
                  options={[
                    ['auto', '自动'],
                    ['desktop', '桌面'],
                    ['mobile', '手机'],
                  ]}
                  onChange={value => onChange({ display: value })}
                />
                <p className="koi-settings__desc">手机模式会把画面收进竖屏框；桌面铺满宽屏；自动按屏幕比例切换。</p>
              </div>

              <div className="koi-settings__group koi-settings__group--row">
                <div>
                  <p className="koi-settings__group-title">天气粒子特效</p>
                  <p className="koi-settings__desc">只影响氛围粒子；关闭后不再绘制，省性能。</p>
                </div>
                <button
                  type="button"
                  className={`koi-toggle ${settings.particles ? 'is-on' : ''}`}
                  aria-pressed={settings.particles}
                  onClick={() => onChange({ particles: !settings.particles })}
                >
                  <span />
                </button>
              </div>
            </>
          )}

        </div>

        <footer className="koi-settings__foot">
          <div className="koi-settings__foot-left">
            <span>✓ 更改即时保存</span>
            <button type="button" className="koi-settings__home" onClick={onHome}>
              返回主页
            </button>
          </div>
          <button type="button" className="koi-settings__save" onClick={onClose}>
            保存并返回
          </button>
        </footer>
      </section>
    </div>
  );
}
