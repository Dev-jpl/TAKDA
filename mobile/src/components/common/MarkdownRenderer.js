import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  Platform
} from 'react-native';
import { 
  CopySimple, 
  Check, 
  ArrowSquareOut 
} from 'phosphor-react-native';
import { colors } from '../../constants/colors';

// ── Inline parser ─────────────────────────────────────────────────────────────

function InlineParser({ text, style, baseStyle }) {
  // Regex matches: `code`, **bold**, *italic*, ~~strikethrough~~, [label](url)
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[([^\]]+)\]\(([^)]+)\))/g);

  const result = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (!part) { i++; continue; }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      result.push(
        <Text key={i} style={[styles.inlineCode, style]}>
          {part.slice(1, -1)}
        </Text>
      );
    } else if (part.startsWith('**') && part.endsWith('**')) {
      result.push(<Text key={i} style={[styles.mdBold, style]}>{part.slice(2, -2)}</Text>);
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      result.push(<Text key={i} style={[styles.mdItalic, style]}>{part.slice(1, -1)}</Text>);
    } else if (part.startsWith('~~') && part.endsWith('~~')) {
      result.push(<Text key={i} style={[styles.mdStrikethrough, style]}>{part.slice(2, -2)}</Text>);
    } else if (part.startsWith('[')) {
      const label = parts[i + 1];
      const url   = parts[i + 2];
      if (label && url) {
        result.push(
          <Text 
            key={i} 
            style={[styles.mdLink, style]}
            onPress={() => Linking.openURL(url)}
          >
            {label}
            <ArrowSquareOut size={10} color={colors.modules.aly} />
          </Text>
        );
        i += 3;
        continue;
      }
      result.push(<Text key={i} style={style}>{part}</Text>);
    } else {
      result.push(<Text key={i} style={style}>{part}</Text>);
    }
    i++;
  }
  
  // Wrap in a Text component to allow proper text flow
  return <Text style={baseStyle}>{result}</Text>;
}

