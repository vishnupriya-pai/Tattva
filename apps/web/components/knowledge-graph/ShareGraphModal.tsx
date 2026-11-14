'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  Sparkles,
  GitBranch,
  Layers,
  FileText,
} from 'lucide-react';

export interface ShareGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
  nodeCount: number;
  rootTopic?: string;
  graphData?: {
    nodes: Array<{ id: string; label: string; summary?: string }>;
    edges?: Array<{ from: string; to: string; label?: string }>;
  };
}

export const ShareGraphModal: React.FC<ShareGraphModalProps> = ({
  isOpen,
  onClose,
  title,
  shareUrl,
  nodeCount,
  rootTopic,
  graphData,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setHasNativeShare(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const generateMarkdownSummary = () => {
    const lines = [
      `# Knowledge Graph: ${title}`,
      `**Topic / Domain**: ${rootTopic || title}`,
      `**Nodes Explored**: ${nodeCount}`,
      '',
      '## Key Concept Nodes',
    ];

    if (graphData?.nodes && graphData.nodes.length > 0) {
      graphData.nodes.forEach((n, idx) => {
        lines.push(`${idx + 1}. **${n.label}**${n.summary ? `: ${n.summary}` : ''}`);
      });
    }

    lines.push('');
    lines.push(`*Explore this interactive Knowledge Graph on Tattva: [${shareUrl}](${shareUrl})*`);
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    const summary = generateMarkdownSummary();
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2200);
    } catch (e) {
      console.warn('Failed to copy summary', e);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Tattva Knowledge Graph: ${title}`,
        text: `Explore this interactive Knowledge Graph on ${title} (${nodeCount} concept nodes explored).`,
        url: shareUrl,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleDownloadJSON = () => {
    const payload = {
      title,
      rootTopic: rootTopic || title,
      nodeCount,
      shareUrl,
      exportedAt: new Date().toISOString(),
      graph: graphData || { nodes: [], edges: [] },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-graph.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#12110e] p-6 shadow-2xl shadow-black/80 text-slate-200 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Share Knowledge Graph
              </h2>
              <p className="text-xs text-slate-400 font-sans line-clamp-1">
                {title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Graph Quick Stats Badge */}
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#181613] p-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Layers className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>{nodeCount} Nodes</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
            <span>Interactive Multi-Tier</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5 text-amber-200">
            <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Live Exploration</span>
          </div>
        </div>

        {/* Share Link Field */}
        <div className="space-y-2">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Direct Shareable URL
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 font-mono text-xs text-slate-200 selection:bg-[#d4af37]/30 focus:border-[#d4af37] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-mono text-xs font-bold transition cursor-pointer shadow-md shrink-0 ${
                copiedLink
                  ? 'bg-emerald-500 text-black border border-emerald-400'
                  : 'bg-[#d4af37] text-black hover:bg-[#e0bb45] border border-[#d4af37]'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>COPY LINK</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Secondary Sharing Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Share via Apps...</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">Summary Copied!</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 text-[#d4af37]" />
                <span>Copy Markdown Brief</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadJSON}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Export Graph JSON</span>
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Open Link in Tab</span>
          </a>
        </div>

        {/* Footer info */}
        <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Anyone with this link can view this Knowledge Graph</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
