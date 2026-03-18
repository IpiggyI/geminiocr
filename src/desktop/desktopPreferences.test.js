import {
  DEFAULT_DESKTOP_SHORTCUT,
  loadDesktopShortcut,
  normalizeDesktopShortcut,
  saveDesktopShortcut,
} from './desktopPreferences';

describe('desktopPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('loads default shortcut when storage is empty', () => {
    expect(loadDesktopShortcut()).toBe(DEFAULT_DESKTOP_SHORTCUT);
  });

  test('normalizes whitespace and falls back to default for empty input', () => {
    expect(normalizeDesktopShortcut('  CommandOrControl + Shift + O  ')).toBe(DEFAULT_DESKTOP_SHORTCUT);
    expect(normalizeDesktopShortcut('   ')).toBe(DEFAULT_DESKTOP_SHORTCUT);
  });

  test('saves and reloads custom shortcut', () => {
    expect(saveDesktopShortcut(' Alt + Shift + X ')).toBe('Alt+Shift+X');
    expect(loadDesktopShortcut()).toBe('Alt+Shift+X');
  });
});
