'use client';

import React from 'react';

interface FormattedArticleReaderProps {
  content: string;
}

/**
 * Parses markdown text into formatted inline elements (bold, code, math, italics)
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\$[^$]+\$|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return tokens.map((part, idx) => {
    if (!part) return null;

    // Inline code `...`
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="rounded bg-surface-1 text-fg border border-line px-1.5 py-0.5 font-mono text-xs font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Inline math $...$
    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <span
          key={idx}
          className="rounded bg-surface-2 text-fg border border-line-strong px-1.5 py-0.5 font-mono text-xs font-medium"
        >
          {part.slice(1, -1)}
        </span>
      );
    }

    // Bold **...**
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic *...*
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-fg-body">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

/**
 * Checks if a string block is a markdown table
 */
function isTableBlock(lines: string[]): boolean {
  return (
    lines.length >= 2 &&
    (lines[0]?.includes('|') ?? false) &&
    (lines[1]?.includes('|') ?? false) &&
    (lines[1]?.includes('---') ?? false)
  );
}

/**
 * Renders a markdown table into a styled HTML table
 */
function renderTable(lines: string[], key: number): React.ReactNode {
  const parseRow = (line: string) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

  const firstLine = lines[0] ?? '';
  const headers = parseRow(firstLine);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div key={key} className="my-6 overflow-x-auto rounded-xl border border-line shadow-xl">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-surface-1 border-b border-line text-fg-muted">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-bold text-xs font-mono">
                {renderInlineFormatting(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface-2">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-surface-2/5 transition">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2.5 text-fg-body font-normal leading-relaxed">
                  {renderInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const FormattedArticleReader: React.FC<FormattedArticleReaderProps> = ({ content }) => {
  const blocks = content.split('\n\n');

  const renderedElements: React.ReactNode[] = [];

  let idx = 0;
  while (idx < blocks.length) {
    const rawBlock = blocks[idx];
    if (rawBlock === undefined) {
      idx++;
      continue;
    }
    const block = rawBlock.trim();
    if (!block) {
      idx++;
      continue;
    }

    // 1. Code blocks ```...```
    if (block.startsWith('```')) {
      const codeMatch = block.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
      const codeText = codeMatch ? (codeMatch[1] ?? '') : block.replace(/^```[a-z]*\n?|```$/g, '');
      renderedElements.push(
        <div key={idx} className="my-5 rounded-2xl bg-surface-1 border border-line p-4 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-line text-xs text-fg-muted font-mono">
            <span>Terminal / invariant engine</span>
            <span>UTF-8</span>
          </div>
          <pre className="font-mono text-xs sm:text-[13px] text-fg overflow-x-auto leading-relaxed whitespace-pre">
            {codeText}
          </pre>
        </div>
      );
      idx++;
      continue;
    }

    // 2. Display Math formulas $$...$$
    if (block.startsWith('$$') && block.endsWith('$$')) {
      const mathText = block.slice(2, -2).trim();
      renderedElements.push(
        <div
          key={idx}
          className="my-5 rounded-2xl bg-surface-2 border border-line px-6 py-4 text-center font-mono text-sm sm:text-base text-fg shadow-xl overflow-x-auto"
        >
          <span className="text-xs text-fg-muted font-mono font-bold block mb-1">
            Mathematical Invariant
          </span>
          <code className="text-fg font-bold">{mathText}</code>
        </div>
      );
      idx++;
      continue;
    }

    // 3. Tables
    const blockLines = block.split('\n');
    if (isTableBlock(blockLines)) {
      renderedElements.push(renderTable(blockLines, idx));
      idx++;
      continue;
    }

    // 4. Horizontal Rule ---
    if (block === '---' || block === '***') {
      renderedElements.push(<hr key={idx} className="my-8 border-t border-line" />);
      idx++;
      continue;
    }

    // 5. Headings (##, ###, #)
    if (block.startsWith('# ')) {
      renderedElements.push(
        <h1 key={idx} className="font-display text-2xl sm:text-3xl font-normal text-fg mt-8 mb-3 tracking-tight">
          {renderInlineFormatting(block.replace(/^#\s+/, ''))}
        </h1>
      );
      idx++;
      continue;
    }

    if (block.startsWith('## ')) {
      renderedElements.push(
        <h2
          key={idx}
          className="font-display text-xl sm:text-2xl font-normal text-fg mt-8 mb-3 pb-2 border-b border-line tracking-tight flex items-center gap-2"
        >
          <span className="w-1.5 h-4 rounded-full bg-line-strong shrink-0" />
          <span>{renderInlineFormatting(block.replace(/^##\s+/, ''))}</span>
        </h2>
      );
      idx++;
      continue;
    }

    if (block.startsWith('### ')) {
      renderedElements.push(
        <h3 key={idx} className="font-display text-lg sm:text-xl font-normal text-fg mt-5 mb-2 tracking-tight">
          {renderInlineFormatting(block.replace(/^###\s+/, ''))}
        </h3>
      );
      idx++;
      continue;
    }

    // 6. Blockquote > ...
    if (block.startsWith('> ')) {
      renderedElements.push(
        <blockquote
          key={idx}
          className="my-4 border-l-4 border-line-strong bg-surface-2 pl-4 py-2.5 text-xs sm:text-sm text-fg italic rounded-r-xl font-sans"
        >
          {renderInlineFormatting(block.replace(/^>\s+/, ''))}
        </blockquote>
      );
      idx++;
      continue;
    }

    // 7. Bullet Lists or Numbered Lists
    if (block.split('\n').every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* ') || /^\d+\.\s/.test(l.trim()))) {
      const listItems = block.split('\n').filter((l) => l.trim().length > 0);
      renderedElements.push(
        <ul key={idx} className="my-4 space-y-2 pl-2">
          {listItems.map((item, itemIdx) => {
            const cleanText = item.replace(/^[-*]\s+|\d+\.\s+/, '');
            return (
              <li key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-fg-body leading-relaxed font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-fg-muted mt-2 shrink-0" />
                <span className="flex-1">{renderInlineFormatting(cleanText)}</span>
              </li>
            );
          })}
        </ul>
      );
      idx++;
      continue;
    }

    // 8. Standard Paragraph
    renderedElements.push(
      <p key={idx} className="text-xs sm:text-sm text-fg-body leading-relaxed my-3 font-normal font-sans">
        {renderInlineFormatting(block)}
      </p>
    );

    idx++;
  }

  return <div className="space-y-2">{renderedElements}</div>;
};
