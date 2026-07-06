# 执行计划：独立设置视图

前置：第二批已合入（App.js 已组件化）。

1. **视图壳 + API 组**
   - App.js 加 view state；SettingsView + ApiSection（可见性切换、来源说明行）；Esc 返回
   - 验证：`npm test`；切换往返不丢识别结果；最小窗口 900×620 无裁切
2. **提示词组 + 生效链路**
   - prompts.js 改造（DEFAULT_* + resolvePrompt + 修编号跳 4）；useOcrSession 三个 prompt 状态接入调用点；PromptsSection UI
   - 先写测试：自定义 OCR/翻译/纠错 prompt 断言实际传参；空值回落默认
   - 验证：`npm test -- prompts useOcrSession`
3. **桌面组 + 默认翻译语言**
   - DesktopSection 迁移快捷键录制；翻译默认语言项
   - 验证：桌面 dev 快捷键改绑成功/失败提示
4. **引导链路 + 收尾删除**
   - Toast 加 action；缺 Key 引导；删 ConfigModal(+CSS)、api-config-hint、settings 旧图标换齿轮
   - 验证：`grep -r ConfigModal src/` 无结果；`npm run build`
5. **全量回归**：`npm test`；Web + 桌面双端设置全项过一遍；父任务验收清单联动勾选

回滚点：步骤 1/2/4 各自独立 commit。
评审门：步骤 2 后（提示词生效验收）、步骤 4 后（最终视觉验收）。

执行约定（用户 2026-07-05）：设置视图的视觉设计调用 `frontend-design` 与 `ui-ux-pro-max` 系 skill 辅助，与第二批主界面风格保持同一设计语言。
