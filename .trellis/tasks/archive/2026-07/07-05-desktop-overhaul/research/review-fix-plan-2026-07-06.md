# Fable review 修复计划（2026-07-06）

## 背景

Fable review 将 `8d0f57f..434e7cc` 的桌面 overhaul 改动统一核对后，缺陷记录在 `review-findings-2026-07-06.md`。本轮按该文件逐项修复，不新建 Trellis 子任务。

## 处理范围

1. `useOcrSession`：修复 PDF 页级重试文件映射、clearSession 后异步 PDF/上传/剪贴板预览复活、混合批量 PDF 展开后的索引错位。
2. `shortcutBootstrap`：注册新快捷键失败时回滚旧快捷键；回滚也失败时才清空模块级 active 状态。
3. UI 小瑕疵：compact 空态保留设置入口、纠错失败 toast、Toolbar 设置按钮 aria 文案、多图粘贴使用递增 index。

## 验证计划

1. `CI=true npm test -- --watchAll=false src/hooks/useOcrSession.test.js src/desktop/shortcutBootstrap.test.js src/components/Toolbar.test.js src/App.test.js`
2. 若目标测试通过，再运行 `CI=true npm test -- --watchAll=false`。
