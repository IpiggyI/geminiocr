# 桌面端体检改造：漂亮高可用 App

## Goal

把 GeminiOCR 从"勉强能用"改造成漂亮、高可用的桌面 App（Web 端共性问题一并修复）。依据：`research/health-check-report.md`（12 条用户问题核对 + S1~S5/M1~M7/Q1~Q3 新发现 + 已拍板决策）。

## Requirements

本任务为父任务，只管需求总集、任务地图与跨子任务验收，不直接承载实现。

### 任务地图（执行顺序即依赖顺序）

1. `07-05-fix-broken-desktop`（P0）：修复功能性断裂——托盘/关闭隐藏/唤起移 Rust 侧、拖拽、window-state、pdf-icon、自定义应用图标、S5 preprocessText bug
2. `07-05-web-api-security`（P0，可与 1 并行）：服务端 Key + 访问口令流式代理，撤 REACT_APP Key 出 bundle（S4 处置定案）
3. `07-05-main-ui-redesign`（P1）：主界面重做——dropzone 重排、左图右文、双 tab 翻译、重试提示词、图标化按钮、去嵌套框、CSS 拆分（依赖第一批的拖拽修复结论）
4. `07-05-settings-view`（P1）：独立设置视图——分组 API/提示词/桌面、Key 可见性、访问口令字段迁移、提示词自定义（依赖第三批的视图切换骨架）

### 约束

- Web 端与桌面端共用同一套 React 代码，所有 UI 改动必须两端可用（桌面特性用 isTauri 分支）
- 遵循既有测试风格（jest + testing-library，*.test.js 同目录）
- 不引入路由库；视图切换用 state
- 本轮不动：API Key localStorage 明文存储（记录残留风险即可）

## Acceptance Criteria

- [ ] 三个子任务各自验收通过并归档
- [ ] 实机验证（Windows 桌面端）：关闭→托盘、托盘退出、快捷键唤起+OCR、拖拽上传、窗口大小记忆，五项全部通过
- [ ] Web 端回归：上传/粘贴/URL/PDF 识别、翻译、纠错、设置持久化不回退
- [ ] `npm test` 全绿；`npm run build` 与 `npx tauri build` 成功
- [ ] 体检报告中 S1~S5 全部关闭或有明确处置记录

## Notes

- 发版对齐 `.memory/conventions/tauri-version-alignment.md`（tauri crate 与 npm 包同 minor）
- CSP 2026-07-04 首次启用未实机验证，桌面端空白/请求失败先查 tauri.conf.json csp
