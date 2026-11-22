export type Inline = { kind: 'text' | 'bold' | 'italic' | 'code'; value: string };
export type Block = { kind: 'p'; inlines: Inline[] } | { kind: 'ul' | 'ol'; items: Inline[][] };

const ITALIC = String.raw`(?<![\w*])\*(?![\s*])[^*\n]+?(?<![\s*])\*(?![\w*])`;
const INLINE_TOKEN = new RegExp(String.raw`(\*\*[^*\n]+?\*\*|` + '`[^`\\n]+`' + `|${ITALIC})`, 'g');
const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;
const LONG_PARAGRAPH_CHARS = 600;
const SENTENCES_PER_CHUNK = 3;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  for (const part of src.split(INLINE_TOKEN)) {
    if (!part) continue;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      out.push({ kind: 'bold', value: part.slice(2, -2).replace(/`/g, '') });
    } else if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      out.push({ kind: 'italic', value: part.slice(1, -1) });
    } else if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      out.push({ kind: 'code', value: part.slice(1, -1) });
    } else {
      out.push({ kind: 'text', value: part });
    }
  }
  return out;
}

// Older answers arrive as one unbroken paragraph; split them so they stay readable.
function splitLongParagraph(text: string): string[] {
  if (text.length <= LONG_PARAGRAPH_CHARS) return [text];
  // Split only at ". X" style boundaries (whitespace then a capital/digit/marker), so
  // abbreviations like "e.g.," never split and no text can be lost.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9*`"(])/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_CHUNK) {
    chunks.push(sentences.slice(i, i + SENTENCES_PER_CHUNK).join(' '));
  }
  return chunks;
}

export function parseRichText(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: Inline[][] } | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    paragraph = [];
    if (!text) return;
    for (const chunk of splitLongParagraph(text)) blocks.push({ kind: 'p', inlines: parseInline(chunk) });
  };
  const flushList = () => {
    if (list && list.items.length) blocks.push(list);
    list = null;
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const listKind = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null;
    if (listKind) {
      flushParagraph();
      if (!list || list.kind !== listKind) {
        flushList();
        list = { kind: listKind, items: [] };
      }
      list.items.push(parseInline(line.replace(listKind === 'ul' ? BULLET : NUMBERED, '').trim()));
      continue;
    }
    if (HEADING.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'p', inlines: [{ kind: 'bold', value: line.replace(HEADING, '').trim() }] });
      continue;
    }
    if (list) {
      // A wrapped continuation line belongs to the current list item.
      const last = list.items[list.items.length - 1];
      if (last) {
        last.push({ kind: 'text', value: ' ' }, ...parseInline(line.trim()));
        continue;
      }
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function stripRichText(src: string): string {
  return src
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(new RegExp(ITALIC, 'g'), (m) => m.slice(1, -1))
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
