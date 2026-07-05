import { DEFAULT_DESKTOP_SHORTCUT } from '../desktop/desktopPreferences';
import { keyboardEventToShortcut } from '../desktop/shortcutRecorder';

const TRANSLATE_LANGUAGES = ['中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语'];

/**
 * Gemini API / 翻译 / 桌面快捷键配置弹窗
 * @param {{ ocr: object, desktop: { enabled: boolean, shortcutConfig: string, setShortcutConfig: Function, shortcutError: string, setShortcutError: Function }, onClose: Function, onSave: Function }} props
 */
export function ConfigModal({ ocr, desktop, onClose, onSave }) {
  const {
    apiUrlConfig, setApiUrlConfig,
    apiKeyConfig, setApiKeyConfig,
    modelConfig, setModelConfig,
    accessTokenConfig, setAccessTokenConfig,
    translateEnabled, setTranslateEnabled,
    translateLang, setTranslateLang,
    envConfig,
  } = ocr;
  const envGeminiApiUrl = envConfig.apiUrl;
  const envGeminiModel = envConfig.model;

  return (
    <div className="config-modal-overlay" onClick={onClose}>
      <div className="modal-content config-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>

        <h2 className="config-modal-title">
          <svg className="config-title-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0071e3"/>
                <stop offset="100%" stopColor="#6200ff"/>
              </linearGradient>
            </defs>
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="url(#gearGrad)" strokeWidth="1.5"/>
            <path d="M13.765 2.152C13.398 2 12.932 2 12 2c-.932 0-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083c-.092.223-.129.484-.143.863a1.617 1.617 0 0 1-.79 1.353 1.617 1.617 0 0 1-1.567.008c-.336-.178-.579-.276-.82-.308a2 2 0 0 0-1.478.396C4.04 5.79 3.806 6.206 3.34 7.04c-.466.834-.7 1.25-.709 1.636a2 2 0 0 0 .396 1.278c.143.19.356.363.658.614.527.437.79.655.916.93a1.617 1.617 0 0 1 0 1.004c-.127.275-.39.493-.916.93-.302.25-.515.423-.658.614a2 2 0 0 0-.396 1.278c.01.387.243.803.709 1.636.466.834.7 1.25 1.014 1.493a2 2 0 0 0 1.479.396c.24-.032.483-.13.819-.308a1.617 1.617 0 0 1 1.567.008c.483.28.77.795.79 1.353.014.38.051.64.143.863a2 2 0 0 0 1.083 1.083C10.602 22 11.068 22 12 22c.932 0 1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083c.092-.223.129-.484.143-.863.02-.558.307-1.074.79-1.353a1.617 1.617 0 0 1 1.567-.008c.336.178.579.276.819.308a2 2 0 0 0 1.479-.396c.314-.244.548-.66 1.014-1.493.466-.834.7-1.25.709-1.636a2 2 0 0 0-.396-1.278c-.143-.19-.356-.363-.658-.614-.527-.437-.79-.655-.916-.93a1.617 1.617 0 0 1 0-1.004c.127-.275.39-.493.916-.93.302-.25.515-.423.658-.614a2 2 0 0 0 .396-1.278c-.01-.387-.243-.803-.709-1.636-.466-.834-.7-1.25-1.014-1.493a2 2 0 0 0-1.479-.396c-.24.032-.483.13-.819.308a1.617 1.617 0 0 1-1.567-.008 1.617 1.617 0 0 1-.79-1.353c-.014-.38-.051-.64-.143-.863a2 2 0 0 0-1.083-1.083Z" stroke="url(#gearGrad)" strokeWidth="1.5"/>
          </svg>
          Gemini API 配置
        </h2>
        <p className="config-modal-subtitle">API URL 和 Model 留空时回落到环境变量；API Key 只使用页面填写值。</p>

        <div className="api-config-grid">
          {/* API URL 字段 */}
          <label className={`config-field${apiUrlConfig ? ' config-field--custom' : ''}`}>
            <div className="config-field-header">
              <div className="config-field-header-left">
                <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M6.5 10.5L4.5 12.5a2.121 2.121 0 1 1-3-3l2-2M9.5 5.5l2-2a2.121 2.121 0 1 1 3 3l-2 2M5.5 10.5l5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <span className="config-field-label">API URL</span>
              </div>
              <span className={`config-field-badge ${apiUrlConfig ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                {apiUrlConfig ? '自定义' : '环境变量'}
              </span>
            </div>
            <input
              type="url"
              value={apiUrlConfig}
              onChange={(e) => setApiUrlConfig(e.target.value)}
              placeholder={envGeminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta'}
              className="api-config-input"
            />
          </label>

          {/* API Key 字段 */}
          <label className={`config-field${apiKeyConfig ? ' config-field--custom' : ''}`}>
            <div className="config-field-header">
              <div className="config-field-header-left">
                <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M10 6a2.5 2.5 0 1 0-1.586 2.329L10 10h1.5v1.5H13V10h1V8.5h-4.586A2.49 2.49 0 0 0 10 6Zm-2.5 1a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="currentColor"/></svg>
                <span className="config-field-label">API Key</span>
              </div>
              <span className={`config-field-badge ${apiKeyConfig ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                {apiKeyConfig ? '自定义' : '未填写'}
              </span>
            </div>
            <input
              type="password"
              value={apiKeyConfig}
              onChange={(e) => setApiKeyConfig(e.target.value)}
              placeholder="填写自己的 Gemini API Key（直连）"
              className="api-config-input"
              autoComplete="off"
            />
          </label>

          {/* Model 字段 */}
          <label className={`config-field${modelConfig ? ' config-field--custom' : ''}`}>
            <div className="config-field-header">
              <div className="config-field-header-left">
                <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="11" cy="8" r="1" fill="currentColor"/></svg>
                <span className="config-field-label">Model</span>
              </div>
              <span className={`config-field-badge ${modelConfig ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                {modelConfig ? '自定义' : '环境变量'}
              </span>
            </div>
            <input
              type="text"
              value={modelConfig}
              onChange={(e) => setModelConfig(e.target.value)}
              placeholder={envGeminiModel || 'gemini-2.5-flash'}
              className="api-config-input"
            />
          </label>

          {/* 访问口令字段 — 仅 Web 端：未填 Key 时走内置代理需口令 */}
          {!desktop.enabled && (
            <label className={`config-field${accessTokenConfig ? ' config-field--custom' : ''}`}>
              <div className="config-field-header">
                <div className="config-field-header-left">
                  <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M8 1a3 3 0 0 0-3 3v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3Zm1.5 5h-3V4a1.5 1.5 0 0 1 3 0v2Z" fill="currentColor"/></svg>
                  <span className="config-field-label">访问口令</span>
                </div>
                <span className={`config-field-badge ${accessTokenConfig ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                  {accessTokenConfig ? '已填写' : '未填写'}
                </span>
              </div>
              <input
                type="password"
                value={accessTokenConfig}
                onChange={(e) => setAccessTokenConfig(e.target.value)}
                placeholder="未填 Key 时用访问口令走内置代理"
                className="api-config-input"
                autoComplete="off"
              />
              <span className="config-field-note">留空则需填写自己的 API Key；填写后可直接使用内置 Gemini 通道</span>
            </label>
          )}

          {desktop.enabled && (
            <label className={`config-field${desktop.shortcutConfig !== DEFAULT_DESKTOP_SHORTCUT ? ' config-field--custom' : ''}`}>
              <div className="config-field-header">
                <div className="config-field-header-left">
                  <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M3 5.25h10M3 8h10M3 10.75h10M5 3v10M8 3v10M11 3v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  <span className="config-field-label">桌面快捷键</span>
                </div>
                <span className={`config-field-badge ${desktop.shortcutConfig !== DEFAULT_DESKTOP_SHORTCUT ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                  {desktop.shortcutConfig !== DEFAULT_DESKTOP_SHORTCUT ? '自定义' : '默认'}
                </span>
              </div>
              <input
                type="text"
                value={desktop.shortcutConfig}
                onChange={() => {}}
                onKeyDown={(e) => {
                  e.preventDefault();
                  if (e.key === 'Backspace' || e.key === 'Delete') {
                    desktop.setShortcutConfig(DEFAULT_DESKTOP_SHORTCUT);
                    return;
                  }
                  const recorded = keyboardEventToShortcut(e);
                  if (recorded) desktop.setShortcutConfig(recorded);
                }}
                placeholder="点击后按下组合键"
                className="api-config-input"
                readOnly
              />
              <span className="config-field-note">点击输入框后按下组合键录制，Backspace 恢复默认 {DEFAULT_DESKTOP_SHORTCUT}</span>
              {desktop.shortcutError && (
                <span className="config-field-note config-field-note--error">{desktop.shortcutError}</span>
              )}
            </label>
          )}
        </div>

        {/* 翻译设置 */}
        <label className="config-field" style={{ marginTop: '12px' }}>
          <div className="config-field-header">
            <div className="config-field-header-left">
              <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M2 3h5M4.5 3v8M7 5c0 3-2.5 6-5 6M3 8c1.5 1.5 4 2 5.5 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 14l2.5-7L14 14M9.8 12h4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="config-field-label">识别后自动翻译</span>
            </div>
            <input
              type="checkbox"
              checked={translateEnabled}
              onChange={(e) => setTranslateEnabled(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
          </div>
          {translateEnabled && (
            <>
              <input
                type="text"
                list="translate-lang-list"
                value={translateLang}
                onChange={(e) => setTranslateLang(e.target.value)}
                placeholder="输入或选择目标语言"
                className="api-config-input"
              />
              <datalist id="translate-lang-list">
                {TRANSLATE_LANGUAGES.map(lang => (
                  <option key={lang} value={lang} />
                ))}
              </datalist>
            </>
          )}
        </label>

        {/* 环境默认值 — 结构化信息卡片 */}
        <div className="api-config-hint">
          <div className="api-config-hint-header">
            <svg className="api-config-hint-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 7v4M8 5.5v.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            环境变量默认值
          </div>
          <div className="api-config-hint-items">
            <div className="api-config-hint-item">
              <span className="api-config-hint-item-label">URL</span>
              <span className="api-config-hint-item-value" title={envGeminiApiUrl}>{envGeminiApiUrl || '未设置'}</span>
            </div>
            <div className="api-config-hint-item">
              <span className="api-config-hint-item-label">Model</span>
              <span className="api-config-hint-item-value" title={envGeminiModel}>{envGeminiModel || '未设置'}</span>
            </div>
          </div>
        </div>

        <div className="config-modal-actions">
          <button
            type="button"
            className="config-clear-button"
            onClick={() => {
              setApiUrlConfig('');
              setApiKeyConfig('');
              setModelConfig('');
              setAccessTokenConfig('');
              setTranslateEnabled(false);
              setTranslateLang('中文');
              desktop.setShortcutConfig(DEFAULT_DESKTOP_SHORTCUT);
              desktop.setShortcutError('');
            }}
          >
            清空并回落环境变量
          </button>
          <button
            type="button"
            className="config-save-button"
            onClick={onSave}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
