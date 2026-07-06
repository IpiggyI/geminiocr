import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../icons';

/**
 * API 配置组：URL / Key / Model（+ Web 端访问口令）
 * 留空的 URL / Model 回落环境变量；API Key 只使用页面填写值。
 * @param {{
 *   ocr: object,
 *   desktopMode: boolean,
 *   keyInputRef?: import('react').RefObject<HTMLInputElement>,
 * }} props
 */
export function ApiSection({ ocr, desktopMode, keyInputRef }) {
  const {
    apiUrlConfig, setApiUrlConfig,
    apiKeyConfig, setApiKeyConfig,
    modelConfig, setModelConfig,
    accessTokenConfig, setAccessTokenConfig,
    envConfig,
  } = ocr;
  const [keyVisible, setKeyVisible] = useState(false);

  return (
    <section className="settings-section" aria-label="API 配置">
      <h2 className="settings-section-title">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 10.5L4.5 12.5a2.121 2.121 0 1 1-3-3l2-2M9.5 5.5l2-2a2.121 2.121 0 1 1 3 3l-2 2M5.5 10.5l5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        API
      </h2>

      <div className="settings-fields">
        {/* API URL */}
        <div className="config-field">
          <div className="config-field-header">
            <div className="config-field-header-left">
              <svg className="config-field-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 10.5L4.5 12.5a2.121 2.121 0 1 1-3-3l2-2M9.5 5.5l2-2a2.121 2.121 0 1 1 3 3l-2 2M5.5 10.5l5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span className="config-field-label">API URL</span>
            </div>
          </div>
          <input
            type="url"
            value={apiUrlConfig}
            onChange={(e) => setApiUrlConfig(e.target.value)}
            placeholder={envConfig.apiUrl || 'https://generativelanguage.googleapis.com/v1beta'}
            className="api-config-input"
            aria-label="API URL"
          />
          <span className="config-source-note">
            {apiUrlConfig ? '当前生效：页面配置' : `当前生效：环境变量（${envConfig.apiUrl || '未设置'}）`}
          </span>
        </div>

        {/* API Key — 带可见性切换 */}
        <div className="config-field">
          <div className="config-field-header">
            <div className="config-field-header-left">
              <svg className="config-field-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 6a2.5 2.5 0 1 0-1.586 2.329L10 10h1.5v1.5H13V10h1V8.5h-4.586A2.49 2.49 0 0 0 10 6Zm-2.5 1a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="currentColor"/></svg>
              <span className="config-field-label">API Key</span>
            </div>
          </div>
          <div className="api-key-input-wrap">
            <input
              ref={keyInputRef}
              type={keyVisible ? 'text' : 'password'}
              value={apiKeyConfig}
              onChange={(e) => setApiKeyConfig(e.target.value)}
              placeholder="填写自己的 Gemini API Key（直连）"
              className="api-config-input api-config-input--with-toggle"
              autoComplete="off"
              aria-label="API Key"
            />
            <button
              type="button"
              className="api-key-toggle"
              aria-pressed={keyVisible}
              aria-label={keyVisible ? '隐藏 API Key' : '显示 API Key'}
              onClick={() => setKeyVisible((v) => !v)}
            >
              {keyVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <span className="config-source-note">
            {apiKeyConfig ? '当前生效：页面填写的 Key' : '未填写 · 识别时若无内置通道会提示缺少 API Key'}
          </span>
        </div>

        {/* Model */}
        <div className="config-field">
          <div className="config-field-header">
            <div className="config-field-header-left">
              <svg className="config-field-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="11" cy="8" r="1" fill="currentColor"/></svg>
              <span className="config-field-label">Model</span>
            </div>
          </div>
          <input
            type="text"
            value={modelConfig}
            onChange={(e) => setModelConfig(e.target.value)}
            placeholder={envConfig.model || 'gemini-2.5-flash'}
            className="api-config-input"
            aria-label="Model"
          />
          <span className="config-source-note">
            {modelConfig ? '当前生效：页面配置' : `当前生效：环境变量（${envConfig.model || '未设置'}）`}
          </span>
        </div>

        {/* 访问口令 — 仅 Web 端：未填 Key 时走内置代理需口令 */}
        {!desktopMode && (
          <div className="config-field">
            <div className="config-field-header">
              <div className="config-field-header-left">
                <svg className="config-field-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1a3 3 0 0 0-3 3v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3Zm1.5 5h-3V4a1.5 1.5 0 0 1 3 0v2Z" fill="currentColor"/></svg>
                <span className="config-field-label">访问口令</span>
              </div>
            </div>
            <input
              type="password"
              value={accessTokenConfig}
              onChange={(e) => setAccessTokenConfig(e.target.value)}
              placeholder="未填 Key 时用访问口令走内置代理"
              className="api-config-input"
              autoComplete="off"
              aria-label="访问口令"
            />
            <span className="config-source-note">
              {accessTokenConfig ? '当前生效：内置 Gemini 通道（访问口令）' : '留空则需填写自己的 API Key'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
