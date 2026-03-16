'use client';

import { useState, useEffect } from 'react';

interface ViewerData {
  playback_url?: string;
  order_number?: string;
  store_name?: string;
  recorded_at?: string;
  requires_verification?: boolean;
  error?: string;
}

export function ViewerClient({ token }: { token: string }) {
  const [data, setData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchViewerData();
  }, [token]);

  async function fetchViewerData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/viewer/${token}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load video');
      } else {
        setData(json);
      }
    } catch {
      setError('Failed to connect');
    }
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError('');
    try {
      const res = await fetch(`/api/viewer/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          postal_code: postalCode || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Verification failed');
      } else {
        setData(json);
      }
    } catch {
      setError('Verification failed');
    }
    setVerifying(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold">Video Unavailable</h1>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (data?.requires_verification) {
    return (
      <div className="mx-auto max-w-md py-20">
        <h1 className="mb-2 text-center text-2xl font-bold">Verify Your Identity</h1>
        <p className="mb-6 text-center text-gray-400">
          Please verify your identity to view the packing video for order #
          {data.order_number}
        </p>
        {error && (
          <div className="mb-4 rounded bg-red-500/20 p-3 text-sm text-red-400">{error}</div>
        )}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Billing Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              placeholder="your@email.com"
            />
          </div>
          <div className="text-center text-sm text-gray-500">or</div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Shipping ZIP/Postal Code
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              placeholder="12345"
            />
          </div>
          <button
            type="submit"
            disabled={verifying || (!email && !postalCode)}
            className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify & Watch'}
          </button>
        </form>
      </div>
    );
  }

  if (data?.playback_url) {
    return (
      <div>
        <div className="mb-6 text-center">
          <p className="mb-1 text-sm text-gray-400">{data.store_name}</p>
          <h1 className="text-2xl font-bold">Order #{data.order_number} Packing Video</h1>
          {data.recorded_at && (
            <p className="mt-1 text-sm text-gray-400">
              Recorded {new Date(data.recorded_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <video
            src={data.playback_url}
            controls
            autoPlay={false}
            playsInline
            className="h-full w-full"
          />
        </div>
        <p className="mt-4 text-center text-xs text-gray-500">
          This video shows your order being packed for shipment.
        </p>
      </div>
    );
  }

  return null;
}
