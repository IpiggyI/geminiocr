const SPECIAL_CODE_MAP = {
  Space: 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  Delete: 'Delete',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
};

const codeToKeyToken = (code) => {
  if (/^Key([A-Z])$/.test(code)) return code.slice(3);
  if (/^Digit(\d)$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  return SPECIAL_CODE_MAP[code] || null;
};

/**
 * 把按键事件转换为 Tauri 全局快捷键 accelerator 字符串
 * 需要至少一个修饰键 + 一个普通键，否则返回 null
 */
export const keyboardEventToShortcut = (event) => {
  const modifiers = [];
  if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');

  if (!modifiers.length) return null;

  const keyToken = codeToKeyToken(event.code || '');
  if (!keyToken) return null;

  return [...modifiers, keyToken].join('+');
};
