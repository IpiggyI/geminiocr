export const DEFAULT_DESKTOP_SHORTCUT = 'CommandOrControl+Shift+O';
export const DESKTOP_SHORTCUT_STORAGE_KEY = 'desktop-shortcut-config';

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
};

export const normalizeDesktopShortcut = (value) => {
  const normalized = (value || '')
    .split('+')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('+');

  return normalized || DEFAULT_DESKTOP_SHORTCUT;
};

export const loadDesktopShortcut = () => {
  const storage = getStorage();
  return normalizeDesktopShortcut(storage?.getItem(DESKTOP_SHORTCUT_STORAGE_KEY) || '');
};

export const saveDesktopShortcut = (value) => {
  const normalized = normalizeDesktopShortcut(value);
  const storage = getStorage();

  if (storage) {
    if (normalized === DEFAULT_DESKTOP_SHORTCUT) {
      storage.removeItem(DESKTOP_SHORTCUT_STORAGE_KEY);
    } else {
      storage.setItem(DESKTOP_SHORTCUT_STORAGE_KEY, normalized);
    }
  }

  return normalized;
};
