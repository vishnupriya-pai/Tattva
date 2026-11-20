'use client';

import React, { useState } from 'react';
import {
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Terminal,
} from 'lucide-react';
import type { QuestionNode } from '../../lib/workspace-types';
import { executeCodeChallenge, type SandboxExecutionResult } from '../../lib/sandbox/runner';

interface CodeChallengePanelProps {
  node: QuestionNode;
  onChallengePassed?: () => void;
}

interface ChallengeDefinition {
  title: string;
  prompt: string;
  language: 'javascript' | 'python';
  starterCode: string;
  testCode: string;
}

function deriveChallengeForNode(node: QuestionNode): ChallengeDefinition {
  if (node.codeChallenge) {
    return {
      title: 'Algorithmic Verification Challenge',
      prompt: node.codeChallenge.prompt,
      language: node.codeChallenge.language,
      starterCode: node.codeChallenge.starterCode,
      testCode: node.codeChallenge.testCode,
    };
  }

  const q = (node.userQuestion + ' ' + node.aiExplanation).toLowerCase();

  if (q.includes('attention') || q.includes('transformer') || q.includes('softmax')) {
    return {
      title: 'Scaled Dot-Product Numerical Stability',
      prompt: 'Implement scaled dot-product attention score scaling to prevent softmax saturation as key dimension d_k increases.',
      language: 'javascript',
      starterCode: `function scaleAttentionScore(rawScore, d_k) {
  // TODO: Divide rawScore by the square root of d_k
  // and handle d_k <= 0 gracefully by throwing an Error.
  return rawScore / Math.sqrt(d_k);
}`,
      testCode: `
assert(scaleAttentionScore(16, 64) === 2, "scaleAttentionScore(16, 64) === 2", 2, scaleAttentionScore(16, 64));
assert(scaleAttentionScore(100, 25) === 20, "scaleAttentionScore(100, 25) === 20", 20, scaleAttentionScore(100, 25));
assert(scaleAttentionScore(0, 128) === 0, "Zero dot product remains 0", 0, scaleAttentionScore(0, 128));
`,
    };
  }

  if (q.includes('arena') || q.includes('bump') || q.includes('allocat')) {
    return {
      title: 'Bump Pointer Arena Allocator',
      prompt: 'Implement a contiguous arena bump allocator with capacity limits, aligned offsets, and batch reset.',
      language: 'javascript',
      starterCode: `class ArenaAllocator {
  constructor(capacityBytes) {
    this.capacity = capacityBytes;
    this.offset = 0;
  }

  allocate(bytes) {
    // TODO: Advance bump pointer. If offset + bytes > capacity, return null.
    if (this.offset + bytes > this.capacity) return null;
    const startAddress = this.offset;
    this.offset += bytes;
    return startAddress;
  }

  reset() {
    // TODO: Reset bump pointer to 0 without freeing individual blocks
    this.offset = 0;
  }
}`,
      testCode: `
const arena = new ArenaAllocator(1024);
assert(arena.allocate(128) === 0, "First allocation starts at offset 0", 0, arena.allocate(128));
assert(arena.allocate(256) === 128, "Second allocation advances to offset 128", 128, arena.allocate(256));
assert(arena.allocate(2000) === null, "Out-of-bounds allocation safely returns null", null, arena.allocate(2000));
arena.reset();
assert(arena.allocate(64) === 0, "Reset rewinds bump pointer to 0", 0, arena.allocate(64));
`,
    };
  }

  if (q.includes('raft') || q.includes('consensus') || q.includes('election')) {
    return {
      title: 'Distributed Consensus Quorum Evaluator',
      prompt: 'Implement majority vote quorum check for Raft leader election across arbitrary cluster sizes.',
      language: 'javascript',
      starterCode: `function hasMajorityQuorum(votesGranted, clusterSize) {
  // TODO: A candidate wins an election if votesGranted >= Math.floor(clusterSize / 2) + 1.
  const quorumThreshold = Math.floor(clusterSize / 2) + 1;
  return votesGranted >= quorumThreshold;
}`,
      testCode: `
assert(hasMajorityQuorum(3, 5) === true, "3 votes in a 5-node cluster is majority", true, hasMajorityQuorum(3, 5));
assert(hasMajorityQuorum(2, 5) === false, "2 votes in a 5-node cluster is not majority", false, hasMajorityQuorum(2, 5));
assert(hasMajorityQuorum(2, 3) === true, "2 votes in a 3-node cluster is majority", true, hasMajorityQuorum(2, 3));
assert(hasMajorityQuorum(4, 7) === true, "4 votes in a 7-node cluster is majority", true, hasMajorityQuorum(4, 7));
`,
    };
  }

  // Default Algorithmic Invariant Challenge
  return {
    title: 'Algorithmic Complexity & Bounds Verifier',
    prompt: `Verify the theoretical bound for "${node.userQuestion}". Return true if complexity constraint is satisfied.`,
    language: 'javascript',
    starterCode: `function verifyAlgorithmicBound(n, operations) {
  // TODO: Return true if operations <= n * Math.log2(n)
  if (n <= 1) return true;
  return operations <= n * Math.log2(n);
}`,
    testCode: `
assert(verifyAlgorithmicBound(8, 24) === true, "8 * log2(8) = 24 operations is within O(N log N) bound", true, verifyAlgorithmicBound(8, 24));
assert(verifyAlgorithmicBound(16, 100) === false, "100 operations exceeds 16 * log2(16) = 64", false, verifyAlgorithmicBound(16, 100));
assert(verifyAlgorithmicBound(1, 0) === true, "Base case n=1 is bounded", true, verifyAlgorithmicBound(1, 0));
`,
  };
}

