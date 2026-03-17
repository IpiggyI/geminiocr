/**
 * 对 OCR 识别结果进行后处理：
 * - 保护表格内容不被破坏
 * - 标准化 LaTeX 分隔符（\( \) → $ $，\[ \] → $$ $$）
 * - 移除 Markdown 代码围栏
 * - 规范公式前后的空行
 */
export const preprocessText = (text) => {
  if (!text) return '';

  // 临时保存表格内容
  const tables = [];
  text = text.replace(/(\|[^\n]+\|\n\|[-|\s]+\|\n\|[^\n]+\|(\n|$))+/g, (match) => {
    tables.push(match);
    return `__TABLE_${tables.length - 1}__`;
  });

  // 标准化数学公式分隔符（Gemini 输出的双反斜杠形式 \\( \\) \\[ \\]）
  text = text.replace(/\\\\\(/g, '$');
  text = text.replace(/\\\\\)/g, '$');
  text = text.replace(/\\\\\[/g, '$$');
  text = text.replace(/\\\\\]/g, '$$');

  // 移除代码围栏及语言标识
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.slice(3, -3).trim();
  });
  text = text.replace(/```\w*\n?/g, '');

  // 处理数字序号后的换行问题
  text = text.replace(/(\d+)\.\s*\n+/g, '$1. ');

  // 处理块级公式的格式
  text = text.replace(/\n*\$\$\s*([\s\S]*?)\s*\$\$\n*/g, (_match, formula) => {
    return `\n\n$$${formula.trim()}$$\n\n`;
  });

  // 处理行内公式的格式
  text = text.replace(/\$\s*(.*?)\s*\$/g, (_match, formula) => {
    return `$${formula.trim()}$`;
  });

  // 处理数字序号和公式之间的格式
  text = text.replace(/(\d+\.)\s*(\$\$[\s\S]*?\$\$)/g, '$1\n\n$2');

  // 处理多余的空行
  text = text.replace(/\n{3,}/g, '\n\n');

  // 还原表格内容
  text = text.replace(/__TABLE_(\d+)__/g, (_match, index) => {
    return tables[parseInt(index)];
  });

  return text.trim();
};
