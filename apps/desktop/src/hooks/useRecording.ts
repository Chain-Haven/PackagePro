import { useState, useRef, useCallback } from 'react';
import { selectRecordingMimeType } from '../lib/camera-utils';

interface RecordingState {
  isRecording: boolean;
  elapsed: number;
  status: 'idle' | 'recording' | 'stopping' | 'finalizing';
}

export function useRecording(sessionId: string) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    elapsed: 0,
    status: 'idle',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(
    async (stream: MediaStream) => {
      streamRef.current = stream;
      const videoOnly = new MediaStream(stream.getVideoTracks());
      const mimeType = selectRecordingMimeType();
      const recorder = new MediaRecorder(videoOnly, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buffer = await e.data.arrayBuffer();
          await window.electronAPI.saveVideoChunk(sessionId, buffer);
        }
      };

      recorder.start(2000); // 2-second chunks
      mediaRecorderRef.current = recorder;

      setState({ isRecording: true, elapsed: 0, status: 'recording' });

      timerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, elapsed: prev.elapsed + 1 }));
      }, 1000);
    },
    [sessionId]
  );

  const stop = useCallback(
    async (): Promise<{ path: string; size: number } | null> => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        return null;
      }

      setState((prev) => ({ ...prev, status: 'stopping' }));

      return new Promise((resolve) => {
        recorder.onstop = async () => {
          setState((prev) => ({ ...prev, status: 'finalizing', isRecording: false }));
          const result = await window.electronAPI.finalizeVideo(sessionId);
          setState({ isRecording: false, elapsed: 0, status: 'idle' });

          if (result.success && result.path) {
            resolve({ path: result.path, size: result.size || 0 });
          } else {
            resolve(null);
          }
        };
        recorder.stop();
      });
    },
    [sessionId]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    window.electronAPI.deleteVideo(sessionId);
    setState({ isRecording: false, elapsed: 0, status: 'idle' });
  }, [sessionId]);

  return { ...state, start, stop, cancel };
}
