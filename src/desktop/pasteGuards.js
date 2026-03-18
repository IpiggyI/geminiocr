const EDITABLE_SELECTOR = 'input, textarea, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';

const isEditableTarget = (target) => {
  if (!(target instanceof Element)) return false;
  if (target.matches(EDITABLE_SELECTOR)) return true;
  if (target.closest(EDITABLE_SELECTOR)) return true;
  return target.isContentEditable;
};

export const shouldHandleGlobalPasteEvent = (event) => !isEditableTarget(event?.target);
