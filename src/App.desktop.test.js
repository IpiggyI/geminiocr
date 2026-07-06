jest.mock('./desktop/shortcutBootstrap', () => ({
  initDesktopShortcut: jest.fn(),
}));

jest.mock('./desktop/clipboardImageToFile', () => ({
  clipboardImageToFile: jest.fn(),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { initDesktopShortcut } from './desktop/shortcutBootstrap';

describe('App desktop regressions', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    window.__TAURI_INTERNALS__ = {};
    window.alert = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    initDesktopShortcut.mockResolvedValue({
      ok: true,
      activeShortcut: 'CommandOrControl+Shift+O',
      cleanup: async () => {},
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    delete window.__TAURI_INTERNALS__;
    consoleErrorSpy.mockRestore();
  });

  test('recording a failing shortcut surfaces the error inline in settings', async () => {
    initDesktopShortcut
      .mockResolvedValueOnce({
        ok: true,
        activeShortcut: 'CommandOrControl+Shift+O',
        cleanup: async () => {},
      })
      .mockResolvedValueOnce({
        ok: false,
        activeShortcut: 'CommandOrControl+Shift+O',
        message: '快捷键注册失败',
        cleanup: async () => {},
      });

    render(<App />);

    // 等待桌面 bootstrap 首次注册完成（消费第 1 个 mock）
    await waitFor(() => expect(initDesktopShortcut).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('打开设置'));

    // 在设置视图录制一个新组合键 → 即时注册失败 → 就地展示错误
    fireEvent.keyDown(screen.getByLabelText('全局快捷键'), {
      code: 'KeyP',
      ctrlKey: true,
      shiftKey: true,
    });

    await waitFor(() => {
      expect(screen.getByText('快捷键注册失败')).toBeInTheDocument();
    });
  });

  test('keeps settings entry visible when desktop window is narrow', async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });

    try {
      render(<App />);

      await waitFor(() => {
        expect(initDesktopShortcut).toHaveBeenCalled();
      });

      expect(screen.getByLabelText('打开设置')).toBeVisible();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });
});
