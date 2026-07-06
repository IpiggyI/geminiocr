# 设计：主界面重做

> 视觉稿（拍板 ASCII 示意 + 组件视觉规格）见 [`design-mockups.md`](./design-mockups.md)，2026-07-05 用户过目通过方向。

## 组件拆分（自 App.js 666 行中析出）

```
src/components/
  Toolbar.js          顶部工具条：粘贴/上传/链接/清除 + 翻译开关/语言 + 设置入口
  UploadDropzone.js   空态 dropzone（相机 SVG + 提示文案 + 拖拽事件）
  ImagePane.js        左栏：大图 + 缩略图条 + 页码
  ResultPane.js       右栏：原文/译文 tab + 图标按钮 + Viewer
  SplitPane.js        可拖分隔条（自实现 ~60 行：pointer events + 百分比 + min 钳制，不引库）
  icons.js            相机/复制/纠错/翻译/设置等 SVG 集中导出
```

App.js 只留状态编排与视图装配。每组件配同名 CSS 文件，从 App.css 迁出对应规则并去重；App.css 保留全局基础样式。

## 数据流（useOcrSession 扩展）

- 新增状态：`translations[]`、`translatingIndexes`（Set 或 boolean[]）
- `handleImageFile`：识别 prompt 恒为 `OCR_PROMPT`（去掉 appendTranslateInstruction 调用点）；识别成功后若 `translateEnabledRef.current` → `translateResult(index)`
- 新增 `translateResult(index)`：取 `results[index]` 原文，走 `callGeminiStream`（纯文本 prompt：翻译到目标语言），流式写 `translations[index]`；失败置错误态不污染 results
- prompts.js：新增 `TRANSLATE_PROMPT`（`{content}`/`{lang}` 占位），保留 `appendTranslateInstruction` 导出到本批结束后删除
- 错误通道：`handleImageFile` 的 catch 不再把错误文本写入 results，改为 `errors[index]` + toast；ResultPane 按 `errors[index]` 渲染重试按钮（重试 = `handleFile` 原 file 重跑 → 需在 session 里保留 `files[index]` 引用）

## 布局与断点

- 有图态：`SplitPane` 左右布局，初始 38/62，左 min 260px、右 min 360px；分隔比例存 localStorage
- 断点统一：JS 用 `matchMedia('(max-width: 768px)')` 且桌面端(isTauri)不进入紧凑模式；CSS 紧凑样式全部挂在 `.app--compact` 类下由 JS 控制，删除组件相关的裸 `@media 768px`（全局字体类保留）
- 缩略图条：横向滚动，当前页高亮；点击切换 currentIndex

## Tab 交互

- ResultPane 顶部：`原文` / `译文`（译文 tab 带 spinner/失败角标）；无翻译时不渲染 tab 头，保持简洁
- 复制按钮复制当前激活 tab 内容；纠错只作用于原文（译文纠错无意义）

## 兼容与回滚

- `results[]` 语义不变；粘贴/URL/PDF 入口函数签名不变
- 分阶段 commit：数据流（翻译/错误通道）→ 组件拆分 → 布局重排 → CSS 迁移，每步测试可绿，可独立 revert
