'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  X,
  Languages,
  PlusCircle,
} from 'lucide-react';

export interface VoiceExchange {
  transcript: string;
  responseText: string;
  audioBase64: string;
  languageCode: string;
}

export function VoiceAssistantModal({
  exchange,
  onClose,
  onAddToGraph,
}: {
  exchange: VoiceExchange;
  onClose: () => void;
  onAddToGraph: (question: string) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Automatically play the voice response upon arrival
    if (exchange.audioBase64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${exchange.audioBase64}`);
        audioRef.current = audio;
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        audio.play().catch(() => {
          // Browser autoplay restriction, user can click play
          setIsPlaying(false);
        });
      } catch {}
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [exchange]);

  const toggleAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(`data:audio/wav;base64,${exchange.audioBase64}`);
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-line-strong bg-surface-1 p-6 shadow-2xl shadow-black/80 text-fg space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-surface-2 flex items-center justify-center text-fg-muted">
              <Sparkles className="w-4 h-4 text-fg-muted" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">Sarvam Multilingual Voice Tutor</h2>
              <div className="flex items-center gap-2 text-[10px] text-fg-muted font-mono">
                <Languages className="w-3 h-3 text-fg-muted" />
                <span>Detected: {exchange.languageCode.toUpperCase()}</span>
                <span>·</span>
                <span>saaras:v4 + bulbul:v4-flash</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-fg-muted hover:text-fg hover:bg-surface-2/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spoken Question Transcript */}
        <div className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            You Spoke
          </span>
          <div className="rounded-xl border border-line bg-surface-2/5 p-3.5 text-sm font-medium text-fg leading-relaxed">
            &ldquo;{exchange.transcript}&rdquo;
          </div>
        </div>

        {/* Spoken Answer & Audio Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-fg-muted" />
              Sarvam AI Voice Answer
            </span>

            <button
              type="button"
              onClick={toggleAudio}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition cursor-pointer ${
                isPlaying
                  ? 'bg-surface-3 text-fg'
                  : 'bg-surface-2/10 text-fg hover:bg-surface-2/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Pause Spoken Voice</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Replay Voice (bulbul)</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/5 p-4 text-sm leading-relaxed text-fg font-sans">
            {exchange.responseText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <button
            type="button"
            onClick={toggleAudio}
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg font-mono transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Replay Audio</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-3.5 py-2 font-mono text-xs text-fg-muted hover:text-fg transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onAddToGraph(exchange.transcript);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 font-mono text-xs font-bold text-gold-ink hover:bg-gold-hover transition cursor-pointer shadow-md shadow-black/40"
            >
              <PlusCircle className="w-3.5 h-3.5 text-gold-ink" />
              <span>Add as Knowledge Node</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
