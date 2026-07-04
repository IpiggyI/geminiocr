import { keyboardEventToShortcut } from './shortcutRecorder';

const makeEvent = (overrides) => ({
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  code: '',
  ...overrides,
});

describe('keyboardEventToShortcut', () => {
  test('maps ctrl+shift+letter to accelerator', () => {
    expect(keyboardEventToShortcut(makeEvent({ ctrlKey: true, shiftKey: true, code: 'KeyO' })))
      .toBe('CommandOrControl+Shift+O');
  });

  test('maps meta key to CommandOrControl', () => {
    expect(keyboardEventToShortcut(makeEvent({ metaKey: true, code: 'KeyK' })))
      .toBe('CommandOrControl+K');
  });

  test('orders modifiers as CommandOrControl+Alt+Shift', () => {
    expect(keyboardEventToShortcut(makeEvent({ ctrlKey: true, altKey: true, shiftKey: true, code: 'KeyA' })))
      .toBe('CommandOrControl+Alt+Shift+A');
  });

  test('maps digits, function keys, space and arrows', () => {
    expect(keyboardEventToShortcut(makeEvent({ ctrlKey: true, code: 'Digit5' }))).toBe('CommandOrControl+5');
    expect(keyboardEventToShortcut(makeEvent({ altKey: true, code: 'F2' }))).toBe('Alt+F2');
    expect(keyboardEventToShortcut(makeEvent({ ctrlKey: true, code: 'Space' }))).toBe('CommandOrControl+Space');
    expect(keyboardEventToShortcut(makeEvent({ ctrlKey: true, code: 'ArrowUp' }))).toBe('CommandOrControl+Up');
  });

  test('returns null without any modifier', () => {
    expect(keyboardEventToShortcut(makeEvent({ code: 'KeyO' }))).toBeNull();
  });

  test('returns null for pure modifier press', () => {
    expect(keyboardEventToShortcut(makeEvent({ ctrlKey: true, code: 'ControlLeft' }))).toBeNull();
    expect(keyboardEventToShortcut(makeEvent({ shiftKey: true, code: 'ShiftRight' }))).toBeNull();
  });

  test('returns null for unsupported keys', () => {
    expect(keyboardEventToShortcut(makeEvent({ ctrlKey: true, code: 'MediaPlayPause' }))).toBeNull();
  });
});
