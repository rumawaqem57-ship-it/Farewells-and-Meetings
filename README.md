# 恋喰者 · 楼层剧本前端

这是一个给 SillyTavern 酒馆助手 iframe 使用的单一 React 前端。它把楼层文本解析成可播放的 galgame 场景，并把正式产物收敛为一个 HTML 文件。

## 从哪里开始

- **应用源码**：`src/koi/`
- **构建入口**：`src/koi/index.tsx` + `src/koi/index.html`
- **播放逻辑**：`src/koi/playback/`
- **酒馆交互**：`src/koi/game/`
- **剧本协议**：`src/koi/script/`
- **交付正则与导入说明**：`delivery/`
- **设计资料**：`design/`
- **历史分析资料**：`docs/history/`
- **历史辅助脚本**：`tools/legacy/`（执行边界见该目录 README）
- **通用初始模板**：`初始模板/`（保留参考，不参与当前 React 构建）
- **唯一进度文档**：`项目进度.md`

早期根目录的 `index.html` 已归到 `design/legacy/index.html`，另一个早期稿 `design/yao-visual-draft.html` 也保留作设计参考。当前 HTML 模板始终是 `src/koi/index.html`；`dist/` 由构建生成，不直接编辑。

## 目录职责

| 目录 | 内容 | 是否进入当前构建 |
| --- | --- | --- |
| `src/koi/` | 当前 React 应用、解析器、播放与酒馆适配 | 是，唯一应用入口 |
| `assets/` | 图片原稿、manifest 和素材来源 | 原稿不自动打包；运行时使用源码中的映射 |
| `dist/koi/` | 构建生成的单文件 HTML 与许可证清单 | 构建输出，随仓库交付 |
| `delivery/` | 当前项目的导入正则与说明 | 否，由用户导入酒馆 |
| `design/` | 设计稿、旧视觉稿、世界书地点资料 | 否 |
| `docs/history/` | 历史分析结果 | 否 |
| `tools/legacy/` | 已退出当前流程的世界书辅助脚本 | 否，不自动执行 |
| `初始模板/` | 用户纳入仓库的通用前端、脚本、流式界面、角色卡模板 | 否，使用前需适配 |

世界书地点资料在 `design/worldbook/主要地点.yaml`，历史分析在 `docs/history/cot_analysis.txt`。它们不是完整的当前角色卡或世界书交付包。

本地 `_reference/`、`_evidence/`、`.godhand/`、`.workbuddy/` 及四个辅助仓库由 `.gitignore` 排除；它们不参与本项目构建或上传。`_backup/` 已按用户要求删除，忽略规则保留以防以后误上传快照。

## 常用命令

```powershell
npm run typecheck     # TypeScript 检查
npm run test:parser   # 剧本解析器测试
npm run build         # 生成 dist/koi/index.html
npm run dev           # 开发模式构建
npm run watch         # 监听构建
npm run serve         # 静态服务 dist，访问 /koi/index.html
```

本地交付预览：先运行 `npm run build`，再运行 `npm run serve`，打开 `http://localhost:5500/koi/index.html`。

## 修改边界

1. 业务代码只放在 `src/koi/`，新增功能优先归入已有的 `components`、`playback`、`audio`、`game`、`script` 边界。
2. `dist/koi/` 由源码重新构建并随仓库交付；截图证据、本地参考和辅助仓库由 `.gitignore` 排除。
3. `assets/locations/*.png` 是原始大图，发布使用已记录在 manifest 中的外链；不要把原图重新塞进单文件产物。
4. 交付前至少运行 `typecheck`、`test:parser` 和 `build`，并把阶段变化写入 `项目进度.md`。

## 发布入口

- 开发正则：`delivery/koi-dev-regex.json`
- 正式正则模板：`delivery/koi-official-regex.json`
- 正式加载地址应指向 `dist/koi/index.html`，发布前先确认构建产物已更新。
- 当前正式正则仍是默认禁用的 CDN 占位模板；Git 推送与酒馆导入、CDN 验证分开完成。

## 本次整理参考

参考本地 `meng` 与 [zujienanyou16](https://github.com/zzh185061429-cmyk/zujienanyou16) 的源码、产物、模板和工具边界。它们是多入口模板工程；本项目沿用单入口 React 构建，未引入它们的 Vue 构建器、自动更新工作流或同步脚本。
