export interface CharacterMeta {
  name: string;
  /** 身份短标签，占位立绘上显示 */
  role: string;
  /** 占位色（有正式立绘后只留作界面点缀） */
  color: string;
  /** 占位立绘上的大字 */
  initial: string;
}

function meta(name: string, role: string, color: string, initial: string): CharacterMeta {
  return { name, role, color, initial };
}

/**
 * 角色表。key 同时接受全名与短名——世界书变量里写「藤枝心春」，
 * 正文台词里常写「心春」；解析器按原样保留说话人，这里负责兜住两种写法。
 */
export const CHARACTERS: Record<string, CharacterMeta> = {
  // 单角色卡（世界书 V2）：AI 直接以「恋喰少女」署名
  恋喰少女: meta('恋喰少女', '她', '#c8503f', '喰'),
  藤枝心春: meta('藤枝心春', '义妹', '#dd7a5f', '心'),
  心春: meta('藤枝心春', '义妹', '#dd7a5f', '心'),
  早瀬枫: meta('早瀬枫', '邻居', '#e0a95f', '枫'),
  枫: meta('早瀬枫', '邻居', '#e0a95f', '枫'),
  白瀬灯: meta('白瀬灯', '青梅', '#4f8a90', '灯'),
  灯: meta('白瀬灯', '青梅', '#4f8a90', '灯'),
  七海澄子: meta('七海澄子', '讲师', '#6f7fae', '澄'),
  澄子: meta('七海澄子', '讲师', '#6f7fae', '澄'),
  黒川涟: meta('黒川涟', '夜班', '#95749f', '涟'),
  涟: meta('黒川涟', '夜班', '#95749f', '涟'),
};
