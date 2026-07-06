# 第一批：修复桌面功能性断裂

## Goal

修复体检报告（父任务 `research/health-check-report.md`）中所有"功能性断裂"项，不动 UI 外观。修完后桌面端核心链路（托盘常驻、快捷键 OCR、拖拽上传、窗口记忆）全部实际可用。

## Requirements

1. **托盘 + 关闭隐藏 + 唤起窗口移到 Rust 侧**（决策 #2）
   - lib.rs 实现：托盘图标（编译期资源）+ 菜单（显示主窗口 / 退出）+ 左键点击唤起
   - `on_window_event` 拦截 CloseRequested → hide，替代 JS onCloseRequested
   - 暴露 `show_main_window` command 供 JS 快捷键 handler 调用（替代 showAndFocusWindow 的窗口部分）
   - 删除 `src/desktop/windowBootstrap.js` 及其测试；`tauriBridge.showAndFocusWindow` 改为 invoke Rust command
   - 单实例回调改走同一 Rust 显示逻辑
2. **全局快捷键修复保留**（决策 #3）：注册/录制逻辑不变，触发后经 Rust command 唤起窗口，再走剪贴板 OCR
3. **拖拽修复**：`tauri.conf.json` 窗口配置加 `dragDropEnabled: false`，恢复 HTML5 拖放
4. **窗口**：默认 1280×800、minWidth 900 / minHeight 620；接入 `tauri-plugin-window-state` 记忆大小与位置
5. **S2**：补 `public/pdf-icon.png`（或改用内联 SVG 占位）
6. **S5**：修 `preprocessText.js` 的 `$$` 替换串转义 bug（`\\[`/`\\]` 应产出 `$$`），补回归测试
7. **S4 处置（已移交）**：改由子任务 `07-05-web-api-security` 处理（用户 2026-07-05 二次决策：不删除 api 能力，重写为服务端 Key + 访问口令的流式代理）；本任务不再触碰 api/ 与 vercel.json 的 api 段
8. **GitHub 图标移除**（决策 #6）：删 header 中 github-link（Web 端一并）
10. **自定义应用图标**（用户 2026-07-05 补充）：根目录 `ChatGPT Image 2026年7月4日 09_33_34.png`（1254×1254 RGB）为图标源图；重命名移入合适位置（如 `src-tauri/icons/source.png`），用 `npx tauri icon` 生成全套桌面图标替换 icons/ 现有文件；Web 端 favicon/logo192/logo512 一并替换；源图为 RGB 无透明通道，生成前评估是否需处理背景
9. 权限文件同步：capabilities 移除不再需要的授权，新增插件所需授权（window-state）

## Acceptance Criteria

- [ ] 实机（Windows）：点关闭 → 窗口隐藏、托盘可见；托盘左键/菜单可唤起；托盘"退出"真正退出进程
- [ ] 实机：`Ctrl+Shift+O` 在窗口隐藏状态下唤起窗口并对剪贴板图片自动 OCR
- [ ] 实机：拖拽图片/PDF 到窗口可触发识别
- [ ] 实机：调整窗口大小后重启，大小与位置保持
- [ ] `preprocessText('\\\\[x\\\\]')` 产出 `$$x$$`，新增测试通过
- [ ] PDF 上传预览不再裂图
- [ ] Web 端（npm start）回归：粘贴/上传/URL/PDF 识别正常，无 GitHub 图标
- [ ] `npm test` 全绿，`cargo check`（src-tauri）通过

## Notes

- Web 端行为不受托盘改动影响（Rust 侧代码仅桌面生效）
- tauri crate 与 npm 包版本对齐规范见 `.memory/conventions/tauri-version-alignment.md`
