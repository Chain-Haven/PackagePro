import { describe, expect, it, vi } from 'vitest';

describe('fetchWithTimeout', () => {
  it('passes through a successful response', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 }));
    const { fetchWithTimeout } = await import('../videos/fetch-with-timeout');

    const response = await fetchWithTimeout('https://example.com', {}, 1000, fetchImpl);

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('aborts a hanging request after the timeout', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        })
    );
    const { fetchWithTimeout } = await import('../videos/fetch-with-timeout');

    const pending = expect(
      fetchWithTimeout('https://example.com', {}, 1000, fetchImpl)
    ).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(1000);

    await pending;
    vi.useRealTimers();
  });
});
