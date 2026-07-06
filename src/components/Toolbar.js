import { TRANSLATE_LANGUAGES } from '../lib/ocr/translateLanguages';
import { UploadIcon, PasteIcon, LinkIcon, ClearIcon, TranslateIcon, SettingsIcon } from './icons';

/**
 * 有图态顶部工具条：图标操作（上传/粘贴/链接/清除）+ 自动翻译开关/目标语言 + 设置入口。
 * 「链接」展开时在工具条下方内联 url 输入行。
 */
export function Toolbar({
  onPickFile,
  onPaste,
  onToggleUrlInput,
  onClear,
  showUrlInput,
  translateEnabled,
  onToggleTranslate,
  translateLang,
  onChangeLang,
  onOpenConfig,
  imageUrl,
  onImageUrlChange,
  onUrlSubmit,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="toolbar-actions">
          <button type="button" className="icon-btn" aria-label="上传" onClick={onPickFile}>
            <UploadIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="粘贴" onClick={onPaste}>
            <PasteIcon />
          </button>
          <button
            type="button"
            className={`icon-btn ${showUrlInput ? 'is-active' : ''}`}
            aria-label="使用链接"
            aria-pressed={showUrlInput}
            onClick={onToggleUrlInput}
          >
            <LinkIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="清除" onClick={onClear}>
            <ClearIcon />
          </button>
        </div>

        <div className="toolbar-translate">
          <button
            type="button"
            role="switch"
            aria-checked={translateEnabled}
            className={`translate-toggle ${translateEnabled ? 'on' : ''}`}
            onClick={onToggleTranslate}
          >
            <TranslateIcon />
            <span>自动翻译</span>
          </button>
          {translateEnabled && (
            <>
              <input
                type="text"
                list="toolbar-lang-list"
                value={translateLang}
                onChange={onChangeLang}
                placeholder="目标语言"
                aria-label="目标语言"
                className="lang-select"
              />
              <datalist id="toolbar-lang-list">
                {TRANSLATE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} />
                ))}
              </datalist>
            </>
          )}
        </div>

        <button type="button" className="icon-btn" aria-label="打开设置" onClick={onOpenConfig}>
          <SettingsIcon />
        </button>
      </div>

      {showUrlInput && (
        <form onSubmit={onUrlSubmit} className="url-form toolbar-url">
          <input
            type="url"
            value={imageUrl}
            onChange={onImageUrlChange}
            placeholder="请输入图片链接"
            className="url-input"
          />
          <button type="submit" className="url-submit">
            确认
          </button>
        </form>
      )}
    </div>
  );
}
