import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  finalizeVideo: vi.fn(),
  refreshUploadUrl: vi.fn(),
}));

vi.mock('../api', () => ({
  api: {
    finalizeVideo: apiMocks.finalizeVideo,
    refreshUploadUrl: apiMocks.refreshUploadUrl,
  },
}));

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }

  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
}

function createWindow(uploadFile: ReturnType<typeof vi.fn>) {
  const localStorage = new MemoryStorage();
  const electronAPI = {
    uploadFile,
    deleteVideo: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage,
      electronAPI,
    } as unknown as Window,
    configurable: true,
    writable: true,
  });

  return { localStorage, electronAPI };
}

describe('uploadQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    apiMocks.finalizeVideo.mockReset();
    apiMocks.refreshUploadUrl.mockReset();
    apiMocks.finalizeVideo.mockResolvedValue({ success: true });
    apiMocks.refreshUploadUrl.mockResolvedValue({
      upload_url: 'https://fresh-upload-url.example',
      token: 'fresh-upload-token',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('does not persist live upload credentials to localStorage', async () => {
    const uploadFile = vi.fn(() => new Promise(() => {}));
    const { localStorage } = createWindow(uploadFile);
    const { uploadQueue } = await import('../upload-queue');

    await uploadQueue.enqueue({
      id: 'job-1',
      videoId: 'video-1',
      sessionId: 'session-1',
      filePath: '/tmp/recording.enc',
      fileSize: 128,
      uploadUrl: 'https://stale-upload-url.example',
      uploadToken: 'stale-upload-token',
    });

    const persisted = JSON.parse(localStorage.getItem('packagepro-upload-queue') ?? '[]') as Array<
      Record<string, unknown>
    >;

    expect(persisted).toHaveLength(1);
    expect(persisted[0]).not.toHaveProperty('uploadUrl');
    expect(persisted[0]).not.toHaveProperty('uploadToken');
  });

  it('refreshes upload credentials before retrying an expired upload', async () => {
    const uploadFile = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: 'Upload failed: 403 expired token' })
      .mockResolvedValueOnce({ success: true });

    createWindow(uploadFile);
    const { uploadQueue } = await import('../upload-queue');

    await uploadQueue.enqueue({
      id: 'job-2',
      videoId: 'video-2',
      sessionId: 'session-2',
      filePath: '/tmp/recording.enc',
      fileSize: 256,
      uploadUrl: 'https://stale-upload-url.example',
      uploadToken: 'stale-upload-token',
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(apiMocks.refreshUploadUrl).toHaveBeenCalledWith('video-2');
    expect(uploadFile).toHaveBeenNthCalledWith(
      2,
      '/tmp/recording.enc',
      'https://fresh-upload-url.example',
      'fresh-upload-token'
    );
  });

  it('processes newly enqueued jobs while another job is waiting to retry', async () => {
    const uploadFile = vi.fn(async (filePath: string) => {
      if (filePath === '/tmp/first.enc') {
        return { success: false, error: 'Upload failed: network error' };
      }

      return { success: true };
    });

    createWindow(uploadFile);
    const { uploadQueue } = await import('../upload-queue');

    await uploadQueue.enqueue({
      id: 'job-3',
      videoId: 'video-3',
      sessionId: 'session-3',
      filePath: '/tmp/first.enc',
      fileSize: 128,
      uploadUrl: 'https://upload-first.example',
      uploadToken: 'token-first',
    });
    await Promise.resolve();

    await uploadQueue.enqueue({
      id: 'job-4',
      videoId: 'video-4',
      sessionId: 'session-4',
      filePath: '/tmp/second.enc',
      fileSize: 256,
      uploadUrl: 'https://upload-second.example',
      uploadToken: 'token-second',
    });
    await Promise.resolve();

    expect(uploadFile).toHaveBeenNthCalledWith(
      2,
      '/tmp/second.enc',
      'https://upload-second.example',
      'token-second'
    );
  });
});
