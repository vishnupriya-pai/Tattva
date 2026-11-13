'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecordingResult {
  blob: Blob;
  base64: string;
  mimeType: string;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanUp = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
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

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // Set up audio analyzer for live waveform animation
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // AudioContext optional for visualizer only
    }

    // Determine supported mime type
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];
    const chosenMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

    const recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : undefined);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.start(100);
    setIsRecording(true);

    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 200);
  }, [cleanUp]);

  const stopRecording = useCallback((): Promise<AudioRecordingResult> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanUp();
        return reject(new Error('No active audio recording found.'));
      }

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        cleanUp();

        if (blob.size === 0) {
          return reject(new Error('Audio recording was empty. Please speak again.'));
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] ?? '';
            resolve({ blob, base64, mimeType });
          };
          reader.onerror = (err) => reject(err);
        } catch (err) {
          reject(err);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        cleanUp();
        reject(err);
      }
    });
  }, [cleanUp]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
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
