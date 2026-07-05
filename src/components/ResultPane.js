import { Viewer } from '@bytemd/react';
import mathPlugin from '@bytemd/plugin-math';
import gfmPlugin from '@bytemd/plugin-gfm';
import highlightPlugin from '@bytemd/plugin-highlight';
import breaksPlugin from '@bytemd/plugin-breaks';
import frontmatterPlugin from '@bytemd/plugin-frontmatter';
import 'bytemd/dist/index.css';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

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
 * 识别结果区：加载态 + 结果头（复制/纠错）+ markdown 渲染。
 * 步骤 2 为纯结构搬运，className / 行为与原 App 内联实现保持一致。
 */
export function ResultPane({
  results,
  currentIndex,
  isLoading,
  isCorrectingText,
  onCancel,
  onCopy,
  onCorrect,
}) {
  return (
    <div className="result-section">
      <div className="result-container">
        {isLoading && (
          <div className="loading">
            识别中...
            <button className="cancel-button" onClick={onCancel}>
              取消
            </button>
          </div>
        )}
        {results[currentIndex] && (
          <div className="result-text">
            <div className="result-header">
              <span>第 {currentIndex + 1} 张图片的识别结果</span>
              <div className="result-actions">
                <button className="copy-button" onClick={onCopy}>
                  复制内容
                </button>
                <button className="copy-button" onClick={onCorrect} disabled={isCorrectingText}>
                  {isCorrectingText ? '纠错中...' : '一键纠错'}
                </button>
              </div>
            </div>
            <div className="markdown-body">
              <Viewer value={results[currentIndex] || ''} plugins={plugins} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
