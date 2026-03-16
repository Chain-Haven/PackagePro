import { useState, useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useRecording } from '../hooks/useRecording';
import { uploadQueue } from '../lib/upload-queue';
import { api } from '../lib/api';
import { ShippingPanel, type LabelInfo } from '../components/ShippingPanel';

interface Props {
  orderId: string;
  stationId: string;
  onFinish: () => void;
}

type PackingStatus = 'loading' | 'ready' | 'recording' | 'processing' | 'shipping' | 'done' | 'error';

interface OrderData {
  id: string;
  woo_order_number: string;
  customer_name: string;
  customer_email: string;
  shipping_address: Record<string, string>;
  line_items: Array<{ name: string; quantity: number }>;
  order_total: string;
  video_status: string;
  preferred_shipstation_account_id?: string | null;
}

export function PackingScreen({ orderId, stationId, onFinish }: Props) {
  const [status, setStatus] = useState<PackingStatus>('loading');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState('');
  const [labelInfo, setLabelInfo] = useState<LabelInfo | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const sessionIdRef = useRef(`order_${orderId}_${crypto.randomUUID()}`);
  const camera = useCamera();
  const recording = useRecording(sessionIdRef.current);

  useEffect(() => {
    initPacking();
    return () => { camera.stopPreview(); };
  }, []);

  async function initPacking() {
    try {
      const [orderResponse] = await Promise.all([
        api.getOrder(orderId),
        api.lockOrder(orderId, stationId),
      ]);
      setOrder(orderResponse.order as OrderData);
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

    try {
      const uploadData = await api.requestUploadUrl(orderId, stationId);
      uploadQueue.enqueue({
        id: `upload_${Date.now()}`,
        videoId: uploadData.video_id,
        sessionId: sessionIdRef.current,
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

  function handleLabelCreated(label: LabelInfo) {
    setLabelInfo(label);
    setStatus('done');
  }

  async function handleFinish() {
    try { await api.releaseOrder(orderId, stationId); } catch { /* ok */ }
    onFinish();
  }

  async function handleCancel() {
    recording.cancel();
    try { await api.releaseOrder(orderId, stationId); } catch { /* ok */ }
    onFinish();
  }

  function toggleItem(idx: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const statusColors: Record<PackingStatus, string> = {
    loading: 'bg-muted text-foreground', ready: 'bg-primary', recording: 'bg-red-600 animate-pulse',
    processing: 'bg-amber-500', shipping: 'bg-primary', done: 'bg-emerald-600', error: 'bg-destructive',
  };

  const items = order?.line_items ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <div className={`flex items-center justify-between px-6 py-3 text-white ${statusColors[status]}`}>
        <span className="text-lg font-bold uppercase">{status}</span>
        <span className="text-2xl font-mono font-bold">Order #{order?.woo_order_number || orderId}</span>
        {status === 'recording' ? <span className="text-lg font-mono">{formatTime(recording.elapsed)}</span> : <span />}
      </div>

      {error && <div className="bg-destructive/10 px-6 py-2 text-sm text-destructive">{error}</div>}

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex-1 rounded-xl border-2 border-border overflow-hidden bg-black relative min-h-0">
            <video ref={camera.videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {status === 'recording' && (
              <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2">
                <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-bold text-white">REC {formatTime(recording.elapsed)}</span>
              </div>
            )}
            {camera.devices.length > 1 && status === 'ready' && (
              <select
                value={camera.selectedDeviceId}
                onChange={(e) => { camera.setSelectedDeviceId(e.target.value); camera.startPreview(e.target.value); }}
                className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white border border-white/20"
              >
                {camera.devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>)}
              </select>
            )}
          </div>

          {status === 'ready' && (
            <button onClick={handleStartRecording} className="rounded-xl bg-emerald-600 py-6 text-2xl font-bold text-white hover:bg-emerald-700 transition-colors">
              START RECORDING
            </button>
          )}
          {status === 'recording' && (
            <button
              onClick={handleStopRecording}
              disabled={items.length > 0 && checkedItems.size !== items.length}
              className="rounded-xl bg-red-600 py-6 text-2xl font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              FINISH &amp; SEAL
            </button>
          )}
          {(status === 'processing') && (
            <div className="rounded-xl bg-muted py-6 text-center"><p className="text-lg font-bold text-amber-600 animate-pulse">Processing video...</p></div>
          )}
          {status === 'done' && (
            <button onClick={handleFinish} className="rounded-xl bg-emerald-600 py-6 text-2xl font-bold text-white hover:bg-emerald-700 transition-colors">
              NEXT ORDER
            </button>
          )}
          {status === 'loading' && (
            <div className="rounded-xl bg-muted py-6 text-center"><p className="text-lg text-muted-foreground animate-pulse">Locking order...</p></div>
          )}
        </div>

        <div className="w-[380px] flex flex-col gap-3 overflow-y-auto">
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Order #{orderId}</h3>
              {order?.woo_order_number && <span className="text-xs text-muted-foreground">Woo #{order.woo_order_number}</span>}
              {order?.customer_name && <span className="text-xs text-muted-foreground">{order.customer_name}</span>}
            </div>
            {items.length > 0 ? (
              <div className="space-y-1">
                {items.map((item, i) => (
                  <button key={i} onClick={() => toggleItem(i)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm border transition-colors ${checkedItems.has(i) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'border-border hover:bg-muted/50'}`}>
                    <span className="flex items-center gap-2">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold ${checkedItems.has(i) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border'}`}>
                        {checkedItems.has(i) ? '✓' : ''}
                      </span>
                      {item.name}
                    </span>
                    <span className="font-mono text-xs">x{item.quantity}</span>
                  </button>
                ))}
                <div className="pt-2 text-right text-xs text-muted-foreground">
                  {checkedItems.size}/{items.length} verified
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No line items loaded</p>
            )}
          </div>

          {(status === 'shipping' || status === 'done') && (
            <ShippingPanel
              orderId={orderId}
              stationId={stationId}
              shippingAddress={order?.shipping_address}
              onLabelCreated={handleLabelCreated}
              onLabelVoided={() => {
                setLabelInfo(null);
                setStatus('shipping');
              }}
              preferredAccountId={order?.preferred_shipstation_account_id}
            />
          )}

          {labelInfo && status === 'done' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-xs font-bold text-emerald-700">Tracking: {labelInfo.tracking_number}</p>
              <p className="text-xs text-emerald-600">${labelInfo.shipment_cost?.toFixed(2)}</p>
            </div>
          )}

          <button onClick={handleCancel} className="rounded-lg border border-border py-2 text-xs text-muted-foreground hover:bg-muted">
            Cancel &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
}
