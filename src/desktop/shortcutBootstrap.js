import { normalizeDesktopShortcut } from './desktopPreferences';
import { isTauri } from './tauriBridge';

let registeredShortcut = null;

const unregisterShortcut = async (shortcut) => {
  const { unregister } = await import('@tauri-apps/plugin-global-shortcut');
  await unregister(shortcut);
};

const registerShortcut = async (shortcut, onTriggered) => {
  const { register } = await import('@tauri-apps/plugin-global-shortcut');
  await register(shortcut, (event) => {
    if (event.state === 'Pressed') {
      onTriggered(event);
    }
  });
};

export const applyDesktopShortcut = async ({ shortcut, onTriggered }) => {
  const activeShortcut = normalizeDesktopShortcut(shortcut);

  if (!isTauri()) {
    return { ok: true, activeShortcut };
  }

  try {
    if (registeredShortcut) {
      await unregisterShortcut(registeredShortcut);
    }

    await registerShortcut(activeShortcut, onTriggered);
    registeredShortcut = activeShortcut;

    return { ok: true, activeShortcut };
  } catch (error) {
    return {
      ok: false,
      activeShortcut: registeredShortcut || activeShortcut,
      message: `快捷键注册失败，请检查格式或更换组合键 (${error.message})`,
    };
  }
};

/**
 * 在 Tauri 桌面端启动时注册全局快捷键
 * Web 环境中自动跳过
 */
export const initDesktopShortcut = async ({ shortcut, onTriggered }) => {
  const result = await applyDesktopShortcut({ shortcut, onTriggered });

  return {
    ...result,
    cleanup: async () => {
      if (!isTauri()) return;
      if (registeredShortcut !== result.activeShortcut) return;
      await unregisterShortcut(result.activeShortcut);
      registeredShortcut = null;
    },
  };
};
