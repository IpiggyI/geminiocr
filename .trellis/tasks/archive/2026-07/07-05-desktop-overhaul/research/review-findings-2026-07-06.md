# 全面评审留档（2026-07-06，trellis-check）

范围：`8d0f57f..434e7cc`（18 提交 / 113 文件），覆盖 4 个子任务全部改动。
处置：仅记录，待统一修复后再 review（用户拍板）。

## 复审结论（2026-07-06 第二轮，修复后）

缺陷 1/2/4 + 全部 4 处小瑕疵已修复并有针对性测试（108/108 绿）：
- 1 PDF 页重试：`handlePdfFile` 逐页 `setFiles`，测试断言重试实际重发请求 ✓
- 2 清空竞态：`handlePdfFile`/`uploadFiles`/`processClipboardImage`/`handleFile`/`correctCurrentText` 全加代际守卫，含 preview URL 泄漏回收 ✓
- 3 混合批量索引：`uploadFiles` 用 `handledCount` 计算 `indexOffset` ✓（含 0 页 PDF 缩位的正确处理）
- 4 快捷键回滚：register 失败重注册旧快捷键，测试断言调用顺序 ✓
- 瑕疵①compact 设置入口恢复（CSS 无隐藏规则）②纠错失败 toast ③aria-label ④粘贴多图独立 index ✓

**残留（已修，2026-07-06 复审时顺带）**：`App.js handleDrop` 原以静态 `startIndex + i + idx` 并行调 `handleFile`——拖入 [PDF, 图片] 混合内容索引错位、PDF 预览裂图（blob URL 而非 SVG 占位）。修复：handleDrop 收集完 File 后改走 `uploadFiles`，删除自建占位/分批逻辑（净删 ~14 行）；App.test.js 新增拖拽 PDF 走 SVG 占位的接线测试。修后 109/109 绿 + build 无告警。

**全部缺陷/瑕疵关闭。** 余项仅剩：实机五项点检、Web 手动回归、任务归档。

## 自动化核对（全过）

- `npm test` 102/102 全绿；`npm run build` 成功无 warning
- build 产物 grep 不到 `AIza` 形态 Key；`prebuild` 挂 `check-env-safety.js`
- 旧三端点已删；vercel.json rewrite 排除 `/api`；代理门 405/503/401 三态齐全
- ConfigModal 零残留；版本三处对齐 0.1.9
- S1~S5 全部有处置记录（S1 dragDropEnabled:false / S2 内联 SVG / S3 app.exit(0) / S4 代理 / S5 preprocessText 修复+测试）
- Rust 托盘/关闭隐藏/single-instance/window-state 实现正确；spec 已同步

## 待修缺陷（按严重度）

### 1.（新引入）PDF 页「重试识别」静默无效
- 位置：`src/hooks/useOcrSession.js` — `retryRecognition`（~L420）+ `handlePdfFile`（~L240）
- 原因：`files[]` 只在 `handleFile` 入口记录；PDF 页级 `imageFile` 未写入 `files`。
  失败页点重试 → `files[index]` undefined → 直接 return，无反馈；
  第一页 index == startIndex 时取到 PDF File 本体 → `handleImageFile` 类型检查静默返回。
- 修法：`handlePdfFile` 内 `setFiles` 把每页 imageFile 写到 `startIndex + pageIndex`。
- 验证：新增测试——PDF 页识别失败后 `retryRecognition(pageIndex)` 实际重发请求。

### 2.（新机制漏覆盖）清空会话后 PDF 页复活
- 位置：`useOcrSession.js` — `handlePdfFile` 的 `setImages`/`setResults` splice（~L221-230）
- 原因：代际守卫（generationRef）只覆盖识别/翻译写回；大 PDF 转换中点「清除」，
  `pdfToImageDataUrls` 完成后页图插回空列表（signal 已 abort 不会识别，但出现幽灵缩略图+「正在识别中...」）。
  `uploadFiles` / `processClipboardImage` 的 preview append 同理有小竞态窗口。
- 修法：这三处 setState 前加 `stale()` 代际校验。
- 验证：测试——clearSession 后 resolve pdf 转换 Promise，断言 images 仍为空。

### 3.（遗留）混合批量含 PDF 时索引错位
- 位置：`useOcrSession.js` — `uploadFiles` + `handlePdfFile` splice 展开
- 原因：一次上传 [PDF, 图片]，previews 按文件数占位；PDF splice 展开 n 页后，
  后续文件写回 index 仍是展开前旧值 → 结果/错误写错槽位。8d0f57f 之前即存在。
- 修法方向：串行处理时用「当前实际偏移」代替静态 startIndex+i，或 PDF 展开后广播偏移修正。改动面较大，可单独立项。

### 4.（遗留，settings-view 录制 UI 放大触发面）快捷键注册失败弄丢旧快捷键
- 位置：`src/desktop/shortcutBootstrap.js` — `applyDesktopShortcut`
- 原因：先 unregister 旧 → register 新失败（组合键被系统占用等）→ 旧的已注销，
  但 `registeredShortcut`/UI 仍显示旧值生效；下次 apply 再 unregister 已注销值可能抛错。
- 修法：register 失败时回滚重注册旧快捷键；全失败才置空 `registeredShortcut`。
- 验证：单测 mock register 抛错，断言旧快捷键被重新注册。

## 小瑕疵（顺手修即可）

- compact（移动 Web）空态无设置入口：`App.js` header `settings-link` 在 isCompact 时 `display:none`，Toolbar 仅有图态出现；首次用户只能靠失败 toast「去设置」进入。设计文档无此决策记录，需拍板：补入口 or 记为有意为之。
- 纠错失败仅 console.error，无 toast（`correctCurrentText` catch）。
- Toolbar 设置按钮 aria-label 仍为「打开 API 配置」，应改「打开设置」。
- 一次粘贴事件含多张图片时共用同一 `newIndex`（App.js paste handler，极罕见）。

## 父任务 AC 余项

- 实机五项（Windows：关闭→托盘 / 托盘退出 / 快捷键唤起+OCR / 拖拽 / 窗口记忆）— 用户自排
- Web 端手动回归 — 用户自排
- 4 子任务 + 父任务归档 — 待缺陷修复与实机点检后一并做
