'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecordingResult {
  blob: Blob;
  base64: string;
  mimeType: string;
}

/**
 * Encodes 16-bit mono PCM samples at 16kHz into a standard RIFF WAV Blob.
 * 16kHz mono WAV is the exact recommended format for Sarvam AI (saaras:v4).
 */
function encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeString(0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(8, 'WAVE');
  // Format chunk identifier
  writeString(12, 'fmt ');
  // Format chunk length (16 for PCM)
  view.setUint32(16, 16, true);
  // Sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // Channel count (1 = mono)
  view.setUint16(22, 1, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (SampleRate * Channels * BitsPerSample/8)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (Channels * BitsPerSample/8)
  view.setUint16(32, 2, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // Data chunk identifier
  writeString(36, 'data');
  // Data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples as signed 16-bit integers
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  const cleanUp = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    samplesRef.current = [];
    setIsRecording(false);
    setAudioLevel(0);
    setRecordingDuration(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, [cleanUp]);

  const startRecording = useCallback(async () => {
    cleanUp();
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    // Use 16kHz sample rate optimal for Sarvam saaras:v4
    const audioCtx = new AudioCtx({ sampleRate: 16000 });
    audioContextRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    // 4096 buffer size, 1 input channel, 1 output channel
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    samplesRef.current = [];

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      samplesRef.current.push(new Float32Array(inputData));

      // Calculate audio level for waveform animation
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        const val = inputData[i] ?? 0;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / inputData.length);
      setAudioLevel(Math.min(100, Math.round(rms * 400)));
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    setIsRecording(true);
    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 250);
  }, [cleanUp]);

  const stopRecording = useCallback((): Promise<AudioRecordingResult> => {
    return new Promise((resolve, reject) => {
      if (!audioContextRef.current || samplesRef.current.length === 0) {
        cleanUp();
        return reject(new Error('No speech recorded. Please speak into the mic and retry.'));
      }

      // Merge all recorded Float32Array chunks
      const totalLength = samplesRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      const mergedSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of samplesRef.current) {
        mergedSamples.set(chunk, offset);
        offset += chunk.length;
      }

      const actualSampleRate = audioContextRef.current.sampleRate || 16000;
      const wavBlob = encodeWAV(mergedSamples, actualSampleRate);

      cleanUp();

      if (wavBlob.size < 1000) {
        return reject(new Error('Audio recording was too short or empty. Please speak clearly.'));
      }

      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({
          blob: wavBlob,
          base64,
          mimeType: 'audio/wav',
        });
      };
      reader.onerror = (err) => reject(err);
    });
  }, [cleanUp]);

  const cancelRecording = useCallback(() => {
    cleanUp();
  }, [cleanUp]);

  return {
    isRecording,
    recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