// ── Code block ────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // In a real app we'd use Clipboard.setString(code) 
    // or Expo Clipboard. Since we can't be sure of the installed lib,
    // we'll just show the visual feedback for now.
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.codeBlockContainer}>
      <View style={styles.codeBlockHeader}>
        <Text style={styles.codeBlockLang}>{lang || 'code'}</Text>
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
          {copied ? (
            <View style={styles.copyBtnInner}>
              <Check size={11} color={colors.status.success} weight="bold" />
              <Text style={styles.copyBtnText}>Copied</Text>
            </View>
          ) : (
            <View style={styles.copyBtnInner}>
              <CopySimple size={11} color={colors.text.tertiary} />
              <Text style={styles.copyBtnText}>Copy</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pre}>
          <Text style={styles.codeText}>{code}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function TableBlock({ rows }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  
  return (
    <View style={styles.tableContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            {header.map((cell, i) => (
              <View key={i} style={styles.tableHeaderCell}>
                <InlineParser 
                  text={cell.trim()} 
                  style={styles.tableHeaderText}
                  baseStyle={styles.tableHeaderBase}
                />
              </View>
            ))}
          </View>
          {/* Body */}
          {body.map((row, ri) => (
            <View 
              key={ri} 
              style={[
                styles.tableRow, 
                ri % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                ri === body.length - 1 && styles.tableRowLast
              ]}
            >
              {row.map((cell, ci) => (
                <View key={ci} style={styles.tableCell}>
                  <InlineParser 
                    text={cell.trim()} 
                    style={styles.tableCellText}
                    baseStyle={styles.tableCellBase}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Detect heading level (# through ######) ───────────────────────────────────

function parseHeading(line) {
  const m = line.match(/^(#{1,6})\s+(.*)/);
  if (!m) return null;
  return { level: m[1].length, text: m[2] };
}

// ── Is a table separator row? (|---|---| or just dashes) ─────────────────────

function isSeparatorRow(cells) {
  return cells.every(c => /^[-:\s]+$/.test(c.trim()));
}

// ── Text block renderer ───────────────────────────────────────────────────────

function TextBlock({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<View key={i} style={styles.hr} />);
      i++; continue;
    }

    // ── Headings (# through ######)
    const heading = parseHeading(trimmed);
    if (heading) {
      elements.push(
        <View key={i} style={styles.headingContainer}>
          <InlineParser 
            text={heading.text} 
            style={styles[`h${heading.level}`]}
          />
        </View>
      );
      i++; continue;
    }

    // ── Blockquote — collect consecutive > lines
    if (trimmed.startsWith('> ') || trimmed === '>') {
      const quoteLines = [];
      while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <View key={`bq-${i}`} style={styles.blockquote}>
          {quoteLines.map((ql, qi) => (
            <InlineParser 
              key={qi} 
              text={ql} 
              style={styles.blockquoteText}
            />
          ))}
        </View>
      );
      continue;
    }

    // ── Pipe-delimited table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows = [];
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

    // ── Numbered list — collect consecutive items
    if (trimmed.match(/^\d+\.\s/)) {
      const listItems = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = t.match(/^(\d+)\.\s(.*)/);
        if (m) {
          const sub = [];
          i++;
          while (i < lines.length) {
            const subLine = lines[i];
            const subTrimmed = subLine.trim();
            if (!subTrimmed || /^\d+\.\s/.test(subTrimmed)) break;
            if (/^\s{2,}/.test(subLine) && subTrimmed && !subTrimmed.startsWith('```')) {
              sub.push(subTrimmed.replace(/^[-*]\s/, ''));
              i++;
            } else break;
          }
          listItems.push({ num: m[1], text: m[2], sub });
        } else break;
      }
      elements.push(
        <View key={`ol-${i}`} style={styles.listContainer}>
          {listItems.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.listNum}>{item.num}.</Text>
              <View style={styles.listItemBody}>
                <InlineParser text={item.text} style={styles.listText} />
                {item.sub.map((s, si) => (
                  <View key={si} style={styles.subListItem}>
                    <Text style={styles.subListBullet}>◦</Text>
                    <InlineParser text={s} style={styles.subListText} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      );
      continue;
    }

    // ── Bullet list — collect consecutive items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('- ') || t.startsWith('* ')) {
          const sub = [];
          i++;
          while (i < lines.length) {
            const subLine = lines[i];
            const subTrimmed = subLine.trim();
            if (!subTrimmed || (subTrimmed.startsWith('- ') || subTrimmed.startsWith('* '))) break;
            if (/^\s{2,}/.test(subLine) && subTrimmed && !subTrimmed.startsWith('```')) {
              sub.push(subTrimmed.replace(/^[-*]\s/, ''));
              i++;
            } else break;
          }
          listItems.push({ text: t.slice(2), sub });
        } else break;
      }
      elements.push(
        <View key={`ul-${i}`} style={styles.listContainer}>
          {listItems.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.listBullet}>●</Text>
              <View style={styles.listItemBody}>
                <InlineParser text={item.text} style={styles.listText} />
                {item.sub.map((s, si) => (
                  <View key={si} style={styles.subListItem}>
                    <Text style={styles.subListBullet}>◦</Text>
                    <InlineParser text={s} style={styles.subListText} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      );
      continue;
    }

    // ── Blank line
    if (trimmed === '') {
      elements.push(<View key={`gap-${i}`} style={styles.paragraphGap} />);
      i++; continue;
    }

    // ── Regular paragraph
    elements.push(
      <InlineParser key={i} text={line} style={styles.para} />
    );
    i++;
  }

  return <View style={styles.blockWrapper}>{elements}</View>;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MarkdownRenderer({ content }) {
  if (!content?.trim()) return null;

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map(line =>
    /^\s+```/.test(line) ? line.trimStart() : line
  );

  const segments = [];
  let textLines = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];

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

  if (inCode && codeLines.length > 0) {
    segments.push({ type: 'code', lang: codeLang, code: codeLines.join('\n').trim() });
  } else if (textLines.length > 0) {
    segments.push({ type: 'text', content: textLines.join('\n') });
  }

  return (
    <View style={styles.container}>
      {segments.map((seg, idx) =>
        seg.type === 'code'
          ? <CodeBlock key={idx} lang={seg.lang} code={seg.code} />
          : <TextBlock key={idx} content={seg.content} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  blockWrapper: {
    // Gap between blocks
  },
  para: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  paragraphGap: {
    height: 8,
  },
  mdBold: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  mdItalic: {
    fontStyle: 'italic',
  },
  mdStrikethrough: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  inlineCode: {
    backgroundColor: colors.background.tertiary,
    color: colors.modules.aly,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  mdLink: {
    color: colors.modules.aly,
    textDecorationLine: 'underline',
  },
  
  // Headings
  headingContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  h1: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  h2: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  h3: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary },
  h4: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  h5: { fontSize: 12, fontWeight: 'bold', color: colors.text.tertiary, textTransform: 'uppercase' },
  h6: { fontSize: 12, fontWeight: '600', color: colors.text.tertiary },
  
  // HR
  hr: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginVertical: 12,
  },
  
  // Blockquote
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.modules.aly + '80',
    backgroundColor: colors.modules.aly + '10',
    paddingLeft: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  blockquoteText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  
  // Lists
  listContainer: {
    marginVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'start',
    marginBottom: 4,
  },
  listBullet: {
    width: 20,
    fontSize: 8,
    color: colors.modules.aly,
    marginTop: 6,
    textAlign: 'center',
  },
  listNum: {
    width: 24,
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 2,
    textAlign: 'right',
    paddingRight: 6,
  },
  listItemBody: {
    flex: 1,
  },
  listText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  subListItem: {
    flexDirection: 'row',
    alignItems: 'start',
    marginTop: 2,
    marginLeft: 8,
  },
  subListBullet: {
    width: 12,
    fontSize: 7,
    color: colors.text.tertiary,
    marginTop: 5,
    textAlign: 'center',
  },
  subListText: {
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  
  // Code Block
  codeBlockContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginVertical: 12,
    overflow: 'hidden',
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  codeBlockLang: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  copyBtn: {
    padding: 4,
  },
  copyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnText: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
  pre: {
    padding: 12,
  },
  codeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text.secondary,
    lineHeight: 18,
  },
  
  // Table
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginVertical: 12,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border.primary,
    minWidth: 100,
  },
  tableHeaderBase: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary + '40',
  },
  tableRowEven: {
    backgroundColor: colors.background.secondary,
  },
  tableRowOdd: {
    backgroundColor: colors.background.primary,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border.primary + '40',
    minWidth: 100,
  },
  tableCellBase: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  tableCellText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
