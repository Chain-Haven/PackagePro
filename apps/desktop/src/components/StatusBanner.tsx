interface Props {
  status: 'ready' | 'busy' | 'error' | 'offline';
  stationName?: string;
}

const statusConfig = {
  ready: { bg: 'bg-success', text: 'READY', dot: true },
  busy: { bg: 'bg-warning', text: 'BUSY', dot: true },
  error: { bg: 'bg-destructive', text: 'ERROR', dot: false },
  offline: { bg: 'bg-muted', text: 'OFFLINE', dot: false },
};

export function StatusBanner({ status, stationName }: Props) {
  const config = statusConfig[status];
  
  return (
    <div className={`flex items-center justify-between px-6 py-2 ${config.bg} text-white`}>
      <div className="flex items-center gap-2">
        {config.dot && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
        <span className="text-sm font-bold uppercase tracking-wider">{config.text}</span>
      </div>
      {stationName && (
        <span className="text-sm font-medium">{stationName}</span>
      )}
    </div>
  );
}