export const CodeChallengePanel: React.FC<CodeChallengePanelProps> = ({
  node,
  onChallengePassed,
}) => {
  const challenge = deriveChallengeForNode(node);
  const [code, setCode] = useState<string>(challenge.starterCode);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<SandboxExecutionResult | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const result = await executeCodeChallenge(challenge.language, code, challenge.testCode);
      setExecutionResult(result);
      if (result.success && onChallengePassed) {
        onChallengePassed();
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(challenge.starterCode);
    setExecutionResult(null);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0f12] p-4 text-slate-200 space-y-4 font-sans">
      {/* Challenge Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#c59a67]/15 border border-[#c59a67]/30 flex items-center justify-center text-[#c59a67]">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#c59a67] bg-[#c59a67]/10 px-1.5 py-0.5 rounded border border-[#c59a67]/30">
                Theory Meets Code
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">{challenge.language}</span>
            </div>
            <h4 className="text-xs font-semibold text-white tracking-tight mt-0.5">
              {challenge.title}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={isRunning}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          title="Reset starter code"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Prompt */}
      <p className="text-xs text-slate-300 leading-relaxed bg-[#14171d] p-3 rounded-lg border border-white/5">
        {challenge.prompt}
      </p>

      {/* Code Editor */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Implementation Sandbox</span>
          <span>Tab key supported</span>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={7}
          spellCheck={false}
          className="w-full rounded-xl border border-white/15 bg-[#090a0d] p-3 text-xs text-emerald-300 font-mono leading-relaxed placeholder-slate-600 focus:border-[#c59a67] focus:outline-none focus:ring-1 focus:ring-[#c59a67]"
        />
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-500 font-mono">
          Pass 100% assertions to prove mastery
        </span>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning || !code.trim()}
          className="rounded-xl bg-[#c59a67] px-4 py-2 text-xs font-semibold text-black hover:bg-[#d6ab78] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying Assertions...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run & Verify Assertions</span>
            </>
          )}
        </button>
      </div>

      {/* Execution Results Console */}
      {executionResult && (
        <div className="space-y-2 pt-2 border-t border-white/10 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Assertion Results ({executionResult.passedTests}/{executionResult.totalTests})
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {executionResult.executionTimeMs}ms
            </span>
          </div>

          {/* Status Banner */}
          {executionResult.success ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All mathematical assertions verified. Implementation is correct!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {executionResult.runtimeError || 'Some assertions failed. Check your logic and retry.'}
              </span>
            </div>
          )}

          {/* Test cases list */}
          <div className="space-y-1.5 font-mono text-[11px]">
            {executionResult.testCases.map((tc) => (
              <div
                key={tc.id}
                className={`flex items-start gap-2 p-2 rounded-lg border ${
                  tc.passed
                    ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300'
                    : 'border-rose-500/20 bg-rose-950/20 text-rose-300'
                }`}
              >
                {tc.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p>{tc.description}</p>
                  {!tc.passed && tc.expected !== undefined && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Expected: <code className="text-emerald-400">{tc.expected}</code> | Actual: <code className="text-rose-400">{tc.actual}</code>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
