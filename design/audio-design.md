# 《恋喰者》音频引擎设计方案

> **2026-11-03 失效提醒（S27）**：用户要求"把原本的背景音频去掉"，拍板**背景音乐 drone 与地点环境音全部下线**，
> 只保留一次性交互音效（打字 / 翻页 / 按钮 / 线索提示）。
> 本文件第 4、5 节（环境音配方、drone/chord 方案）与第 6 节中 bgm/ambience 的接线**已作废，仅作历史设计记录**；
> 当前实现见 `src/koi/audio/{context,sfx,index}.ts` 与 `项目进度.md` 的 S27 章节。

> 目标：把 `SettingsPanel` 里那两个"只存数值"的滑杆变成真的声音。
> 约束：**零音频素材**（单文件产物铁律，不能引 mp3/ogg），全部 Web Audio 实时合成。
> 状态：**已实施（2026-10-23）**。用户拍板：只做 drone、打字音默认开、环境音与音效共用一个滑杆。
> chord 模式未实施，`bgm.ts` 的 `applyMood` 已留好滑音换调通路，将来接上只需补一个和弦排程器。
> 实施与验收记录见 `项目进度.md` 的 S7 章节。

---

## 0. 一句话方案

标题页点击「开始游戏」时解锁 AudioContext → 建立一条
`master → compressor → destination` 总线，下挂 `bgm / amb / sfx` 三条增益支路；
所有声音用振荡器 + 白噪声 + 滤波器 + 卷积混响 **当场合成**，不加载任何文件。

---

## 1. 信号链

```
                    ┌── bgmBus (gain = settings.bgm/100 × 0.5) ─→ pad/drone/arp
AudioContext ─ master(0.9) ─ DynamicsCompressor ─ destination
                    ├── ambBus (gain = settings.se/100 × 0.55) ─→ 环境音层（交叉淡入）
                    └── sfxBus (gain = settings.se/100 × 1.0) ─→ 短音效（一次性节点）
```

- 三路独立，设置页两个滑杆分别直控 `bgmBus` / `sfxBus + ambBus`。
- 改音量用 `gain.setTargetAtTime(v, now, 0.05)`，避免爆音，不需要防抖。
- `AudioContext` 单例懒建；任何环节失败 → 返回 `null`，调用方全部静默跳过（**声音不能影响播放**）。

---

## 2. 新增文件

| 文件 | 职责 | 预估行数 |
|---|---|---|
| `src/koi/audio/context.ts` | AudioContext 单例、总线、`unlockAudio()`、`setGain(bgm, se)` | ~110 |
| `src/koi/audio/sfx.ts` | 9 种短音效合成 + `playSfx(name)` | ~180 |
| `src/koi/audio/ambience.ts` | 10 组环境音配方 + `setAmbience(key)` 交叉淡入 | ~230 |
| `src/koi/audio/bgm.ts` | 氛围垫 / 和弦模式、调性表、混响 IR 生成 | ~200 |
| `src/koi/audio/index.ts` | 统一出口 `koiAudio`，给 React 用的极简 API | ~40 |

合计约 760 行，全部纯 TS，无新依赖。

### 对外 API（React 只碰这几个）

```ts
unlockAudio(): void                    // 必须在用户手势里调
setGain(bgm: number, se: number): void // 0–100
playSfx(name: SfxName): void
setAmbience(key: AmbienceKey): void
setBgmMood(mood: BgmMood): void        // 'title' | 'daily-day' | 'daily-night' | 'tension' | 'reveal'
setGenerating(on: boolean): void
suspendAll() / resumeAll()             // 页面隐藏时
```

---

## 3. 音效清单（全部合成，不含素材）

统一的包络写法：`attack 1–3ms → 指数衰减到 0.0001`，`osc.stop(t+len)` 后自动回收。

