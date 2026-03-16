interface Props {
  status: 'ready' | 'busy' | 'error' | 'offline';
  stationName?: string;
  issueCode?: string | null;
  issueSummary?: string | null;
}

const statusConfig = {
  ready: { bg: 'bg-success', text: 'READY', dot: true },
  busy: { bg: 'bg-warning', text: 'BUSY', dot: true },
  error: { bg: 'bg-destructive', text: 'ERROR', dot: false },
  offline: { bg: 'bg-muted', text: 'OFFLINE', dot: false },
};

export function StatusBanner({ status, stationName, issueCode, issueSummary }: Props) {
  const config = statusConfig[status];
  
  return (
    <div className={`flex items-center justify-between px-6 py-2 ${config.bg} text-white`}>
      <div className="flex items-center gap-3">
        {config.dot && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
        <div>
          <span className="text-sm font-bold uppercase tracking-wider">
            {config.text}{issueCode ? ` · ${issueCode}` : ''}
          </span>
          {status === 'error' && issueSummary && (
            <p className="text-xs text-white/90">{issueSummary}</p>
          )}
        </div>
      </div>
      {stationName && (
        <span className="text-sm font-medium">{stationName}</span>
      )}
    </div>
  );
}
