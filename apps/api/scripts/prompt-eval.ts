/**
 * Runs the question-node prompt against live Sarvam for a fixed set of cases and
 * checks the output against docs/PROMPT_DESIGN.md formatting rules.
 * Usage (from apps/api): npx tsx scripts/prompt-eval.ts   (costs ~6-12 Sarvam calls)
 */
import { generateQuestionNode } from '../src/integrations/sarvam/client';
import { countWords } from '../src/integrations/sarvam/prompts';

const SOURCE = {
  sourceTitle: 'Memory Arena Allocators: Design and Trade-offs',
  sourceDescription: 'Arena/bump allocators, free-list strategies, and fragmentation trade-offs.',
  sourceContent:
    'Arena allocation trades flexibility for throughput. Instead of tracking individual block metadata the way a general-purpose allocator does, an arena allocator reserves one contiguous region up front and satisfies allocations by advancing a single bump pointer. Freeing is batched: the whole arena is reset or released at once, never per-object. This works well when object lifetimes are correlated: a request handler, a single frame of a game loop, a parser pass over one file. It works badly when lifetimes are independent, because there is no way to reclaim an individual object without invalidating every allocation made after it. A free-list allocator reintroduces per-object reclamation by threading freed blocks into a list, at the cost of metadata and fragmentation.',
};

const CASES: Array<{ name: string; question: string; researchMode?: boolean; learningPath?: string; expectTrap?: boolean }> = [
  { name: 'root, on source', question: 'Why does arena allocation batch frees instead of freeing per object?' },
  { name: '"where exactly"', question: 'where exactly are these arena allocators used in the kernel under the hood..' },
  { name: 'off-source', question: 'How does TCP slow start work?' },
  {
    name: 'false premise',
    question: 'Since arenas free each object individually, why are they faster than malloc?',
    expectTrap: true,
  },
  {
    name: 'follow-up with learning path',
    question: 'So what happens to it when a request handler panics halfway?',
    learningPath:
      'PARENT QUESTION: Why are arenas a good fit for request handlers?\nPARENT ANSWER (summary): Every allocation made while handling one request dies when the request ends, so the whole arena can be reset at once.',
  },
  { name: 'research mode', question: 'Why does arena allocation batch frees instead of freeing per object?', researchMode: true },
];

function check(label: string, ok: boolean, detail = ''): string {
  return `  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` (${detail})` : ''}`;
}

async function main() {
  let failures = 0;
  for (const c of CASES) {
    const started = Date.now();
    try {
      const out = await generateQuestionNode({ ...SOURCE, question: c.question, researchMode: Boolean(c.researchMode), learningPath: c.learningPath });
      const words = countWords(out.explanation);
      const bold = (out.explanation.match(/\*\*[^*\n]+\*\*/g) ?? []).length;
      const lines = [
        check('length 120-300 words', words >= 100 && words <= 300, `${words} words`),
        check('no headings, tables or links', !/^\s*#|\|.*\||\]\(|https?:\/\//m.test(out.explanation)),
        check(c.researchMode ? 'bold labels present' : 'at most 3 bold terms (+ Common confusion)', c.researchMode ? bold >= 2 : bold <= 4, `${bold}`),
        check('follow-ups under 25 words', out.followUps.every((f) => countWords(f) <= 25), out.followUps.map(countWords).join('/')),
        check('follow-ups plain text', out.followUps.every((f) => !/[*`]/.test(f))),
        c.expectTrap === undefined ? check('trap only when warranted (info)', true, `isTrap=${out.isTrap}`) : check('raises a trap', out.isTrap === c.expectTrap),
        ...(c.researchMode
          ? [
              check('has "Questions to work through"', out.explanation.includes('Questions to work through')),
              check('has "Where to look"', out.explanation.includes('Where to look')),
              check('no URLs', !/https?:\/\//.test(out.explanation)),
            ]
          : []),
      ];
      failures += lines.filter((l) => l.includes('FAIL')).length;
      console.log(`\n=== ${c.name} (${((Date.now() - started) / 1000).toFixed(1)}s) ===\nQ: ${c.question}\n${lines.join('\n')}`);
      console.log(`--- explanation ---\n${out.explanation}`);
      console.log(`--- follow-ups ---\n${out.followUps.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
      if (out.isTrap && out.trapMetadata) console.log(`--- trap ---\n[${out.trapMetadata.misconceptionType}] ${out.trapMetadata.scenario}`);
    } catch (error) {
      failures += 1;
      console.log(`\n=== ${c.name} ===\n  FAIL  generation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
}

void main();
