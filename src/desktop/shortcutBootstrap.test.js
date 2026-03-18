jest.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: jest.fn(),
  unregister: jest.fn(),
}));

import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { applyDesktopShortcut, initDesktopShortcut } from './shortcutBootstrap';

describe('shortcutBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete window.__TAURI_INTERNALS__;
  });

  test('registers normalized shortcut and triggers only on press', async () => {
    const onTriggered = jest.fn();
    let handler;
    register.mockImplementation(async (_shortcut, callback) => {
      handler = callback;
    });

    const result = await applyDesktopShortcut({
      shortcut: ' CommandOrControl + Shift + O ',
      onTriggered,
    });

    expect(result.ok).toBe(true);
    expect(result.activeShortcut).toBe('CommandOrControl+Shift+O');
    expect(register).toHaveBeenCalledWith('CommandOrControl+Shift+O', expect.any(Function));

    handler({ state: 'Released', shortcut: 'CommandOrControl+Shift+O' });
    handler({ state: 'Pressed', shortcut: 'CommandOrControl+Shift+O' });

    expect(onTriggered).toHaveBeenCalledTimes(1);
  });

  test('re-registering a new shortcut unregisters the previous one', async () => {
    register.mockResolvedValue(undefined);

    await applyDesktopShortcut({
      shortcut: 'Alt+Shift+X',
      onTriggered: jest.fn(),
    });

    await applyDesktopShortcut({
      shortcut: 'Alt+Shift+Y',
      onTriggered: jest.fn(),
    });

    expect(unregister).toHaveBeenCalledWith('Alt+Shift+X');
    expect(register).toHaveBeenLastCalledWith('Alt+Shift+Y', expect.any(Function));
  });

  test('cleanup unregisters the active shortcut', async () => {
    register.mockResolvedValue(undefined);

    const result = await initDesktopShortcut({
      shortcut: 'Alt+Shift+X',
      onTriggered: jest.fn(),
    });

    await result.cleanup();

    expect(unregister).toHaveBeenCalledWith('Alt+Shift+X');
  });
});
