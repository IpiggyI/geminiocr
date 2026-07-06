# 第三批：独立设置视图

## Goal

设置从玻璃态弹窗改为独立设置视图（state 切换，无路由），分组呈现，支持提示词自定义，修复弹窗时代的全部缺陷（裁顶、遮罩、Key 不可见、badge 突兀、无 Esc）。

## Requirements

1. **形态**（决策 #7）：点设置图标整页切到设置视图，返回按钮回主界面；Esc 也返回；ConfigModal 及其 overlay 样式删除
2. **分组**：
   - **API**：API URL / API Key / Model；Key 输入框带可见性切换（眼睛图标）；保留"留空回落环境变量"逻辑，"自定义/环境变量" badge 移除，改为输入框下方一行灰色说明文字（当前生效值来源）
   - **提示词**：OCR / 翻译 / 纠错 三个多行文本框；空则用内置默认（placeholder 展示默认摘要）；每条带"恢复默认"；存 localStorage
   - **桌面**（仅 isTauri 显示）：全局快捷键录制（沿用现录制交互 + 错误提示）；默认翻译目标语言
3. **提示词生效**：useOcrSession / prompts 读自定义值：OCR prompt、TRANSLATE_PROMPT、CORRECTION_PROMPT 均可覆盖；顺带修 CORRECTION_PROMPT 编号跳 4
4. **设置图标**（#5）：header 图标换为与视觉体系一致的标准齿轮 SVG
5. **未配 Key 引导**（M2 收口）：主界面识别报"缺少 API Key"时 toast 附"去设置"动作，跳转设置视图并聚焦 Key 输入框
6. 设置变更即时生效（维持现 localStorage 同步策略），"清空并回落环境变量"保留并覆盖提示词

## Acceptance Criteria

- [ ] 任意窗口尺寸（含 900×620 最小窗）下设置视图完整可用、无裁切、可滚动
- [ ] Key 可见性切换正常；刷新后配置保持
- [ ] 三条提示词：自定义后识别/翻译/纠错请求实际使用自定义值（测试断言 prompt 传参）；清空恢复默认
- [ ] Esc / 返回按钮回主界面且不丢当前识别结果
- [ ] 未配 Key 时引导链路可用
- [ ] ConfigModal 相关代码与 CSS 无残留（grep 校验）
- [ ] `npm test` 全绿

## Notes

- 依赖第二批：视图切换所需的 App.js 减负与组件化已完成
- 快捷键注册失败的错误处理沿用现 initDesktopShortcut 返回结构
