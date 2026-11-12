# 通用初始模板

本目录的 24 个原始文件由用户提供，本次逐个比对与本地 `meng/初始模板` 完全一致，按用户确认纳入 GitHub。保留原有目录名和文件内容。

- `前端界面/`：Vue 界面骨架与开发正则。
- `脚本/`：后台脚本骨架与开发导入件。
- `流式楼层界面/`：依赖模板工程 `@util/streaming` 的界面骨架。
- `角色卡/`：世界书、首条消息、MVU 变量结构与状态栏骨架。

## 在当前项目中的边界

当前 webpack 只构建 `src/koi/index.tsx`，TypeScript 只检查 `src/`；本目录不参与构建或测试。

原始模板依赖 Vue、Pinia、SCSS、自动导入、`@util`、MVU 或 `tavern_sync` 等模板工程能力，当前 React 项目没有配齐这些能力，不能直接把模板目录复制到 `src/` 后当作可运行功能。

导入 JSON 和角色卡配置中保留了占位路径、localhost 与上游远程脚本。这些都是待适配的模板值。本项目开发正则以 `../delivery/koi-dev-regex.json` 为准；当前服务器的实际入口是 `http://localhost:5500/koi/index.html`，没有额外的 `/dist/` 前缀。

## 来源与许可证

模板所属工程的上游为 [StageDog/tavern_helper_template](https://github.com/StageDog/tavern_helper_template)。本次附带从本地 `meng/LICENSE` 原样复制的 [许可证文本](LICENSE)，供这批模板的来源和使用条件核对；当前应用的其他代码不在这里另行重标许可证。
