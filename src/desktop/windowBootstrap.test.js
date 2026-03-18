jest.mock('./tauriBridge', () => {
  const actual = jest.requireActual('./tauriBridge');
  return {
    ...actual,
    showAndFocusWindow: jest.fn(),
  };
});

jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: jest.fn(),
}));

jest.mock('@tauri-apps/api/app', () => ({
  defaultWindowIcon: jest.fn(),
}));

jest.mock('@tauri-apps/api/tray', () => ({
  TrayIcon: {
    new: jest.fn(),
  },
}));

jest.mock('@tauri-apps/api/menu', () => ({
  Menu: {
    new: jest.fn(),
  },
}));

import { getCurrentWindow } from '@tauri-apps/api/window';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';
import { showAndFocusWindow } from './tauriBridge';
import { initDesktopWindowBehavior } from './windowBootstrap';

describe('windowBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete window.__TAURI_INTERNALS__;
  });

  test('intercepts close request and hides window to tray', async () => {
    const hide = jest.fn();
    let closeHandler;
    const onCloseRequested = jest.fn(async (handler) => {
      closeHandler = handler;
      return jest.fn();
    });
    getCurrentWindow.mockReturnValue({
      hide,
      destroy: jest.fn(),
      onCloseRequested,
    });
    defaultWindowIcon.mockResolvedValue(null);
    Menu.new.mockResolvedValue({ close: jest.fn() });
    TrayIcon.new.mockResolvedValue({ close: jest.fn() });

    const cleanup = await initDesktopWindowBehavior();

    const preventDefault = jest.fn();
    await closeHandler({ preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(hide).toHaveBeenCalled();
    await cleanup();
  });

  test('tray click restores the window', async () => {
    getCurrentWindow.mockReturnValue({
      hide: jest.fn(),
      destroy: jest.fn(),
      onCloseRequested: jest.fn().mockResolvedValue(jest.fn()),
    });
    defaultWindowIcon.mockResolvedValue(null);
    Menu.new.mockResolvedValue({ close: jest.fn() });
    let trayAction;
    TrayIcon.new.mockImplementation(async (options) => {
      trayAction = options.action;
      return { close: jest.fn() };
    });

    const cleanup = await initDesktopWindowBehavior();
    trayAction({ type: 'Click', button: 'Left', buttonState: 'Up' });

    expect(showAndFocusWindow).toHaveBeenCalled();
    await cleanup();
  });

  test('does not register close interception when tray init fails', async () => {
    const onCloseRequested = jest.fn().mockResolvedValue(jest.fn());
    getCurrentWindow.mockReturnValue({
      hide: jest.fn(),
      destroy: jest.fn(),
      onCloseRequested,
    });
    defaultWindowIcon.mockResolvedValue(null);
    Menu.new.mockResolvedValue({ close: jest.fn() });
    TrayIcon.new.mockRejectedValue(new Error('tray init failed'));

    await expect(initDesktopWindowBehavior()).rejects.toThrow('tray init failed');
    expect(onCloseRequested).not.toHaveBeenCalled();
  });
});
