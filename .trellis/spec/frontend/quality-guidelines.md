# 质量规范

> 前端代码质量标准：测试、lint、错误处理、日志。以真实配置和代码为准。

---

## 测试

- 工具链：**Jest + @testing-library/react**（经 CRA `react-scripts test`，命令 `npm test`）。
- 测试文件与被测文件**同目录**、同名加 `.test.js`（如 `runtimeConfig.js` ↔ `runtimeConfig.test.js`）。
- 测试代码用英文描述（`describe(...)` / `test(...)`），被测的中文文案原样断言。

三类被测对象，三种写法：

```js
// 1) 纯函数（lib/）——直接断言输入输出与边界
expect(resolve({ apiUrlConfig: '', apiKeyConfig: '', modelConfig: '' })).toEqual({ /* env 回落 */ });
expect(() => resolve(/* 缺 key */)).toThrow();

// 2) hook——renderHook + act
const { result } = renderHook(() => useOcrSession({}));
act(() => { result.current.cancelRecognition(); });
expect(result.current.isLoading).toBe(false);

// 3) 组件——render + screen；定时器用假时钟
render(<ToastHost />);
act(() => { toast('稍纵即逝', { duration: 1000 }); });
act(() => { jest.advanceTimersByTime(1100); });
expect(screen.queryByText('稍纵即逝')).not.toBeInTheDocument();
```

**测试测契约，不测实现**：验证边界与行为——导航越界不动（`handlePrevImage` on empty）、配置回落优先级、`models/` 前缀剥离、取消后 loading 复位、localStorage 跨重挂载持久化、endpoint 不重复拼 `alt=sse`。不写快照测试。

新增 `lib/` 纯函数或 hook 动作时，配套加同目录 `.test.js`，至少覆盖正常路径 + 一个边界/失败路径。

---

## Lint

- 配置只有 `package.json` 里的 `eslintConfig.extends: ["react-app", "react-app/jest"]`，无自定义规则、无 Prettier 配置文件。
- 关闭 `react-hooks/exhaustive-deps` 必须逐行 `// eslint-disable-next-line` 并附中文原因注释。
- 缩进 2 空格，跟随现有文件风格；不引入格式化工具改动既有排版。

---

## 错误处理

统一「捕获 → 中文上下文 `console.error` → 面向用户降级」：

```js
try {
  // ...
} catch (error) {
  console.error('处理文件时出错:', error);   // 中文前缀 + 原始 error 对象
  // 面向用户：写入结果占位 或 toast()
}
```

- **日志**：catch 块与外部调用（Gemini API、Tauri 插件、剪贴板）出错时 `console.error('中文上下文:', error)`，保留原始 error。
- **面向用户的错误**：
  - 走 `toast(message, { type: 'error' })`（替代 `alert`）；或
  - 写进 `results[index]`（如 `识别出错,请重试 (${error.message})`、`已取消`）让结果区展示。
- **可预期失败**（跨环境能力缺失、剪贴板空）用**结构化结果对象** `{ status, message }` 返回，由调用方分支，不靠抛异常（见 [type-safety.md](./type-safety.md)）。
- **取消**单独识别：`if (error.name === 'AbortError')` 时按「已取消」处理，不当作错误。
- HTTP 响应先判 `response.ok`，失败时解析出可读 detail 再抛（见 `streamGeminiContent.js`）。

---

## 无障碍（延续现状）

`aria-label`（交互按钮）、`aria-hidden`（装饰 SVG）、`role="status"` + `aria-live`（动态提示）已在用，新代码保持。

---

## 代码审查清单

- [ ] 新 `lib/` 纯函数 / hook 动作是否有同目录 `.test.js`，覆盖边界？
- [ ] 数组/对象状态是否**不可变更新**（`setX(prev => ...)`）？
- [ ] 动作是否 `useCallback` 包裹且依赖完整？关闭 `exhaustive-deps` 是否有中文原因？
- [ ] catch 块是否 `console.error('中文:', error)` + 面向用户降级（toast / 结果占位 / 结构化返回）？
- [ ] `AbortError` 是否与真错误区分？
- [ ] 触达 `@tauri-apps/*` 的代码是否有 `isTauri()` 守卫 + 动态 import（见 [desktop-integration.md](./desktop-integration.md)）？
- [ ] 是否误引入 TS / PropTypes / 全局状态库 / CSS Modules / 图标库 / `alert`？

---

## 反模式

- ❌ 快照测试、只测「组件能渲染」的空洞测试。
- ❌ catch 里静默吞错，不记日志也不给用户反馈。
- ❌ 把 `AbortError` 当识别失败展示给用户。
- ❌ 为格式化引入 Prettier 并重排既有代码。
