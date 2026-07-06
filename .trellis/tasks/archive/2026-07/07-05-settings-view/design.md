# 设计：独立设置视图

## 视图切换

- App.js：`const [view, setView] = useState('main')`（'main' | 'settings'）；不引路由
- 设置视图挂载时 `useEffect` 绑 Esc → setView('main')；主界面状态（images/results/translations）在 App 层，不随视图卸载丢失

## 组件结构

```
src/components/settings/
  SettingsView.js      壳：返回按钮 + 标题 + 分组容器
  ApiSection.js        URL/Key/Model + 可见性切换 + 来源说明行
  PromptsSection.js    三个 PromptField（textarea + 恢复默认 + 默认值 placeholder）
  DesktopSection.js    快捷键录制 + 默认翻译语言（isTauri 时渲染）
  SettingsView.css
```

ConfigModal.js(+相关 CSS) 删除；桌面快捷键 props 结构沿用现 App.js 的 desktop 对象。

## 提示词存储与解析

- localStorage key：`geminiocr-prompt-ocr` / `-translate` / `-correction`（空串=未自定义，遵循现 writeStoredValue 语义）
- prompts.js 改造：导出 `DEFAULT_OCR_PROMPT` / `DEFAULT_TRANSLATE_PROMPT` / `DEFAULT_CORRECTION_PROMPT` + `resolvePrompt(custom, fallback)`；useOcrSession 持有三个 prompt 状态并在 recognizeImage/translateResult/correctText 调用点传入
- 占位符约定：翻译 prompt 含 `{lang}`/`{content}`，纠错含 `{content}`；设置页说明文字标注可用占位符；缺占位符时按"追加到末尾"降级处理，不报错

## Key 可见性

PromptField 外的 ApiSection：`type={visible ? 'text' : 'password'}`，眼睛按钮 `aria-pressed`；不持久化可见状态。

## 来源说明行（替代 badge）

输入框下一行小字：有自定义值 → `当前生效：页面配置`；空 → `当前生效：环境变量（gemini-2.5-flash）`（截断展示）。环境默认值信息卡（api-config-hint）并入此行后删除。

## 引导链路

runtimeConfig 抛"缺少 API Key"错误时，App 层 catch 的 toast 增加 action 按钮（Toast 组件扩展 `action: {label, onClick}`）→ `setView('settings')` + 聚焦 Key（ref 透传或 autoFocus 参数）。

## 回滚

三个 commit：视图壳+API 组、提示词组+生效链路、引导+ConfigModal 删除；均可独立 revert。
