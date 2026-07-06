# 全仓体检报告（2026-07-04，基于 v0.1.5 = HEAD 2c2664d）

## 用户提出的 12 条问题核对

| # | 描述 | 结论 | 真实情况 |
|---|------|------|---------|
| 1 | 无托盘、关闭即退出 | 与代码意图不符 | `windowBootstrap.js` 已实现托盘+关闭隐藏，但 `capabilities/default.json` 只授 `core:default`（window 仅只读 getter），`hide/show/setFocus/unminimize/destroy` 全未授权，`core:app:default` 不含 `default-window-icon`。整条链路运行时被权限拒绝，历史所有 tag 均如此——托盘从未真正工作过 |
| 2 | 设置界面粗糙/遮罩/Key 不可见/"自定义"突兀 | 属实 | 遮罩是刻意玻璃态 overlay(blur 12px)；`.config-modal-content` 同时继承 `.modal-content`(max-height 90vh) 与自身 88vh 两套规则，小窗口 flex 居中裁顶；API Key 固定 `type=password`；4 个字段有"自定义/环境变量" badge |
| 3 | 快捷键不能手输且不生效 | 根因不同 | 输入框为 readOnly 录制式。"不生效"根因：注册大概率成功，触发后 `showAndFocusWindow()` 因缺 window 权限 reject，OCR 逻辑执行不到 |
| 4 | 自动翻译该在主界面+双 tab | 属实 | 且翻译 prompt"只输出译文"，原文不保留 |
| 5 | 设置图标抽象 | 属实 | header 上是无 stroke 纯 fill 雪花状 path；ConfigModal 里另有一个精致渐变齿轮，两处不一致 |
| 6 | GitHub 图标点击无反应 | 属实 | 无 opener 插件，webview 拦截 target=_blank；且 href 指向原作者 CiZaii 个人页而非本仓库（IpiggyI/geminiocr） |
| 7 | 上传区排版粗糙 | 属实 | label 按钮+小字+链接按钮竖排堆叠 |
| 8 | 识别后布局粗暴压缩 | 属实 | `.upload-section.with-image` 硬编码 300px；另 CSS `@media 768px` 不区分桌面端，窗口拖窄时 JS(isCompact=false) 与 CSS(移动端样式) 判定不一致 |
| 9 | 两个纯蓝按钮 | 属实 | 均为 `.copy-button`；"一键纠错"是把结果文本再发 LLM 修 LaTeX/格式，非重试 |
| 10 | 结果区三层框 | 属实 | `result-container`(边框+阴影) 内套 `markdown-body`(白底+圆角+阴影)；`.markdown-body` 在 App.css 定义两次(2063/2122) |
| 11 | 窗口小、不记忆 | 属实 | 960×700，无 minSize，未装 window-state 插件 |
| 12 | 提示词不可自定义 | 属实 | prompts.js 硬编码；CORRECTION_PROMPT 编号跳 4 |

## 新发现问题

### 严重
- **S1 桌面端拖拽上传疑似完全失效**：tauri.conf.json 未设 `dragDropEnabled:false`，Tauri 2 默认拦截原生拖放导致 HTML5 drag/drop 事件不触发（Win/mac），代码只监听 HTML5 事件。需实机确认
- **S2 PDF 预览裂图**：`useOcrSession.js` 用 `/pdf-icon.png`，public/ 无此文件
- **S3 托盘"退出"退不掉**：`window.destroy()` 同样缺权限
- **S4（安全）api/ 三个 serverless 函数是无鉴权公开端点**：recognize.js/recognizeOpenAI.js/recognizeSync.js 前端零引用（死代码），但部署后若 Vercel 配了 GEMINI_API_KEY 即为公网免费代理
- **S5（正确性）preprocessText.js:21-22**：replace 替换串中 `$$` 转义为单个 `$`，`\\[`/`\\]` 被换成 `$` 而非 `$$`，块级公式降级为行内定界符

### 中等
- M1 错误信息直接写进识别结果文本（可被复制/纠错），无重试按钮
- M2 未配 API Key 无引导，报错塞进结果区
- M3 handleCopyText 用 querySelector 直改 DOM，两按钮同类名
- M4 弹窗无 Esc/焦点管理；无"清空全部"入口
- M5 拖入 URL 只认图片后缀，无后缀 CDN 链接静默失败
- M6 maxOutputTokens 8192 硬编码，密集页可能截断
- M7 API Key 明文 localStorage
- m8 API Key 走 URL query `?key=`（进日志），可改 `x-goog-api-key` 头
- m9 api/ 生成参数与前端不一致（死代码佐证）

### 结构性
- Q1 App.css 2639 行：result-container 定义 3 处、markdown-body 2 处、@media 768 出现 11 次
- Q2 App.js 666 行揉所有布局+事件+弹窗
- Q3 dev StrictMode 双跑 effect，托盘/快捷键靠模块级单例兜底

## 已拍板决策（grilling 会话）
1. 范围：三批全做（修断裂→主界面→设置页），Web/桌面共性一起惠及
2. 托盘/关闭隐藏/唤起：整体移 Rust 侧，删 windowBootstrap.js
3. 快捷键：修好保留，唤起走 Rust 命令，录制交互不变
4. 翻译：两次请求（纯 OCR→自动翻译），translations[] 独立存储，原文/译文双 tab，开关移主界面
5. 主布局：左图右文对照+可拖分隔条+底部缩略图条；有图后上传区收成顶部工具条（粘贴/上传/链接/清除）
6. GitHub 图标：直接移除（含 Web 端）
7. 设置：独立设置视图（state 切换），分组 API/提示词/桌面

## 默认处理（已向用户通报）
- 拖拽：`dragDropEnabled: false`
- 窗口：默认 1280×800、min 900×620、tauri-plugin-window-state
- 提示词：OCR/翻译/纠错三条开放，空则回落默认，附恢复默认
- 复制/纠错换 SVG 图标+tooltip，"一键纠错"改名"格式纠错"；错误改 toast+重试按钮
- 去 markdown-body 第二层框；CSS 按组件拆文件去重
- 设置图标换标准齿轮；Key 可见性切换；去 badge；补 pdf-icon；Esc 关弹窗
- 残留风险：API Key 仍 localStorage 明文；CSP 未实机验证
- S4 处置定案（2026-07-05 二次决策，覆盖此前"删除"结论）：用户确认 Vercel 现配 `REACT_APP_*`（Key 已烤入公网 bundle，视为已泄露，需轮换）。最终方案：保留内置 API 能力，立子任务 `07-05-web-api-security`——Key 移服务端、api/ 重写为访问口令保护的流式透明代理、旧三函数删除、README/部署 env 收敛
- 补充决策（2026-07-05）：重试识别时追加重试提示词（入第 main-ui-redesign 批）；UI 批次调用 frontend-design / ui-ux-pro-max skill 辅助设计；自定义应用图标（根目录 1254×1254 PNG 源图，入 fix-broken-desktop 批）
