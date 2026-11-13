'use client';

import { useId, useState } from 'react';
import {
  Mic,
  MicOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAudioRecorder } from '../../lib/useAudioRecorder';
import { sendVoiceQuery } from '../../lib/api-client';
import { VoiceAssistantModal, type VoiceExchange } from '../voice/VoiceAssistantModal';

const MAX_LENGTH = 6000;

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
  const [touched, setTouched] = useState(false);
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
  const showError = touched && (isEmpty || tooLong);

  function submit() {
    setTouched(true);
    if (isEmpty || tooLong || disabled || loading) return;
    onSubmit(trimmed);
    setValue('');
    setTouched(false);
  }

  const handleStartVoice = async () => {
    setVoiceError(null);
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

      setActiveExchange(res.data);
      // Also prefill the text field with the spoken transcript so learner can see it
      if (res.data.transcript) {
        setValue(res.data.transcript);
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Voice processing failed. Please retry.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-2">
      {voiceError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/60 px-3 py-1.5 text-xs text-rose-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{voiceError}</span>
        </div>
      )}

      {isRecording ? (
        /* Active Recording Banner matching the reference image's golden circular wave button */
        <div className="flex items-center justify-between rounded-2xl border border-amber-400/40 bg-[#16140e] p-3 shadow-lg shadow-black/40 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-amber-200">
                  Listening in any Indian language or English…
                </span>
                <span className="font-mono text-[11px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {formatTime(recordingDuration)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Speak now. Tap the golden button to stop & synthesize.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Cancel recording"
            >
              <MicOff className="w-4 h-4" />
            </button>

            {/* Pulsating Waveform Action Button */}
            <button
              type="button"
              onClick={handleStopVoice}
              className="relative flex items-center justify-center h-10 w-10 rounded-full bg-[#c59a67] hover:bg-[#d4a373] text-black shadow-lg shadow-black/50 transition cursor-pointer"
              title="Stop and process voice"
            >
              <div className="flex items-center gap-0.5">
                <span
                  className="w-0.5 bg-black rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(22, 6 + (audioLevel * 16) / 100))}px` }}
                />
                <span
                  className="w-0.5 bg-black rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(10, Math.min(26, 10 + (audioLevel * 20) / 100))}px` }}
                />
                <span
                  className="w-0.5 bg-black rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(8, Math.min(24, 8 + (audioLevel * 18) / 100))}px` }}
                />
                <span
                  className="w-0.5 bg-black rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(12, Math.min(28, 12 + (audioLevel * 22) / 100))}px` }}
                />
                <span
                  className="w-0.5 bg-black rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(20, 6 + (audioLevel * 14) / 100))}px` }}
                />
              </div>
            </button>
          </div>
        </div>
      ) : isProcessingVoice ? (
        /* Processing voice with Sarvam AI */
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#13161b] p-3 text-slate-300">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-[#c59a67]" />
            <div className="space-y-0.5">
              <span className="font-mono text-xs text-white">Synthesizing Voice Inquiry…</span>
              <p className="text-[11px] text-slate-400">
                Running Sarvam saaras:v4 (STT) &rarr; 105b &rarr; bulbul:v4-flash (TTS)
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#c59a67] bg-[#c59a67]/10 px-2 py-0.5 rounded border border-[#c59a67]/30">
            Multilingual Voice
          </span>
        </div>
      ) : (
        /* Standard Composer with Voice Assistant Trigger (Reference Design) */
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor={fieldId} className="sr-only">
            Ask a question
          </label>
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                id={fieldId}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onBlur={() => setTouched(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                disabled={disabled || loading}
                rows={2}
                placeholder={placeholder ?? 'Ask a technical question in any language (or tap mic)…'}
                aria-invalid={showError}
                className={[
                  'w-full min-h-[2.75rem] resize-none rounded-xl border bg-white/5 pl-3 pr-10 py-2.5 text-sm text-white/90',
                  'placeholder:text-white/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                  showError ? 'border-red-400/50 focus:border-red-400/60' : 'border-white/15 focus:border-[#c59a67]/60',
                ].join(' ')}
              />

              {/* Mic shortcut icon inside input */}
              <button
                type="button"
                onClick={handleStartVoice}
                disabled={disabled || loading}
                title="Speak question (Multilingual Sarvam Voice)"
                className="absolute right-2.5 bottom-3 text-slate-400 hover:text-[#c59a67] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Golden Voice Waveform Action Button (Reference from Screenshot) */}
            <button
              type="button"
              onClick={handleStartVoice}
              disabled={disabled || loading}
              title="Start Sarvam Voice Assistant (Speaks Hindi, English, Tamil, Telugu, etc.)"
              className="flex items-center justify-center h-10 w-10 shrink-0 rounded-full bg-[#c59a67] hover:bg-[#d4a373] text-black shadow-md shadow-black/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-0.5 group-hover:scale-110 transition-transform">
                <span className="w-0.5 h-3 bg-black rounded-full" />
                <span className="w-0.5 h-4.5 bg-black rounded-full" />
                <span className="w-0.5 h-2.5 bg-black rounded-full" />
                <span className="w-0.5 h-4 bg-black rounded-full" />
              </div>
            </button>

            {/* Standard Text Submit Button */}
            <button
              type="submit"
              disabled={disabled || loading}
              className="h-10 shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold uppercase tracking-wide text-white/90 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 transition"
            >
              {loading ? 'Thinking…' : 'Ask'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1">
            <span className={showError ? 'text-red-300' : 'text-white/35 font-mono text-[10px]'}>
              {showError && isEmpty && 'Enter or speak a question before submitting.'}
              {showError && tooLong && `Question exceeds ${MAX_LENGTH} characters.`}
              {!showError && 'Type or tap the golden voice button to speak in your language.'}
            </span>
            <span className={tooLong ? 'text-red-300' : 'text-white/30 font-mono text-[10px]'}>
              {value.length}/{MAX_LENGTH}
            </span>
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
