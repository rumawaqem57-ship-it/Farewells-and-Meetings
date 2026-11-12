export interface CgItem {
  /** 唯一 id，用作 React key 和存档标记 */
  id: string;
  /** 卡片标题（角色名或场景名） */
  title: string;
  /** 可选副标（如「第一章 · 雨夜」） */
  caption?: string;
  /** 图片地址：本地相对路径或图床直链 */
  url: string;
}

/**
 * 角色 CG 清单。
 *
 * 目前留空 —— 背景图不再充当 CG（2026-10-23 决定）。
 * 导入角色 CG 后往这里加条目即可，只改这一个文件：
 *
 *   { id: 'rei-01', title: '白瀬灯', caption: '雨夜', url: 'assets/cg/rei-01.webp' },
 *
 * 图片放 `src/koi/assets/cg/` 会被 webpack 一起打包进单文件产物。
 */
export const CG_ITEMS: CgItem[] = [];
