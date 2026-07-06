/**
 * 单条提示词字段：多行文本框 + 恢复默认 + 占位符说明。
 * 空串即回落内置默认（由 useOcrSession/resolvePrompt 处理）。
 */
function PromptField({ label, value, onChange, onReset, placeholder, hint }) {
  return (
    <div className="config-field">
      <div className="config-field-header">
        <div className="config-field-header-left">
          <span className="config-field-label">{label}</span>
        </div>
        <button
          type="button"
          className="prompt-reset"
          onClick={onReset}
          disabled={!value}
        >
          恢复默认
        </button>
      </div>
      <textarea
        className="prompt-textarea"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        aria-label={label}
      />
      <span className="config-source-note">{hint}</span>
    </div>
  );
}

/**
 * 提示词配置组：OCR / 翻译 / 纠错三条自定义提示词。
 * @param {{ ocr: object }} props
 */
export function PromptsSection({ ocr }) {
  const {
    ocrPromptConfig, setOcrPromptConfig,
    translatePromptConfig, setTranslatePromptConfig,
    correctionPromptConfig, setCorrectionPromptConfig,
  } = ocr;

  return (
    <section className="settings-section" aria-label="提示词">
      <h2 className="settings-section-title">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 2.5h6l2.5 2.5v8.5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 2.5V5h2.5M5.5 8h5M5.5 10.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        提示词
      </h2>

      <div className="settings-fields">
        <PromptField
          label="OCR 识别"
          value={ocrPromptConfig}
          onChange={(e) => setOcrPromptConfig(e.target.value)}
          onReset={() => setOcrPromptConfig('')}
          placeholder="留空使用内置 OCR 提示词（含数学公式与表格 Markdown 规范）"
          hint="留空即用内置默认。识别每张图片时作为提示词发送。"
        />
        <PromptField
          label="翻译"
          value={translatePromptConfig}
          onChange={(e) => setTranslatePromptConfig(e.target.value)}
          onReset={() => setTranslatePromptConfig('')}
          placeholder="留空使用内置翻译提示词"
          hint="可用占位符：{lang} 目标语言、{content} 待翻译文本；缺省时自动追加原文。"
        />
        <PromptField
          label="纠错"
          value={correctionPromptConfig}
          onChange={(e) => setCorrectionPromptConfig(e.target.value)}
          onReset={() => setCorrectionPromptConfig('')}
          placeholder="留空使用内置纠错提示词"
          hint="可用占位符：{content} 待纠错文本；缺省时自动追加原文。"
        />
      </div>
    </section>
  );
}
