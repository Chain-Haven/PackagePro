import { useState, useEffect } from 'react';
import { ScannerInput } from '../components/ScannerInput';
import { StatusBanner } from '../components/StatusBanner';
import { uploadQueue } from '../lib/upload-queue';

interface Props {
  stationId: string;
  onStartPacking: (orderId: string) => void;
}

export function DashboardScreen({ stationId, onStartPacking }: Props) {
  const [stationStatus] = useState<'ready' | 'busy' | 'error'>('ready');
  const [pendingUploads, setPendingUploads] = useState(0);

  useEffect(() => {
    const unsub = uploadQueue.subscribe((jobs) => {
      setPendingUploads(jobs.filter((j) => j.status !== 'completed').length);
    });
    return unsub;
  }, []);

  function handleScan(barcode: string) {
    onStartPacking(barcode);
  }

  return (
    <div className="flex flex-1 flex-col">
      <StatusBanner
        status={stationStatus}
        stationName={stationId ? `Station ${stationId.slice(0, 8)}` : undefined}
      />

      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-4xl font-bold">Packing Station</h1>
        <p className="text-xl text-muted-foreground">Scan an order barcode to begin</p>

        <ScannerInput onScan={handleScan} />

        <div className="grid w-full max-w-2xl gap-4 md:grid-cols-3">
          <StatCard label="Pending Orders" value="—" />
          <StatCard label="Packed Today" value="—" />
          <StatCard label="Uploads Pending" value={String(pendingUploads)} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-6 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
