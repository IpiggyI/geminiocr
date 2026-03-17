import { isTauri } from './tauriBridge';

/**
 * 在 Tauri 桌面端启动时注册全局快捷键事件监听
 * Web 环境中自动跳过
 *
 * @param {(payload: any) => void} onShortcutTriggered - 快捷键触发回调
 * @returns {Promise<() => void>} cleanup 函数
 */
export const initDesktopShortcut = async (onShortcutTriggered) => {
  if (!isTauri()) return () => {};

  const { listen } = await import('@tauri-apps/api/event');

  // 监听 Rust 侧发送的快捷键事件
  const unlisten = await listen('desktop-shortcut-triggered', () => {
    onShortcutTriggered();
  });

  return unlisten;
};
