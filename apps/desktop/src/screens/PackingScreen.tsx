import { useState, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useRecording } from '../hooks/useRecording';
import { uploadQueue } from '../lib/upload-queue';
import { api } from '../lib/api';

interface Props {
  orderId: string;
  stationId: string;
  onFinish: () => void;
}

type PackingStatus =
  | 'loading'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'shipping'
  | 'uploading'
  | 'done'
  | 'error';

export function PackingScreen({ orderId, stationId, onFinish }: Props) {
  const [status, setStatus] = useState<PackingStatus>('loading');
  const [orderDetails, setOrderDetails] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [labelInfo, setLabelInfo] = useState<{
    tracking_number?: string;
    label_download_url?: string;
    shipment_cost?: number;
  } | null>(null);

  const sessionId = `${orderId}_${Date.now()}`;
  const camera = useCamera();
  const recording = useRecording(sessionId);

  useEffect(() => {
    initPacking();
    return () => {
      camera.stopPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only on mount
  }, []);

  async function initPacking() {
    try {
      // Lock order
      await api.lockOrder(orderId, stationId || 'desktop-1');

      // Start camera
      await camera.startPreview();

      setStatus('ready');
    } catch (err) {
      setError(String(err));
      setStatus('error');
    }
  }

  async function handleStartRecording() {
    if (!camera.stream) return;
    await recording.start(camera.stream);
    setStatus('recording');
  }

  async function handleStopRecording() {
    setStatus('processing');
    const result = await recording.stop();

    if (!result) {
      setError('Recording failed');
      setStatus('error');
      return;
    }

    // Request upload URL from backend
    try {
      const uploadData = await api.requestUploadUrl(orderId, stationId || 'desktop-1');

      // Enqueue upload
      uploadQueue.enqueue({
        id: `upload_${Date.now()}`,
        videoId: uploadData.video_id,
        sessionId,
        filePath: result.path,
        fileSize: result.size,
        uploadUrl: uploadData.upload_url,
        uploadToken: uploadData.token,
      });

      setStatus('shipping');
    } catch (err) {
      setError(`Upload setup failed: ${err}`);
      setStatus('error');
    }
  }

  async function handleCreateLabel() {
    try {
      const label = await api.createLabel({
        order_id: orderId,
        carrier_id: 'default',
        service_code: 'usps_priority_mail',
        packages: [{ weight: { value: 16, unit: 'ounce' } }],
      });

      setLabelInfo(label);
      setStatus('done');
    } catch (err) {
      setError(`Label creation failed: ${err}`);
      setStatus('done');
    }
  }

  async function handlePrintLabel() {
    if (!labelInfo?.label_download_url) return;
    await window.electronAPI.printLabel({ url: labelInfo.label_download_url });
  }

  async function handleFinish() {
    try {
      await api.releaseOrder(orderId, stationId || 'desktop-1');
    } catch {
      // ignore
    }
    onFinish();
  }

  async function handleCancel() {
    recording.cancel();
    try {
      await api.releaseOrder(orderId, stationId || 'desktop-1');
    } catch {
      // ignore
    }
    onFinish();
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const statusColors: Record<PackingStatus, string> = {
    loading: 'bg-muted',
    ready: 'bg-primary',
    recording: 'bg-recording animate-pulse',
    processing: 'bg-warning',
    shipping: 'bg-primary',
    uploading: 'bg-warning',
    done: 'bg-success',
    error: 'bg-destructive',
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Status bar */}
      <div
        className={`flex items-center justify-between px-6 py-3 text-white ${statusColors[status]}`}
      >
        <span className="text-lg font-bold uppercase">{status}</span>
        <span className="text-2xl font-mono font-bold">Order #{orderId}</span>
        {status === 'recording' && (
          <span className="text-lg font-mono">{formatTime(recording.elapsed)}</span>
        )}
        {status !== 'recording' && <span />}
      </div>

      {error && (
        <div className="bg-destructive/10 px-6 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="flex flex-1 gap-4 p-4">
        {/* Camera */}
        <div className="flex-1 rounded-xl border-2 border-border overflow-hidden bg-black relative">
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {status === 'recording' && (
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-recording px-4 py-2">
              <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-bold text-white">
                REC {formatTime(recording.elapsed)}
              </span>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-96 flex flex-col gap-4">
          {/* Order info */}
          <div className="rounded-xl border border-border bg-muted p-4">
            <h3 className="text-lg font-bold mb-2">Order #{orderId}</h3>
            {orderDetails
              ? (
                  orderDetails as { line_items?: Array<{ name: string; quantity: number }> }
                ).line_items?.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-1 text-sm border-b border-border last:border-0"
                  >
                    <span>{item.name}</span>
                    <span className="font-mono">x{item.quantity}</span>
                  </div>
                )) ?? <p className="text-sm text-muted-foreground">No items</p>
              : (
                  <p className="text-sm text-muted-foreground">Loading order details...</p>
                )}
          </div>

          {/* Label info */}
          {labelInfo && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-4">
              <h3 className="text-sm font-bold text-success mb-1">Label Created</h3>
              <p className="text-xs font-mono">{labelInfo.tracking_number}</p>
              <p className="text-xs text-muted-foreground">
                ${labelInfo.shipment_cost?.toFixed(2)}
              </p>
              <button
                onClick={handlePrintLabel}
                className="mt-2 w-full rounded-lg bg-primary py-2 text-sm font-bold text-white"
              >
                REPRINT LABEL
              </button>
            </div>
          )}

          <div className="flex-1" />

          {/* Action buttons */}
          {status === 'ready' && (
            <button
              onClick={handleStartRecording}
              className="rounded-xl bg-success py-8 text-3xl font-bold text-white hover:bg-success/90 transition-colors"
            >
              START RECORDING
            </button>
          )}

          {status === 'recording' && (
            <button
              onClick={handleStopRecording}
              className="rounded-xl bg-recording py-8 text-3xl font-bold text-white hover:bg-recording/90 transition-colors"
            >
              FINISH &amp; SEAL
            </button>
          )}

          {status === 'shipping' && (
            <button
              onClick={handleCreateLabel}
              className="rounded-xl bg-primary py-8 text-3xl font-bold text-white hover:bg-primary/90 transition-colors"
            >
              CREATE &amp; PRINT LABEL
            </button>
          )}

          {status === 'done' && (
            <button
              onClick={handleFinish}
              className="rounded-xl bg-success py-8 text-3xl font-bold text-white hover:bg-success/90 transition-colors"
            >
              NEXT ORDER
            </button>
          )}

          {(status === 'processing' || status === 'uploading') && (
            <div className="rounded-xl bg-muted py-8 text-center">
              <p className="text-xl font-bold text-warning animate-pulse">
                {status === 'processing' ? 'Processing video...' : 'Uploading...'}
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="rounded-xl bg-muted py-8 text-center">
              <p className="text-xl text-muted-foreground animate-pulse">Setting up...</p>
            </div>
          )}

          <button
            onClick={handleCancel}
            className="rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Cancel &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
}