| 名称 | 合成配方 | 触发点（现有代码位置） |
|---|---|---|
| `type` 打字 | 三角波，`freq = 780 + rand*520`，衰减 12ms，峰值 0.045；**每 2 字符一次，15% 概率跳过** | `TypingText.tsx` 的 `tick()` 内部，不经过父级 state |
| `advance` 推进 | 白噪 burst 90ms，带通 900→300Hz 扫描 | `Playback.advance()` |
| `back` 回退 | 同 `advance` 反向扫（300→900） | `Playback.back()` |
| `click` UI | 正弦 620Hz，衰减 40ms，峰值 0.03 | 底栏 / 顶栏按钮 |
| `clue` 线索入册 | 两音 E5→B5 三角波短铃 + 短混响 | `Playback` 记线索、自动发牌 |
| `deduce` 推论成立 | Cmaj7 三音上行琶音（间隔 70ms） | 笔记本「确认入卷」 |
| `truth` 真相解锁 | Cmaj7 五音上行 + 2.6s 混响 + 低频垫 | `unlockTruth` 后 |
| `overturn` 推翻 | 小二度下行 + 噪声尾巴 | 「用反证推翻」 |
| `error` 无效操作 | 方波 220Hz 两下 | 组合不足时（可选，默认关） |

**风控**：`cps >= 60` 时打字音自动降频到「每 4 字符一次」，避免机关枪。
每个节点的 `onended` 里 `disconnect()`，不留悬挂图。

---

## 4. 环境音配方（按地点 × 昼夜）

来源：`themeFor(location).label` + `location.phase`，映射成 `AmbienceKey`。
换场景时旧层 800ms 淡出、新层 800ms 淡入（同一时刻最多 2 层存活）。

| key | 层配方 |
|---|---|
| `apartment-day` | 空调底噪：白噪→LPF 380Hz(Q0.7) gain .012，0.08Hz LFO 扫 ±60Hz |
| `apartment-night` | 虫鸣：三角 4300Hz，8Hz 方波 AM 调制 gain .006，BPF 4kHz(Q8) |
| `store-day` | 冰柜：正弦 58Hz gain .02 + 噪→LPF 300 gain .01 |
| `store-night` | 同上（夜间增益 ×1.3）+ 每 4s 随机「叮咚」门铃（880/660 三角，0.15s） |
| `cafe-day` | 蒸汽：噪→HPF 2kHz，每 6–14s 随机喷 0.4s gain .02；底噪 LPF 500 gain .012 |
| `cafe-night` | 同上去蒸汽，仅留底噪 + 极轻杯碟偶发 |
| `school-day` | 远处人声：噪→BPF 500(Q1.2) gain .015，0.3Hz LFO |
| `classroom-night` | 荧光灯：正弦 100Hz gain .004 + 6kHz 极轻嘶声 |
| `lab` | 电脑风扇：噪→LPF 700 gain .014 + 正弦 120Hz gain .006 |
| `netcafe` | 风扇 gain .018 + 每 0.4–1.2s 随机短点击（网吧键盘） |
| `shrine-day` | 风：噪→BPF 1200(Q0.6) gain .02，0.07Hz LFO 扫 600–2200Hz |
| `shrine-night` | 风（增益 ×0.7）+ 虫 4.4kHz + 每 20–40s 风铃（1568/2093/2637 三音，衰减 2s） |

「偶发事件」用 `setTimeout` 随机调度，层销毁时必须 `clearTimeout`（内存泄漏重灾区）。

---

## 5. BGM：两种模式，默认保守的那一种

> 这是全案**唯一有听觉风险**的部分。程序化和弦很容易做得像廉价八音盒，所以我给两档。

### 模式 A：`drone`（默认）
三个持续音（根音 / 五度 / 九度），三角+正弦混合，总增益 0.03，低通 800Hz（0.05Hz LFO 扫 300–1200Hz），
卷积混响 2.6s 湿声 0.35。听起来是 ambient 空气层，**不可能跑调，也不可能抢戏**。

### 模式 B：`chord`（可选开关）
在 drone 的 4 个音上做 8 秒一次的和弦切换，freq 用 2s 线性滑音过渡（避免硬切），
外加一层极轻琶音（正弦 0.015，随机 60% 出现）。
调性按 mood：

| mood | 调 | 和弦进行（8s 一个） |
|---|---|---|
| `title` | D 大调 | Dmaj7 → Bm7 → Gmaj7 → A7sus4 |
| `daily-day` | D 大调 | Dmaj7 → A/C# → Bm9 → Gmaj7 |
| `daily-night` | B 小调 | Bm9 → Gmaj7 → D/F# → A |
| `tension` | A 小调 | Am(add9) 常驻 + A1 心跳脉冲（0.9s 一次） |
| `reveal` | F 大调 | Fmaj7 → Cmaj7 → G6 → Am7 |

