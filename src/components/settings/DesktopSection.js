import { DEFAULT_DESKTOP_SHORTCUT } from '../../desktop/desktopPreferences';
import { keyboardEventToShortcut } from '../../desktop/shortcutRecorder';
import { TRANSLATE_LANGUAGES } from '../../lib/ocr/translateLanguages';

/**
 * 桌面配置组（仅 isTauri 渲染）：全局快捷键录制 + 默认翻译语言。
 * 录制到合法组合键即调用 onChange 即时注册；Backspace/Delete 恢复默认。
 * @param {{
 *   shortcut: string,
 *   error: string,
 *   onChange: (shortcut: string) => void,
 *   translateLang: string,
 *   onTranslateLangChange: (e: import('react').ChangeEvent<HTMLInputElement>) => void,
 * }} props
 */
export function DesktopSection({ shortcut, error, onChange, translateLang, onTranslateLangChange }) {
  return (
    <section className="settings-section" aria-label="桌面配置">
      <h2 className="settings-section-title">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 14.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        桌面
      </h2>

      <div className="settings-fields">
        <div className="config-field">
          <div className="config-field-header">
            <div className="config-field-header-left">
              <svg className="config-field-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 5.25h10M3 8h10M3 10.75h10M5 3v10M8 3v10M11 3v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              <span className="config-field-label">全局快捷键</span>
            </div>
          </div>
          <input
            type="text"
            value={shortcut}
            onChange={() => {}}
            onKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation(); // 录制中 Esc 不冒泡到 SettingsView 退出监听
              if (e.key === 'Backspace' || e.key === 'Delete') {
                onChange(DEFAULT_DESKTOP_SHORTCUT);
                return;
              }
              const recorded = keyboardEventToShortcut(e);
              if (recorded) onChange(recorded);
            }}
            placeholder="点击后按下组合键"
            className="api-config-input"
            aria-label="全局快捷键"
            readOnly
          />
          <span className="config-source-note">
            点击输入框后按下组合键录制，Backspace 恢复默认 {DEFAULT_DESKTOP_SHORTCUT}
          </span>
          {error && <span className="config-field-note config-field-note--error">{error}</span>}
        </div>

        <div className="config-field">
          <div className="config-field-header">
            <div className="config-field-header-left">
              <svg className="config-field-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 3.5h6M4.5 3.5v7.5M7 5.5c0 3-2.5 5.5-5 5.5M3 7.5c1.5 1.5 4 2 5.5 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 14l2.5-6.5L14 14M9.8 12h4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="config-field-label">默认翻译语言</span>
            </div>
          </div>
          <input
            type="text"
            list="settings-translate-lang-list"
            value={translateLang}
            onChange={onTranslateLangChange}
            placeholder="输入或选择目标语言"
            className="api-config-input"
            aria-label="默认翻译语言"
          />
          <datalist id="settings-translate-lang-list">
            {TRANSLATE_LANGUAGES.map((lang) => (
              <option key={lang} value={lang} />
            ))}
          </datalist>
          <span className="config-source-note">识别后自动翻译使用的目标语言，跨会话记忆。</span>
        </div>
      </div>
    </section>
  );
}
