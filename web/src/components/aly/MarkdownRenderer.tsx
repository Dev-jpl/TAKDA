"use client";

import React, { useState } from 'react';
import { CopySimple, Check } from '@phosphor-icons/react';

// ── Inline parser ─────────────────────────────────────────────────────────────

function InlineParser({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[([^\]]+)\]\(([^)]+)\))/g);

  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (!part) { i++; continue; }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      result.push(
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-background-tertiary border border-border-primary font-mono text-[12px] text-modules-aly">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith('**') && part.endsWith('**')) {
      result.push(<strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      result.push(<em key={i} className="italic text-text-secondary">{part.slice(1, -1)}</em>);
    } else if (part.startsWith('~~') && part.endsWith('~~')) {
      result.push(<s key={i} className="line-through text-text-tertiary">{part.slice(2, -2)}</s>);
    } else if (part.startsWith('[')) {
      const label = parts[i + 1];
      const url   = parts[i + 2];
      if (label && url) {
        result.push(
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className="text-modules-aly underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {label}
          </a>
        );
        i += 3;
        continue;
      }
      result.push(<span key={i}>{part}</span>);
    } else {
      result.push(<span key={i}>{part}</span>);
    }
    i++;
  }
  return <>{result}</>;
}

// ── Code block ────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border-primary">
      <div className="flex items-center justify-between px-4 py-1.5 bg-background-tertiary border-b border-border-primary">
        <span className="text-[10px] font-mono font-semibold text-text-tertiary uppercase tracking-wide">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-primary transition-colors"
        >
          {copied
            ? <><Check size={11} weight="bold" className="text-status-success" /> Copied</>
            : <><CopySimple size={11} /> Copy</>}
        </button>
      </div>
      <pre className="px-4 py-3 bg-background-secondary overflow-x-auto text-[12px] font-mono text-text-secondary leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function TableBlock({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border-primary">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-background-tertiary">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-text-primary border-b border-border-primary whitespace-nowrap">
                <InlineParser text={cell.trim()} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-background-secondary' : 'bg-background-primary'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-xs text-text-secondary border-b border-border-primary/40 last-of-type:border-b-0">
                  <InlineParser text={cell.trim()} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Detect heading level (# through ######) ───────────────────────────────────

function parseHeading(line: string): { level: number; text: string } | null {
  const m = line.match(/^(#{1,6})\s+(.*)/);
  if (!m) return null;
  return { level: m[1].length, text: m[2] };
}

const headingClass: Record<number, string> = {
  1: 'text-base font-bold text-text-primary mt-4 mb-1',
  2: 'text-sm font-bold text-text-primary mt-3 mb-0.5',
  3: 'text-sm font-semibold text-text-primary mt-3 mb-0.5',
  4: 'text-sm font-semibold text-text-secondary mt-2 mb-0.5',
  5: 'text-xs font-bold text-text-tertiary uppercase tracking-wide mt-2',
  6: 'text-xs font-semibold text-text-tertiary mt-2',
};

// ── Is a table separator row? (|---|---| or just dashes) ─────────────────────

function isSeparatorRow(cells: string[]): boolean {
  return cells.every(c => /^[-:\s]+$/.test(c.trim()));
}

// ── Text block renderer ───────────────────────────────────────────────────────

type Segment =
  | { type: 'code'; lang: string; code: string }
  | { type: 'text'; content: string };

function TextBlock({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line  = lines[i];
    const trimmed = line.trim();

    // ── Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={i} className="my-3 border-border-primary" />);
      i++; continue;
    }

    // ── Headings (# through ######)
    const heading = parseHeading(trimmed);
    if (heading) {
      elements.push(
        <p key={i} className={headingClass[heading.level] ?? headingClass[3]}>
          <InlineParser text={heading.text} />
        </p>
      );
      i++; continue;
    }

    // ── Blockquote — collect consecutive > lines
    if (trimmed.startsWith('> ') || trimmed === '>') {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={`bq-${i}`} className="my-2 pl-4 border-l-2 border-modules-aly/50 bg-modules-aly/5 py-2 pr-3 rounded-r-lg">
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="text-sm text-text-secondary leading-relaxed italic">
              <InlineParser text={ql} />
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // ── Pipe-delimited table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const cells = lines[i].trim().slice(1, -1).split('|');
        if (!isSeparatorRow(cells)) tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 0) {
        elements.push(<TableBlock key={`tbl-${i}`} rows={tableRows} />);
      }
      continue;
    }

    // ── Tab-separated table (LLM sometimes omits pipes)
    // Detect: 2+ consecutive lines each containing a tab, no other prose markers
    if (trimmed.includes('\t') && !trimmed.startsWith('-') && !trimmed.match(/^\d+\./)) {
      const tabRows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim().includes('\t') &&
        !lines[i].trim().startsWith('-') &&
        !isSeparatorRow(lines[i].split('\t'))
      ) {
        tabRows.push(lines[i].trim().split('\t'));
        i++;
      }
      if (tabRows.length >= 2) {
        elements.push(<TableBlock key={`ttbl-${i}`} rows={tabRows} />);
        continue;
      }
      // Fewer than 2 rows — fall through as normal text
      for (const row of tabRows) {
        elements.push(
          <p key={`tr-${i}`} className="text-sm text-text-secondary leading-relaxed">
            <InlineParser text={row.join('  ')} />
          </p>
        );
      }
      continue;
    }

    // ── Numbered list — collect consecutive items (sub-items are lines indented 2+)
    if (trimmed.match(/^\d+\.\s/)) {
      const listItems: { num: string; text: string; sub: string[] }[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = t.match(/^(\d+)\.\s(.*)/);
        if (m) {
          listItems.push({ num: m[1], text: m[2], sub: [] });
          i++;
          while (i < lines.length) {
            const subLine = lines[i];
            const subTrimmed = subLine.trim();
            if (!subTrimmed || /^\d+\.\s/.test(subTrimmed) || parseHeading(subTrimmed)) break;
            if (/^\s{2,}/.test(subLine) && subTrimmed && !subTrimmed.startsWith('```')) {
              listItems[listItems.length - 1].sub.push(subTrimmed.replace(/^[-*]\s/, ''));
              i++;
            } else break;
          }
        } else break;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex gap-2 items-start">
              <span className="text-text-tertiary shrink-0 text-sm font-medium mt-0.5 min-w-[1.2rem] text-right">{item.num}.</span>
              <div className="flex-1">
                <span className="text-sm text-text-secondary leading-relaxed"><InlineParser text={item.text} /></span>
                {item.sub.length > 0 && (
                  <ul className="mt-1 space-y-0.5 ml-2">
                    {item.sub.map((s, si) => (
                      <li key={si} className="flex gap-2 items-start">
                        <span className="text-text-tertiary shrink-0 mt-1.5 text-[7px]">◦</span>
                        <span className="text-xs text-text-tertiary leading-relaxed"><InlineParser text={s} /></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Bullet list — collect consecutive items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: { text: string; sub: string[] }[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('- ') || t.startsWith('* ')) {
          listItems.push({ text: t.slice(2), sub: [] });
          i++;
          while (i < lines.length) {
            const subLine = lines[i];
            const subTrimmed = subLine.trim();
            if (!subTrimmed || (subTrimmed.startsWith('- ') || subTrimmed.startsWith('* '))) break;
            if (/^\s{2,}/.test(subLine) && subTrimmed && !subTrimmed.startsWith('```')) {
              listItems[listItems.length - 1].sub.push(subTrimmed.replace(/^[-*]\s/, ''));
              i++;
            } else break;
          }
        } else break;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex gap-2 items-start">
              <span className="text-modules-aly shrink-0 mt-1.5 text-[8px]">●</span>
              <div className="flex-1">
                <span className="text-sm text-text-secondary leading-relaxed"><InlineParser text={item.text} /></span>
                {item.sub.length > 0 && (
                  <ul className="mt-1 space-y-0.5 ml-2">
                    {item.sub.map((s, si) => (
                      <li key={si} className="flex gap-2 items-start">
                        <span className="text-text-tertiary shrink-0 mt-1.5 text-[7px]">◦</span>
                        <span className="text-xs text-text-tertiary leading-relaxed"><InlineParser text={s} /></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Blank line
    if (trimmed === '') {
      elements.push(<div key={`gap-${i}`} className="h-1.5" />);
      i++; continue;
    }

    // ── Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-text-secondary leading-relaxed">
        <InlineParser text={line} />
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content?.trim()) return null;

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Pre-process: un-indent code fences so they're always detected at the top level.
  // This handles LLMs that put code blocks inside list items with indentation.
  const lines = normalized.split('\n').map(line =>
    /^\s+```/.test(line) ? line.trimStart() : line
  );

  const segments: Segment[] = [];
  let textLines: string[] = [];
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];

  for (const line of lines) {
    const fenceMatch = line.match(/^```(\w*)$/);
    if (fenceMatch && !inCode) {
      if (textLines.length > 0) {
        segments.push({ type: 'text', content: textLines.join('\n') });
        textLines = [];
      }
      inCode = true;
      codeLang = fenceMatch[1] || '';
    } else if (line.trim() === '```' && inCode) {
      segments.push({ type: 'code', lang: codeLang, code: codeLines.join('\n').trim() });
      codeLines = [];
      inCode = false;
      codeLang = '';
    } else if (inCode) {
      codeLines.push(line);
    } else {
      textLines.push(line);
    }
  }

  // Flush — unclosed code fence still renders as a code block
  if (inCode && codeLines.length > 0) {
    segments.push({ type: 'code', lang: codeLang, code: codeLines.join('\n').trim() });
  } else if (textLines.length > 0) {
    segments.push({ type: 'text', content: textLines.join('\n') });
  }

  return (
    <div className="space-y-0.5">
      {segments.map((seg, idx) =>
        seg.type === 'code'
          ? <CodeBlock key={idx} lang={seg.lang} code={seg.code} />
          : <TextBlock key={idx} content={seg.content} />
      )}
    </div>
  );
}
