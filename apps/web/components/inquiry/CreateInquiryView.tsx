'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Sparkles,
  FileText,
  Network,
  Cpu,
  Database,
  Layers,
  Check,
  Loader2,
} from 'lucide-react';
import { DEMO_LEARNING_SOURCE_ID } from '../../lib/workspace-bootstrap';

export const GENERAL_LEARNING_SOURCE_ID = '33333333-3333-4333-8333-333333333333';
export const ATTENTION_LEARNING_SOURCE_ID = '22222222-2222-4222-8222-222222222222';

export function deriveTitleFromQuestion(q: string): string {
  const trimmed = q.trim();
  if (!trimmed) return '';
  const firstLine = trimmed.split('\n')[0]?.trim() ?? trimmed;
  let clean = firstLine
    .replace(/^(what is|what are|how does|how do|explain|describe|analyze|why does|why do|can you explain|compare|evaluate)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
  if (clean.length > 65) {
    clean = clean.slice(0, 62) + '…';
  }
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

export interface CreateInquiryViewProps {
  initialQuestion?: string;
  initialSourceId?: string;
  onCreateInquiry: (payload: {
    question: string;
    learningSourceId: string;
    title: string;
    researchMode: boolean;
  }) => void;
  onIngestDocument?: (payload: {
    title: string;
    content: string;
    sourceType: 'document' | 'video' | 'transcript';
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const PRESET_PAPERS = [
  {
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    category: 'Deep Learning Systems',
    icon: Cpu,
    summary: 'Tri Dao et al. (NeurIPS 2022) — Tiling GPU SRAM/HBM to avoid O(N²) intermediate attention matrix materialization.',
    content: `# FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Ré (Stanford University, 2022)

## 1. Introduction and Hardware Motivation
Transformers have become the standard architecture in NLP and computer vision. However, self-attention scales quadratically with sequence length $N$. The standard attention computation:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

requires materializing the $N \\times N$ attention matrix $S = QK^T$ and $P = \\text{softmax}(S)$ in GPU High-Bandwidth Memory (HBM).

On modern GPUs (such as NVIDIA A100), compute throughput (312 TFLOPs FP16) far outpaces memory bandwidth (1.5–2.0 TB/s). Standard attention is therefore memory-bound (HBM I/O bottlenecked), spending the vast majority of wall-clock time reading and writing $O(N^2)$ matrices to global DRAM rather than performing tensor core GEMM math.

## 2. IO-Aware Tiling Algorithm
FlashAttention overcomes this memory bottleneck by tiling the inputs $Q, K, V$ into blocks that fit entirely inside fast on-chip SRAM (192 KB per Streaming Multiprocessor), computing attention with respect to each block, and accumulating the outputs without ever writing the large $N \\times N$ intermediate matrices to HBM.

The key challenge in tiling softmax across blocks is that softmax requires a global normalizer:
$$m(x) = \\max_i x_i, \\quad \\ell(x) = \\sum_i e^{x_i - m(x)}, \\quad \\text{softmax}(x)_i = \\frac{e^{x_i - m(x)}}{\\ell(x)}$$

FlashAttention uses a continuous online softmax scaling trick: when transitioning from block $j$ to block $j+1$, the partial accumulator $O^{(j)}$ is rescaled by $e^{m^{(j)} - m^{(j+1)}}$, preserving mathematical exactness while maintaining $O(N)$ auxiliary memory overhead.

## 3. Backward Pass Recomputation
To calculate gradients without saving the $O(N^2)$ attention weights $P$, FlashAttention does not store $P$ during forward propagation. Instead, it stores only the forward softmax statistics $(m, \\ell)$ of size $O(N)$, and recomputes the block attention scores $S$ directly in fast SRAM during the backward pass.

This trades extra FLOPs in SRAM for drastically reduced HBM reads and writes, achieving 2-4x speedups over standard PyTorch attention with strictly exact outputs.`,
  },
  {
    title: 'In Search of an Understandable Consensus Algorithm (Raft)',
    category: 'Distributed Systems',
    icon: Network,
    summary: 'Diego Ongaro & John Ousterhout (USENIX ATC 2014) — Decomposed leader election, log replication, and safety invariants.',
    content: `# In Search of an Understandable Consensus Algorithm (Extended Version)
Diego Ongaro and John Ousterhout (Stanford University, 2014)

## 1. Introduction to Distributed Consensus
Consensus algorithms allow a collection of machines to work as a coherent group that can survive the failures of some of its members. Paxos has dominated the discussion of consensus algorithms over the last two decades. Unfortunately, Paxos is notoriously difficult to understand, despite numerous attempts to explain it.

Raft decomposes the consensus problem into three relatively independent subproblems:
1. Leader Election: A new leader must be chosen when an existing leader fails.
2. Log Replication: The leader must accept log entries from clients and replicate them across the cluster, forcing the other logs to agree with its own.
3. Safety: If any server has applied a particular log entry to its state machine, then no other server may apply a different log entry for the same log index.

## 2. Leader Election and Terms
Raft divides time into terms of arbitrary length, numbered with consecutive integers. Each term begins with an election, in which one or more candidates attempt to become leader. If a candidate wins the election, then it serves as leader for the rest of the term.

Servers start in the follower state. If a follower receives no communication over an election timeout, it assumes there is no viable leader and begins an election by incrementing its term and transitioning to the candidate state. It votes for itself and issues RequestVote RPCs in parallel to each of the other servers in the cluster.

A candidate wins an election if it receives votes from a majority of the servers in the full cluster for the same term. Each server will vote for at most one candidate in a given term, on a first-come-first-served basis.

## 3. Log Matching and State Machine Safety Invariant
Once a leader has been elected, it begins servicing client requests. Each client request contains a command to be executed by the replicated state machines. The leader appends the command to its log as a new entry, then issues AppendEntries RPCs in parallel to each of the other servers to replicate the entry.

Raft guarantees the Log Matching Property:
- If two entries in different logs have the same index and term, then they store the same command.
- If two entries in different logs have the same index and term, then their logs are identical in all preceding entries.

The Leader Completeness Property ensures that if a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms. A voter denies its vote if its own log is more up-to-date than that of the candidate, preventing uncommitted leaders from overwriting committed history.`,
  },
  {
    title: 'The Log-Structured Merge-Tree (LSM-Tree) Architecture',
    category: 'Database Engines',
    icon: Database,
    summary: 'Patrick O\'Neil et al. (1996) — Append-only writes, in-memory MemTables, and background compaction trade-offs.',
    content: `# The Log-Structured Merge-Tree (LSM-Tree)
Patrick O'Neil, Edward O'Neil, Gerhard Weikum (1996)

## 1. The Disk I/O Write Bottleneck
Traditional database index structures such as B-Trees maintain index nodes in-place on persistent storage. For update-intensive workloads, random in-place disk overwrites suffer from high disk seek times and write amplification, as writing a small key requires reading and rewriting an entire page (e.g. 4KB or 16KB).

The Log-Structured Merge-Tree (LSM-Tree) solves this bottleneck by deferring and batching index modifications, transforming random writes into high-throughput sequential writes.

## 2. Dual-Component Architecture: MemTable and SSTables
An LSM-tree is composed of two or more tree-like component structures:
1. $C_0$ Component (MemTable): An in-memory sorted structure (typically a SkipList or Red-Black Tree) paired with an append-only Write-Ahead Log (WAL) on disk for durability. All inserts, updates, and deletes (tombstones) are applied directly to $C_0$.
2. $C_1$ through $C_k$ Components (SSTables): Immutable, sorted disk files containing sorted key-value pairs along with block indexes and Bloom filters.

When $C_0$ reaches a configurable threshold capacity (e.g. 64MB), it is frozen into an immutable MemTable and flushed sequentially to disk at Level 0 ($L_0$) as an SSTable. Because writes are sequential, disk head movement is minimized and write bandwidth approaches hardware sequential limits.

## 3. Compaction and Amplification Trade-offs
Because SSTables are immutable, deleted keys and obsolete updates accumulate across levels. An ongoing background process known as Compaction reads sorted SSTables from level $L_i$ and merges them with overlapping SSTables in level $L_{i+1}$, discarding overwritten values and tombstones.

LSM-trees accept fundamental trade-offs:
- Write Amplification: Data is rewritten multiple times during background merge compactions.
- Read Amplification: A single point query may need to check the MemTable and multiple SSTable levels (mitigated by in-memory Bloom filters).
- Space Amplification: Uncompacted duplicate updates and tombstones temporarily consume excess disk capacity.`,
  },
];

const CURATED_SOURCES = [
  {
    id: GENERAL_LEARNING_SOURCE_ID,
    title: 'Custom Engineering & Systems Inquiry',
    duration: '40 min',
    sourceType: 'document',
    topic: 'Any CS, AI, or Engineering Topic',
    description: 'Explore any technical domain (databases, operating systems, networking, algorithms, distributed systems) with its own isolated knowledge graph and dedicated context.',
    sampleQuestion: 'How do LSM-Trees achieve high write throughput compared to B-Trees, and what is write amplification?',
  },
  {
    id: ATTENTION_LEARNING_SOURCE_ID,
    title: 'Attention Is All You Need: Transformers & Multi-Head Attention',
    duration: '45 min',
    sourceType: 'document',
    topic: 'Deep Learning & Neural Architectures',
    description: 'The foundational 2017 paper by Vaswani et al. introducing the Transformer architecture, self-attention mechanisms, and parallelized sequence transduction.',
    sampleQuestion: 'How does multi-head self-attention allow the model to jointly attend to information from different representation subspaces, and why does this outperform recurrence?',
  },
  {
    id: DEMO_LEARNING_SOURCE_ID,
    title: 'Memory Arena Allocators: Design and Trade-offs',
    duration: '38 min',
    sourceType: 'transcript',
    topic: 'Systems Programming & Memory Management',
    description: 'A dense walkthrough of arena/bump allocators, free-list strategies, and fragmentation trade-offs.',
    sampleQuestion: 'What is a bump pointer and how does arena allocation work?',
  },
];

export const CreateInquiryView: React.FC<CreateInquiryViewProps> = ({
  initialQuestion = '',
  initialSourceId,
  onCreateInquiry,
  onIngestDocument,
  onCancel,
  isSubmitting = false,
}) => {
  const [tab, setTab] = useState<'curated' | 'ingest'>('curated');

  // Curated form state
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialSourceId || GENERAL_LEARNING_SOURCE_ID);
  const [question, setQuestion] = useState<string>(initialQuestion);
  const [inquiryTitle, setInquiryTitle] = useState<string>(() => deriveTitleFromQuestion(initialQuestion));
  const [researchMode, setResearchMode] = useState<boolean>(false);

  // Ingest form state
  const [paperTitle, setPaperTitle] = useState<string>(PRESET_PAPERS[0].title);
  const [paperContent, setPaperContent] = useState<string>(PRESET_PAPERS[0].content);
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);

  const selectedSource = CURATED_SOURCES.find((s) => s.id === selectedSourceId) ?? CURATED_SOURCES[0];

  const handleCuratedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    let resolvedSourceId = selectedSourceId;
    let finalTitle = inquiryTitle.trim() || deriveTitleFromQuestion(question);

    onCreateInquiry({
      question: question.trim(),
      learningSourceId: resolvedSourceId,
      title: finalTitle,
      researchMode,
    });
  };

  const handleIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperTitle.trim() || !paperContent.trim() || isSubmitting) return;

    if (onIngestDocument) {
      onIngestDocument({
        title: paperTitle.trim(),
        content: paperContent.trim(),
        sourceType: 'document',
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8 text-slate-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#13161b] px-3 py-1.5 font-mono text-xs text-slate-400 hover:text-white hover:border-[#c59a67]/60 transition cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setTab('curated')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
              tab === 'curated'
                ? 'bg-[#c59a67] text-black font-semibold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Curated Foundations
          </button>
          <button
            type="button"
            onClick={() => setTab('ingest')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'ingest'
                ? 'bg-[#c59a67] text-black font-semibold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Ingest Technical Paper (DAG)</span>
          </button>
        </div>

        <span className="font-mono text-[10px] font-bold text-[#c59a67] uppercase tracking-wider bg-[#c59a67]/10 px-2.5 py-0.5 rounded border border-[#c59a67]/30">
          Tattva Ingestion Engine
        </span>
      </div>

      {tab === 'curated' ? (
        <form onSubmit={handleCuratedSubmit} className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Initialize Socratic Inquiry
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Formulate your first-principles inquiry into foundational technical architectures.
            </p>
          </div>

          {/* Curated Source Cards */}
          <div className="space-y-3">
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-400">
              Select Foundational Domain
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {CURATED_SOURCES.map((source) => {
                const isSelected = source.id === selectedSourceId;
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => {
                      setSelectedSourceId(source.id);
                      if (!question.trim()) {
                        setQuestion(source.sampleQuestion);
                        setInquiryTitle(deriveTitleFromQuestion(source.sampleQuestion));
                      }
                    }}
                    className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-[#c59a67] bg-[#c59a67]/10 ring-1 ring-[#c59a67]'
                        : 'border-white/10 bg-[#13161b] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase text-[#c59a67]">
                        {source.sourceType}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#c59a67]" />}
                    </div>
                    <h4 className="mt-2 text-xs font-semibold text-white line-clamp-2">
                      {source.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {source.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inquiry Question */}
          <div className="space-y-2">
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-400">
              Core Technical Question
            </label>
            <textarea
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setInquiryTitle(deriveTitleFromQuestion(e.target.value));
              }}
              rows={3}
              required
              placeholder="What core algorithmic tension, invariant, or failure mode do you want to explore?"
              className="w-full rounded-xl border border-white/15 bg-[#14171d] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-[#c59a67] focus:outline-none focus:ring-1 focus:ring-[#c59a67] font-sans"
            />
          </div>

          {/* Research Mode Checkbox */}
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#13161b] p-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={researchMode}
              onChange={(e) => setResearchMode(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-[#c59a67] focus:ring-[#c59a67]"
            />
            <div>
              <span className="text-xs font-semibold text-slate-200">
                Enable Research Mode (2.5× Stamina Multiplier)
              </span>
              <p className="text-[11px] text-slate-400">
                Activates deeper adversarial traps and enforces rigorous mathematical citations.
              </p>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting || !question.trim()}
            className="w-full rounded-xl bg-[#c59a67] py-3 text-sm font-semibold text-black hover:bg-[#d6ab78] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing Socratic Workspace...</span>
              </>
            ) : (
              <>
                <span>Launch Inquiry</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Ingest Technical Paper Mode */
        <form onSubmit={handleIngestSubmit} className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#c59a67]" />
              <span>Ingest Technical Paper / RFC & Build Concept DAG</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Upload raw Markdown or an RFC. Sarvam AI will parse the structure and synthesize a topologically sorted Prerequisite Concept DAG.
            </p>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-400">
              Load Landmark Technical Specification
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {PRESET_PAPERS.map((paper, idx) => {
                const Icon = paper.icon;
                const isSelected = activePresetIndex === idx;
                return (
                  <button
                    key={paper.title}
                    type="button"
                    onClick={() => {
                      setActivePresetIndex(idx);
                      setPaperTitle(paper.title);
                      setPaperContent(paper.content);
                    }}
                    className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-[#c59a67] bg-[#c59a67]/10 ring-1 ring-[#c59a67]'
                        : 'border-white/10 bg-[#13161b] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-[#c59a67]" />
                      <span className="font-mono text-[9px] uppercase text-slate-500">
                        {paper.category}
                      </span>
                    </div>
                    <h4 className="mt-2 text-xs font-semibold text-white line-clamp-2">
                      {paper.title.split(':')[0]}
                    </h4>
                    <p className="mt-1 text-[10px] text-slate-400 line-clamp-2">
                      {paper.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document Title */}
          <div className="space-y-1.5">
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-400">
              Document Title
            </label>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-white/15 bg-[#14171d] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#c59a67] focus:outline-none focus:ring-1 focus:ring-[#c59a67]"
            />
          </div>

          {/* Document Markdown / Raw Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-400">
                Specification Content (Markdown / LaTeX / RFC)
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                {paperContent.length} characters &middot; {paperContent.split(/\s+/).length} words
              </span>
            </div>
            <textarea
              value={paperContent}
              onChange={(e) => setPaperContent(e.target.value)}
              rows={8}
              required
              placeholder="Paste Markdown sections, formulas, and architectural invariants..."
              className="w-full rounded-xl border border-white/15 bg-[#14171d] px-4 py-3 text-xs text-slate-200 font-mono leading-relaxed placeholder-slate-500 focus:border-[#c59a67] focus:outline-none focus:ring-1 focus:ring-[#c59a67]"
            />
          </div>

          <div className="rounded-xl border border-[#c59a67]/30 bg-[#c59a67]/5 p-4 flex items-start gap-3">
            <Network className="w-5 h-5 text-[#c59a67] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white">Automated Concept DAG Synthesis</p>
              <p className="text-slate-400 leading-relaxed">
                Tattva will extract the prerequisite dependency hierarchy (e.g. <em>Matrix Multiplication</em> &rarr; <em>Softmax Tiling</em> &rarr; <em>Online Normalization</em>), lock intermediate mechanisms, and establish the foundational entry point.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !paperTitle.trim() || !paperContent.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-[#c59a67] to-[#e3ba89] py-3 text-sm font-semibold text-black hover:opacity-95 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#c59a67]/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Concept DAG with Sarvam AI...</span>
              </>
            ) : (
              <>
                <span>Extract Concept DAG & Launch Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
