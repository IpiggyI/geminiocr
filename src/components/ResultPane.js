import { useState, useEffect } from 'react';
import { Viewer } from '@bytemd/react';
import mathPlugin from '@bytemd/plugin-math';
import gfmPlugin from '@bytemd/plugin-gfm';
import highlightPlugin from '@bytemd/plugin-highlight';
import breaksPlugin from '@bytemd/plugin-breaks';
import frontmatterPlugin from '@bytemd/plugin-frontmatter';
import 'bytemd/dist/index.css';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { CopyIcon, CheckIcon, CorrectIcon, RetryIcon } from './icons';

// 配置 ByteMD 插件
const plugins = [
  mathPlugin({
    katexOptions: {
      throwOnError: false,
      output: 'html',
      strict: false,
      macros: {
        '\\f': '#1f(#2)',
      },
    },
  }),
  gfmPlugin(),
  highlightPlugin(),
  breaksPlugin(),
  frontmatterPlugin(),
];

/**
 * 识别结果区：原文/译文 tab + 图标按钮（复制/纠错）+ 加载/成功/失败三态 + 重试。
 * 复制反馈由本地 state 驱动（去 querySelector）；纠错仅作用于原文。
 */
export function ResultPane({
  results,
  translations,
  errors,
  translateErrors,
  translating,
  currentIndex,
  isLoading,
  isCorrectingText,
  onCancel,
  onCopy,
  onCorrect,
  onRetry,
  onRetryTranslate,
}) {
  const [activeTab, setActiveTab] = useState('source');
  const [copied, setCopied] = useState(false);

  const result = results[currentIndex] || '';
  const translation = (translations && translations[currentIndex]) || '';
  const error = (errors && errors[currentIndex]) || '';
  const translateError = (translateErrors && translateErrors[currentIndex]) || '';
  const isTranslating = !!(translating && translating[currentIndex]);
  const hasTranslationTab = !!translation || isTranslating || !!translateError;

  // 切换图片时回到原文 tab、复位复制反馈
  useEffect(() => {
    setActiveTab('source');
    setCopied(false);
  }, [currentIndex]);

  // 译文 tab 消失时（如切到无译文的页）回退原文
  useEffect(() => {
    if (!hasTranslationTab && activeTab === 'translation') setActiveTab('source');
  }, [hasTranslationTab, activeTab]);

  const activeContent = activeTab === 'translation' ? translation : result;

  const handleCopy = async () => {
    if (!activeContent) return;
    try {
      await onCopy(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const showTabs = result || hasTranslationTab || isLoading;

  return (
    <div className="result-section">
      <div className="result-container">
        {showTabs && (
          <div className="result-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'source'}
              className={`result-tab ${activeTab === 'source' ? 'active' : ''}`}
              onClick={() => setActiveTab('source')}
            >
              原文
            </button>
            {hasTranslationTab && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'translation'}
                className={`result-tab ${activeTab === 'translation' ? 'active' : ''}`}
                onClick={() => setActiveTab('translation')}
              >
                译文
                {isTranslating && <span className="tab-spinner" aria-label="翻译中" />}
                {translateError && !isTranslating && <span className="tab-badge" aria-label="翻译失败">⚠</span>}
              </button>
            )}
          </div>
        )}

        {!!activeContent && (
          <div className="result-actions">
            <button type="button" className={`icon-action ${copied ? 'copied' : ''}`} aria-label="复制" onClick={handleCopy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
            {activeTab === 'source' && (
              <button
                type="button"
                className="icon-action"
                aria-label="格式纠错"
                onClick={onCorrect}
                disabled={isCorrectingText}
              >
                <CorrectIcon />
                <span>{isCorrectingText ? '纠错中…' : '格式纠错'}</span>
              </button>
            )}
          </div>
        )}

        {isLoading && !result && (
          <div className="loading">
            识别中...
            <button className="cancel-button" onClick={onCancel}>
              取消
            </button>
          </div>
        )}

        {activeTab === 'source' && (
          error && !result ? (
            <div className="result-error" role="alert">
              <strong>⚠ 识别失败</strong>
              <p>{error}</p>
              <button type="button" className="retry-button" onClick={() => onRetry(currentIndex)}>
                <RetryIcon />
                重试识别
              </button>
            </div>
          ) : result ? (
            <div className="markdown-body">
              <Viewer value={result} plugins={plugins} />
            </div>
          ) : null
        )}

        {activeTab === 'translation' && (
          translateError && !translation ? (
            <div className="result-error" role="alert">
              <strong>⚠ 翻译失败</strong>
              <p>{translateError}</p>
              <button type="button" className="retry-button" onClick={() => onRetryTranslate(currentIndex)}>
                <RetryIcon />
                重试翻译
              </button>
            </div>
          ) : translation ? (
            <div className="markdown-body">
              <Viewer value={translation} plugins={plugins} />
            </div>
          ) : isTranslating ? (
            <div className="loading">翻译中...</div>
          ) : null
        )}
      </div>
    </div>
  );
}
