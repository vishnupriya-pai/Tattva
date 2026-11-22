import { describe, expect, it } from 'vitest';
import { parseInline, parseRichText, stripRichText } from './rich-text';

describe('parseInline', () => {
  it('splits bold and code from plain text', () => {
    expect(parseInline('Use **slab** caches via `kmalloc` here')).toEqual([
      { kind: 'text', value: 'Use ' },
      { kind: 'bold', value: 'slab' },
      { kind: 'text', value: ' caches via ' },
      { kind: 'code', value: 'kmalloc' },
      { kind: 'text', value: ' here' },
    ]);
  });

  it('parses single-asterisk italics but not multiplication or stray stars', () => {
    expect(parseInline('the *symptom* not the cause')).toEqual([
      { kind: 'text', value: 'the ' },
      { kind: 'italic', value: 'symptom' },
      { kind: 'text', value: ' not the cause' },
    ]);
    expect(parseInline('a * b * c')).toEqual([{ kind: 'text', value: 'a * b * c' }]);
    expect(parseInline('x*y*z')).toEqual([{ kind: 'text', value: 'x*y*z' }]);
  });

  it('leaves an unmatched ** as literal text', () => {
    expect(parseInline('a ** b')).toEqual([{ kind: 'text', value: 'a ** b' }]);
  });

  it('treats HTML as plain text', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([{ kind: 'text', value: '<script>alert(1)</script>' }]);
  });
});

describe('parseRichText', () => {
  it('returns no blocks for empty input', () => {
    expect(parseRichText('   \n\n')).toEqual([]);
  });

  it('separates paragraphs on blank lines and joins wrapped lines', () => {
    const blocks = parseRichText('First line\ncontinues.\n\nSecond paragraph.');
    expect(blocks).toEqual([
      { kind: 'p', inlines: [{ kind: 'text', value: 'First line continues.' }] },
      { kind: 'p', inlines: [{ kind: 'text', value: 'Second paragraph.' }] },
    ]);
  });

  it('parses bullet and numbered lists as separate blocks', () => {
    const blocks = parseRichText('Intro:\n- one\n* two\n\n1. first\n2) second');
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'ul', 'ol']);
    expect(blocks[1]).toEqual({
      kind: 'ul',
      items: [[{ kind: 'text', value: 'one' }], [{ kind: 'text', value: 'two' }]],
    });
    expect(blocks[2]?.kind === 'ol' && blocks[2].items).toHaveLength(2);
  });

  it('renders headings as bold paragraphs', () => {
    expect(parseRichText('## Where it is used')).toEqual([
      { kind: 'p', inlines: [{ kind: 'bold', value: 'Where it is used' }] },
    ]);
  });

  it('chunks a long single paragraph into several paragraphs', () => {
    const sentence = 'Arena allocators reserve one region and advance a bump pointer through it quickly. ';
    const blocks = parseRichText(sentence.repeat(12));
    expect(blocks.length).toBe(4);
    expect(blocks.every((b) => b.kind === 'p')).toBe(true);
  });
});

describe('long paragraph chunking', () => {
  it('never drops text around abbreviations like "e.g.,"', () => {
    const text =
      'Arena allocators appear where lifetimes correlate. In the Linux kernel, the slab layer reserves pages for a cache (e.g., `kmalloc` objects, `dentry` structures, or `inode` caches), and advances through them. '.repeat(4) +
      'Windows pools behave differently. Per-CPU reserves are another case.';
    const rejoined = parseRichText(text)
      .flatMap((b) => (b.kind === 'p' ? b.inlines : []))
      .map((i) => (i.kind === 'code' ? '`' + i.value + '`' : i.value))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    expect(rejoined.replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
  });

  it('drops code backticks inside bold', () => {
    expect(parseInline("**the `kmalloc` fast path**")).toEqual([{ kind: 'bold', value: 'the kmalloc fast path' }]);
  });
});

describe('stripRichText', () => {
  it('removes markdown markers for plain-text contexts', () => {
    expect(stripRichText('## Title\n- **bold** and `code`\n1. step')).toBe('Title bold and code step');
  });
});
