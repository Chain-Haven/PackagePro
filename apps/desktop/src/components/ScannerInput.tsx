import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onScan: (barcode: string) => void;
  prefix?: string;
}

export function ScannerInput({ onScan }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [buffer, setBuffer] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleScan = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        onScan(trimmed);
      }
    },
    [onScan]
  );

  useEffect(() => {
    inputRef.current?.focus();

    function refocus() {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }
    const interval = setInterval(refocus, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(buffer);
      setBuffer('');
      return;
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setBuffer(value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (value.length > 3) {
        handleScan(value);
        setBuffer('');
      }
    }, 100);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={buffer}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="absolute opacity-0 w-0 h-0"
        aria-label="Barcode scanner input"
        autoFocus
      />
      <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-4 text-muted-foreground">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        <span>Ready for barcode scan...</span>
      </div>
    </div>
  );
}
