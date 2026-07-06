import { useEffect } from 'react';
import { BackIcon, SettingsIcon } from '../icons';
import { ApiSection } from './ApiSection';
import { PromptsSection } from './PromptsSection';
import { DesktopSection } from './DesktopSection';

/**
 * 独立设置视图（替代玻璃态弹窗）。
 * 主界面状态由 App 层持有，切到设置不卸载，返回后识别结果保留。
 * @param {{
 *   ocr: object,
 *   desktopMode: boolean,
 *   desktop: { shortcutConfig: string, shortcutError: string, applyShortcut: (s: string) => void },
 *   keyInputRef?: import('react').RefObject<HTMLInputElement>,
 *   onBack: () => void,
 *   onReset: () => void,
 * }} props
 */
export function SettingsView({ ocr, desktopMode, desktop, keyInputRef, onBack, onReset }) {
  // Esc 返回主界面
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onBack]);

  return (
    <div className="settings-view">
      <div className="settings-topbar">
        <button type="button" className="settings-back" onClick={onBack} aria-label="返回主界面">
          <BackIcon />
          <span>返回</span>
        </button>
      </div>

      <h1 className="settings-title">
        <SettingsIcon />
        设置
      </h1>

      <div className="settings-sections">
        <ApiSection ocr={ocr} desktopMode={desktopMode} keyInputRef={keyInputRef} />
        <PromptsSection ocr={ocr} />
        {desktopMode && (
          <DesktopSection
            shortcut={desktop.shortcutConfig}
            error={desktop.shortcutError}
            onChange={desktop.applyShortcut}
            translateLang={ocr.translateLang}
            onTranslateLangChange={(e) => ocr.setTranslateLang(e.target.value)}
          />
        )}
      </div>

      <div className="settings-footer">
        <button type="button" className="settings-reset" onClick={onReset}>
          清空并回落环境变量
        </button>
      </div>
    </div>
  );
}
