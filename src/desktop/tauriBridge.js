/**
 * Tauri 环境检测与桥接工具
 * Web 环境中安全跳过，Desktop 环境中提供窗口控制能力
 */

/**
 * 检测当前是否运行在 Tauri 桌面端
 */
export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * 显示并聚焦当前窗口（Tauri 环境下）
 */
export const showAndFocusWindow = async () => {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  await win.show();
  await win.unminimize();
  await win.setFocus();
};