混响 IR 用程序生成噪声衰减 buffer，不加载文件。

**切换 mood 时 1.5s 交叉淡入淡出**；`title` 页响，进播放页换成对应场景 mood。

---

## 6. 接线点（具体到现有文件）

| 文件 | 改动 |
|---|---|
| `settings.ts` | 新增 `ambience: boolean`（默认 true）、`typingSfx: boolean`（默认 true）、`bgmStyle: 'drone'\|'chord'`（默认 drone）、`audioEnabled: boolean`（总开关，默认 true）。`loadSettings` 现有浅合并会自动补齐，无需迁移。 |
| `App.tsx` | `begin()` 首行 `unlockAudio()`（手势内）；`view` 变化时 `setBgmMood('title' \| 'daily-…')`；`useEffect` 里监听 `visibilitychange` 做 `suspend/resume`。 |
| `TypingText.tsx` | `tick()` 每吐字符累计计数器，达阈值调 `playSfx('type')`。**不进 state、不进父级**，遵守 S3 铁律。 |
| `Playback.tsx` | `advance/back/handleClick` 加 `playSfx`；`useEffect` 跟随 `current.location` 调 `setAmbience`；`engine.isGenerating` → `setGenerating`；记线索/入卷/推翻/解锁四处加对应音效。 |
| `SettingsPanel.tsx` | 删掉「音频引擎将在 S5 接入」那句；音频页加 3 个开关（总开关 / 环境音 / 打字音）+ BGM 风格二选一；滑杆 `onChange` 里同步 `setGain`。 |
| `index.css` | 无需改动（音频无 UI）。 |

**不改**：解析器、引擎、笔记本逻辑、世界书协议。音频层完全旁挂。

---

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| **自动播放策略**：AudioContext 必须在用户手势内创建/resume | `unlockAudio()` 挂在标题页开始按钮；播放页首次 `pointerdown` 再兜底一次；失败静默 |
| **iframe 内**：酒馆 iframe 里 AudioContext 能否启动 | 合成音频不发网络请求，`sandbox` 不拦；只需确保手势来自 iframe 自身文档（开始按钮满足） |
| **程序化 BGM 难听** | 默认 drone 模式；chord 做成开关，你试听后自己定 |
| **打字音太吵** | 默认每 2 字符、15% 跳过、高 cps 自动降频；设置页可关 |
| **与酒馆其他音频冲突** | 给总开关；不主动 duck 别人 |
| **性能** | 节点全部复用或 `onended` 清理；打字音峰值约 32 个短节点/秒，Chrome 无压力 |
| **iOS** | 不用 `<audio>` 元素（iOS 的 volume 只读），纯 GainNode，无坑 |

---

## 8. 实施顺序（每步可单独验收）

| 步 | 内容 | 验收方式 |
|---|---|---|
| A1 | `context.ts` + `sfx.ts` + `TypingText`/`Playback` 接线 + 设置页滑杆接线 | CDP 断言 `__koiAudio.state === 'running'`、滑杆 → bus gain 同步；截图设置页 |
| A2 | `ambience.ts` + 场景切换接线 | CDP 切场景后读 `__koiAudio.ambienceKey`；听感人工 |
| A3 | `bgm.ts`（drone 优先，chord 作开关） | CDP 读 mood / 节点数；听感人工 |
| A4 | 设置页新增开关 + `项目进度.md` 新增 S7 音频章节 | build / typecheck / test:parser 全绿 |

调试钩子：`window.__koiAudio = { state, bus, ambienceKey, mood, nodeCount }`，仅供 CDP 断言，不参与逻辑。

---

## 9. 需要你拍板的三件事

1. **BGM 走 drone 还是 chord**？我建议先 drone（安全），chord 留开关你听完再定。
2. **打字音默认开还是关**？我建议默认开（音量很轻），但有人嫌吵。
3. **要不要「环境音」独立音量**？现在设置页只有"背景音乐 / 环境音效"两个滑杆，我打算把 SFX 和 ambience 共用"环境音效"，节省一层 UI。
