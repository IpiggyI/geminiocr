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

  test('saving api config still closes modal when shortcut update fails', async () => {
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

    fireEvent.click(screen.getByLabelText('打开 API 配置'));
    fireEvent.change(screen.getByPlaceholderText(/Gemini API Key/), {
      target: { value: 'test-key' },
    });
    fireEvent.click(screen.getByText('完成'));

    await waitFor(() => {
      expect(screen.queryByText('Gemini API 配置')).not.toBeInTheDocument();
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

      expect(screen.getByLabelText('打开 API 配置')).toBeVisible();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });
});
