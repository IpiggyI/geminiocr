# 执行计划：修复桌面功能性断裂

前置：design.md 已评审；S4 处置已确认——移交子任务 `07-05-web-api-security`（重写为服务端 Key + 口令保护的流式代理，**不删除** api/），本任务不触碰 `api/` 与 `vercel.json` 的 api 段。

1. **S5 preprocessText bug**（独立、最小）
   - 先写失败测试（`\\[x\\]` → `$$x$$`），再改 `preprocessText.js:19-22` 为函数替换
   - 验证：`npm test -- preprocessText`
2. **Rust 托盘 + 关闭隐藏 + show_main_window command**
   - Cargo.toml 加 window-state 依赖；lib.rs 按 design.md 实现 setup 托盘、on_window_event、command、window_state 插件
   - 验证：`cargo check`（src-tauri 下）
3. **tauri.conf.json**：窗口尺寸/minSize/dragDropEnabled:false
   - 验证：JSON schema 校验（tauri cli 启动时自校验）
4. **JS 侧收编**
   - tauriBridge.showAndFocusWindow → invoke('show_main_window')（web 环境仍然 no-op）
   - 删 windowBootstrap.js(+test)，App.js 移除对应 effect/ref/import
   - 删 header GitHub 链接
   - 验证：`npm test`；`npm run build`
5. **pdf-icon**：public/ 加 pdf-icon.png（简单文档图标）或改 useOcrSession 用内联 data-url
   - 验证：Web 端上传 PDF 预览正常
6. **应用图标**：源图（根目录 ChatGPT PNG）重命名入 `src-tauri/icons/source.png`，评估透明底处理后 `npx tauri icon` 生成全套；替换 public/ 的 favicon/logo192/logo512
   - 验证：`npx tauri dev` 窗口/任务栏图标生效；Web 端 favicon 更新
   - （S4 原第 6 步已移交 07-05-web-api-security）
7. **capabilities 清理**：按最终 JS 调用面收敛
   - 验证：`npx tauri build`（或 dev 启动）无权限报错
8. **实机验证清单**（用户执行或 CI 产物安装）
   - 关闭→托盘、托盘唤起/退出、快捷键唤起+OCR、拖拽上传、窗口记忆
   - 任一失败 → 回到对应步骤修复

回滚点：每步独立 commit（用户确认后才提交）。

评审门：步骤 2 完成后（Rust 骨架）与步骤 8 前（发实机包）各一次人工确认。
