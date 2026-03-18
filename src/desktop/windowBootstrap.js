import { isTauri, showAndFocusWindow } from './tauriBridge';

const TRAY_ID = 'geminiocr-main-tray';

let trayInstance = null;
let trayMenu = null;

const createTrayMenu = async (window) => {
  const { Menu } = await import('@tauri-apps/api/menu');

  return Menu.new({
  items: [
    {
      id: 'show-window',
      text: '显示主窗口',
      action: () => {
        void showAndFocusWindow();
      },
    },
    {
      id: 'quit-app',
      text: '退出 GeminiOCR',
      action: async () => {
        await trayInstance?.close();
        await trayMenu?.close();
        trayInstance = null;
        trayMenu = null;
        await window.destroy();
      },
    },
  ],
  });
};

export const initDesktopWindowBehavior = async () => {
  if (!isTauri()) return async () => {};

  const [{ defaultWindowIcon }, { TrayIcon }, { getCurrentWindow }] = await Promise.all([
    import('@tauri-apps/api/app'),
    import('@tauri-apps/api/tray'),
    import('@tauri-apps/api/window'),
  ]);
  const window = getCurrentWindow();
  try {
    if (!trayInstance) {
      trayMenu = await createTrayMenu(window);
      const icon = await defaultWindowIcon().catch(() => null);

      trayInstance = await TrayIcon.new({
        id: TRAY_ID,
        icon: icon || undefined,
        tooltip: 'GeminiOCR',
        menu: trayMenu,
        showMenuOnLeftClick: false,
        action: (event) => {
          if (event.type === 'Click' && event.button === 'Left' && event.buttonState === 'Up') {
            void showAndFocusWindow();
          }
        },
      });
    }

    const unlistenClose = await window.onCloseRequested(async (event) => {
      event.preventDefault();
      await window.hide();
    });

    return async () => {
      await unlistenClose();
      if (trayInstance) {
        await trayInstance.close();
        trayInstance = null;
      }
      if (trayMenu) {
        await trayMenu.close();
        trayMenu = null;
      }
    };
  } catch (error) {
    if (trayInstance) {
      try {
        await trayInstance.close();
      } catch (_) {
        // ignore cleanup errors during bootstrap rollback
      }
      trayInstance = null;
    }
    if (trayMenu) {
      try {
        await trayMenu.close();
      } catch (_) {
        // ignore cleanup errors during bootstrap rollback
      }
      trayMenu = null;
    }
    throw error;
  }
};
