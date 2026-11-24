'use client';

import { useId, useState, useEffect, useRef } from 'react';
import {
  Plus,
  Brain,
  Mic,
  MicOff,
  ArrowUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAudioRecorder } from '../../lib/useAudioRecorder';
import { sendVoiceQuery } from '../../lib/api-client';
import { VoiceAssistantModal, type VoiceExchange } from '../voice/VoiceAssistantModal';

const MAX_LENGTH = 1000;

export function InquiryComposer({
  disabled,
  loading,
  placeholder,
  inquiryId,
  onSubmit,
}: {
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  inquiryId?: string;
  onSubmit: (question: string) => void;
}) {
  const [value, setValue] = useState('');
  const [thinkMode, setThinkMode] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<'dictation' | 'voiceAssistant'>('dictation');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [activeExchange, setActiveExchange] = useState<VoiceExchange | null>(null);

  const fieldId = useId();
  const {
    isRecording,
    recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  const trimmed = value.trim();
  const isEmpty = trimmed.length === 0;
  const tooLong = value.length > MAX_LENGTH;

  function submit() {
    if (isEmpty || tooLong || disabled || loading) return;
    const finalQuery = thinkMode ? `[Socratic Think Mode] ${trimmed}` : trimmed;
    onSubmit(finalQuery);
    setValue('');
  }

  const handleStartVoice = async (target: 'dictation' | 'voiceAssistant') => {
    setVoiceError(null);
    setRecordingTarget(target);
    try {
      await startRecording();
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Microphone access denied.');
    }
  };

  const handleStopVoice = async () => {
    setIsProcessingVoice(true);
    setVoiceError(null);
    try {
      const { base64, mimeType } = await stopRecording();
      const res = await sendVoiceQuery({
        audioBase64: base64,
        mimeType,
        inquiryId,
      });

      if (res.data.transcript) {
        setValue(res.data.transcript);
      }

      // If triggered from the golden voice assistant button, also open the full interactive audio modal
      if (recordingTarget === 'voiceAssistant') {
        setActiveExchange(res.data);
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Voice processing failed. Please retry.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const isStoppingRef = useRef(false);

  // Auto-cap recording at 60s, smoothly transitioning to synthesis
  useEffect(() => {
    if (isRecording && recordingDuration >= 60 && !isStoppingRef.current) {
      isStoppingRef.current = true;
      void handleStopVoice().finally(() => {
        isStoppingRef.current = false;
      });
    }
  }, [isRecording, recordingDuration]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full space-y-2">
      {voiceError && (
        <div className="flex items-center gap-2 rounded-full border border-trap/30 bg-trap-wash px-4 py-1.5 text-xs text-trap shadow-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-trap" />
          <span className="truncate">{voiceError}</span>
        </div>
      )}

      {isRecording ? (
        /* Active Recording Pill Bar */
        <div className="relative flex items-center justify-between w-full min-h-[52px] rounded-full bg-surface-2 border border-gold/50 px-3.5 py-1.5 shadow-xl shadow-black/50 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 pl-1 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trap opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-trap"></span>
            </span>

            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs font-semibold text-gold truncate">
                {recordingTarget === 'dictation'
                  ? 'Transcribing speech (up to 60s)…'
                  : 'Listening for Voice Assistant (up to 60s)…'}
              </span>
              <span className="font-mono text-xs text-gold/90 bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20 shrink-0">
                {formatTime(recordingDuration)} / 1:00
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-full text-fg-muted hover:text-fg hover:bg-surface-2/10 transition cursor-pointer"
              title="Cancel recording"
            >
              <MicOff className="w-4 h-4" />
            </button>

            {/* Pulsating Waveform Action Button */}
            <button
              type="button"
              onClick={handleStopVoice}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gold hover:bg-gold-hover text-gold-ink shadow-lg shadow-black/50 transition cursor-pointer hover:scale-105 active:scale-95"
              title="Stop and process speech"
            >
              <div className="flex items-center gap-0.5">
                <span
                  className="w-0.5 bg-bg rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(20, 6 + (audioLevel * 14) / 100))}px` }}
                />
                <span
                  className="w-0.5 bg-bg rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(10, Math.min(26, 10 + (audioLevel * 20) / 100))}px` }}
                />
                <span
                  className="w-0.5 bg-bg rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(8, Math.min(22, 8 + (audioLevel * 16) / 100))}px` }}
                />
                <span
                  className="w-0.5 bg-bg rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(12, Math.min(28, 12 + (audioLevel * 22) / 100))}px` }}
                />
              </div>
            </button>
          </div>
        </div>
      ) : isProcessingVoice ? (
        /* Processing voice with Sarvam AI */
        <div className="flex items-center justify-between w-full min-h-[52px] rounded-full border border-line bg-surface-2 px-4 py-2 text-fg-body shadow-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin text-gold shrink-0" />
            <span className="text-xs text-fg truncate">
              {recordingTarget === 'dictation'
                ? 'Transcribing speech with Sarvam saaras:v4…'
                : 'Synthesizing voice (saaras:v4 → 105b → bulbul:v4-flash)…'}
            </span>
          </div>
          <span className="font-mono text-xs text-gold bg-gold/10 px-2.5 py-0.5 rounded-full border border-gold/30 shrink-0">
            Sarvam AI
          </span>
        </div>
      ) : (
        /* ChatGPT-style Sleek Pill Bar (Matches Reference Design) */
        <form
          className="relative flex items-center w-full min-h-[52px] rounded-full bg-surface-2 border border-line hover:border-line-strong focus-within:border-line-strong px-3 py-1.5 shadow-xl shadow-black/40 transition-all"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* Left Action / Plus Button */}
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full text-fg-muted hover:text-fg hover:bg-surface-2/10 transition cursor-pointer shrink-0"
            title="Attach concept or context"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            id={fieldId}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={MAX_LENGTH}
            disabled={disabled || loading}
            placeholder={placeholder ?? 'Ask ChatGPT or speak in any language…'}
            className="flex-1 bg-transparent px-3 py-1 text-sm text-fg placeholder:text-fg-faint outline-none min-w-0"
          />

          {/* Right Action Cluster */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {/* Think Toggle Pill */}
            <button
              type="button"
              onClick={() => setThinkMode(!thinkMode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer select-none ${
                thinkMode
                  ? 'bg-gold/15 border-gold/40 text-gold'
                  : 'bg-surface-2/5 border-line text-fg-muted hover:text-fg hover:bg-surface-2/10'
              }`}
              title={thinkMode ? 'Socratic Reasoning Mode (Active)' : 'Enable Socratic Deep Think Mode'}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Think</span>
            </button>

            {/* Dictation / Microphone Button */}
            <button
              type="button"
              onClick={() => handleStartVoice('dictation')}
              disabled={disabled || loading}
              className="flex items-center justify-center w-8 h-8 rounded-full text-fg-muted hover:text-fg hover:bg-surface-2/10 transition cursor-pointer disabled:opacity-40"
              title="Dictate in any Indian language or English (Sarvam STT)"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* If text is typed, show the Send arrow button */}
            {trimmed.length > 0 && (
              <button
                type="submit"
                disabled={disabled || loading}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-3 text-gold-ink shadow-md transition cursor-pointer shrink-0 hover:scale-105 active:scale-95 disabled:opacity-40"
                title="Send query"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            {/* Golden Circular Waveform Voice Assistant Button */}
            <button
              type="button"
              onClick={() => handleStartVoice('voiceAssistant')}
              disabled={disabled || loading}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gold hover:bg-gold-hover text-gold-ink shadow-md shadow-black/40 transition cursor-pointer shrink-0 group hover:scale-105 active:scale-95 disabled:opacity-40"
              title="Start Sarvam Voice Assistant (Multilingual Speech-to-Speech)"
            >
              <div className="flex items-center gap-[2.5px] group-hover:scale-110 transition-transform">
                <span className="w-[2px] h-2.5 bg-bg rounded-full" />
                <span className="w-[2px] h-4 bg-bg rounded-full" />
                <span className="w-[2px] h-2 bg-bg rounded-full" />
                <span className="w-[2px] h-3.5 bg-bg rounded-full" />
              </div>
            </button>
          </div>
        </form>
      )}

      {/* Pop-up Interactive Voice Assistant Modal */}
      {activeExchange && (
        <VoiceAssistantModal
          exchange={activeExchange}
          onClose={() => setActiveExchange(null)}
          onAddToGraph={(question) => {
            onSubmit(question);
            setActiveExchange(null);
          }}
        />
      )}
    </div>
  );
}
