import { useState, useRef, useEffect } from 'react';

interface Props {
  orderId: string;
  onFinish: () => void;
}

type PackingStatus = 'ready' | 'recording' | 'processing' | 'uploading' | 'printing' | 'done';

export function PackingScreen({ orderId, onFinish }: Props) {
  const [status, setStatus] = useState<PackingStatus>('ready');
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access failed:', err);
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function startRecording() {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      setStatus('processing');
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      handleRecordingComplete(blob);
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setStatus('recording');
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  async function handleRecordingComplete(_blob: Blob) {
    setStatus('uploading');
    // TODO: FFmpeg transcode, encrypt, upload
    await new Promise(r => setTimeout(r, 1000));
    setStatus('printing');
    // TODO: Create and print ShipStation label
    await new Promise(r => setTimeout(r, 500));
    setStatus('done');
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const statusColors: Record<PackingStatus, string> = {
    ready: 'bg-primary',
    recording: 'bg-recording animate-pulse',
    processing: 'bg-warning',
    uploading: 'bg-warning',
    printing: 'bg-primary',
    done: 'bg-success',
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className={`flex items-center justify-between px-6 py-3 text-white ${statusColors[status]}`}>
        <span className="text-lg font-bold uppercase">{status}</span>
        <span className="text-2xl font-mono font-bold">Order: {orderId}</span>
        {status === 'recording' && (
          <span className="text-lg font-mono">{formatTime(elapsed)}</span>
        )}
      </div>

      <div className="flex flex-1 gap-4 p-4">
        {/* Camera preview */}
        <div className="flex-1 rounded-xl border-2 border-border overflow-hidden bg-black relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {status === 'recording' && (
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-recording px-4 py-2">
              <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-bold text-white">REC {formatTime(elapsed)}</span>
            </div>
          )}
        </div>

        {/* Controls panel */}
        <div className="w-80 flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-muted p-4">
            <h3 className="text-lg font-bold mb-2">Order Details</h3>
            <p className="text-muted-foreground">Order #{orderId}</p>
            <p className="text-sm text-muted-foreground mt-1">Items will appear here</p>
          </div>

          <div className="flex-1" />

          {status === 'ready' && (
            <button
              onClick={startRecording}
              className="rounded-xl bg-success py-6 text-2xl font-bold text-white hover:bg-success/90 transition-colors"
            >
              START RECORDING
            </button>
          )}

          {status === 'recording' && (
            <button
              onClick={stopRecording}
              className="rounded-xl bg-recording py-6 text-2xl font-bold text-white hover:bg-recording/90 transition-colors"
            >
              FINISH &amp; SEAL
            </button>
          )}

          {status === 'done' && (
            <button
              onClick={onFinish}
              className="rounded-xl bg-primary py-6 text-2xl font-bold text-white hover:bg-primary/90 transition-colors"
            >
              NEXT ORDER
            </button>
          )}

          {(status === 'processing' || status === 'uploading' || status === 'printing') && (
            <div className="rounded-xl bg-muted py-6 text-center">
              <p className="text-xl font-bold text-warning animate-pulse">
                {status === 'processing' ? 'Processing video...' : 
                 status === 'uploading' ? 'Uploading...' : 'Printing label...'}
              </p>
            </div>
          )}

          <button
            onClick={onFinish}
            className="rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Cancel &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
}
