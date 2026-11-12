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
- **唯一进度文档**：`项目进度.md`

根目录的 `index.html` 是早期静态视觉稿，构建不会读取它；新功能应从 `src/koi/` 开始。`dist/` 是生成目录，不直接编辑。

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
2. `dist/koi/`、截图证据、备份和本机辅助仓库不作为源码维护；它们已由 `.gitignore` 排除或由构建生成。
3. `assets/locations/*.png` 是原始大图，发布使用已记录在 manifest 中的外链；不要把原图重新塞进单文件产物。
4. 交付前至少运行 `typecheck`、`test:parser` 和 `build`，并把阶段变化写入 `项目进度.md`。

## 发布入口

- 开发正则：`delivery/koi-dev-regex.json`
- 正式正则模板：`delivery/koi-official-regex.json`
- 正式加载地址应指向 `dist/koi/index.html`，发布前先确认构建产物已更新。
