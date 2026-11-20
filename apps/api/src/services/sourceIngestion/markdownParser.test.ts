import { describe, expect, it } from 'vitest';
import { parseTechnicalDocument } from './markdownParser';

describe('Technical Document Markdown Parser', () => {
  it('parses hierarchical headings and detects math/code spans', () => {
    const doc = `
# FlashAttention: Fast and Memory-Efficient Exact Attention

Transformers are slow and memory-hungry on long sequences.

## 1. Introduction

Standard attention requires $O(N^2)$ memory for sequence length $N$.
We propose FlashAttention to minimize memory reads and writes.

\`\`\`python
def attention(Q, K, V):
    return softmax(Q @ K.T / sqrt(d_k)) @ V
\`\`\`

### 1.1 Memory Hierarchy

Modern GPUs feature high-bandwidth SRAM and slower HBM.
`;

    const sections = parseTechnicalDocument(doc);
    expect(sections.length).toBe(3);
    expect(sections[0].title).toBe('FlashAttention: Fast and Memory-Efficient Exact Attention');
    expect(sections[0].level).toBe(1);

    expect(sections[1].title).toBe('1. Introduction');
    expect(sections[1].level).toBe(2);
    expect(sections[1].hasMath).toBe(true);
    expect(sections[1].hasCode).toBe(true);

    expect(sections[2].title).toBe('1.1 Memory Hierarchy');
    expect(sections[2].level).toBe(3);
  });

  it('handles documents without markdown headings by providing a fallback section', () => {
    const raw = 'Just a flat technical specification without markdown headers.';
    const sections = parseTechnicalDocument(raw);
    expect(sections.length).toBe(1);
    expect(sections[0].title).toBe('Foundational Overview');
    expect(sections[0].content).toBe(raw);
  });
});
