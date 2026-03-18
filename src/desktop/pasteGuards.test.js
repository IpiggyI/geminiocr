import { shouldHandleGlobalPasteEvent } from './pasteGuards';

const createPasteEvent = (target) => ({
  target,
});

describe('shouldHandleGlobalPasteEvent', () => {
  test('handles paste on non-editable targets', () => {
    expect(shouldHandleGlobalPasteEvent(createPasteEvent(document.body))).toBe(true);
  });

  test('skips paste inside text input', () => {
    const input = document.createElement('input');
    input.type = 'text';
    expect(shouldHandleGlobalPasteEvent(createPasteEvent(input))).toBe(false);
  });

  test('skips paste inside textarea and contenteditable nodes', () => {
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');

    expect(shouldHandleGlobalPasteEvent(createPasteEvent(textarea))).toBe(false);
    expect(shouldHandleGlobalPasteEvent(createPasteEvent(editable))).toBe(false);
  });
});
