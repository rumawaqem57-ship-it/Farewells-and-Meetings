/** 剧本行的三种类型。 */
export type LineType = 'narrator' | 'dialog' | 'thought';

/** 世界书约定的时段后缀：-昼 / -夜。 */
export type ScenePhase = '昼' | '夜';

/** 可选的天气前缀：-晴夜 / -阴昼 / -雪夜；不写就用基础昼/夜图。 */
export type SceneWeather = '晴' | '阴' | '雪';

/** 场景位置：由 `[scene:父地点/子地点-昼|夜]` 控制行解析而来，后续行继承。 */
export interface SceneLocation {
  /** 完整路径，如「住宅/公寓一室」 */
  path: string;
  /** 末级地点名，如「公寓一室」，用于地点显示 */
  displayName: string;
  /** 时段：昼 / 夜；未写时段则为 undefined */
  phase?: ScenePhase;
  /** 天气：晴 / 阴 / 雪；未写则 undefined（室外默认晴天版） */
  weather?: SceneWeather;
}

/** 解析后的一行剧本。纯数据，不带任何酒馆依赖。 */
export interface ScriptLine {
  type: LineType;
  /** 说话人；'<user>' 表示玩家；旁白无 */
  speaker?: string;
  /** 情绪标签（中文），如「害羞」；无则 undefined */
  emotion?: string;
  /** 台词 / 独白 / 旁白正文 */
  text: string;
  /** 该行生效时的场景（由 [scene:] 控制行继承而来） */
  location?: SceneLocation;
}
