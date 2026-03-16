interface UploadJob {
  id: string;
  videoId: string;
  sessionId: string;
  filePath: string;
  fileSize?: number;
  uploadUrl?: string;
  uploadToken?: string;
  status: 'pending' | 'uploading' | 'finalizing' | 'completed' | 'failed';
  attempts: number;
  nextRetryAt?: number;
  lastError?: string;
  createdAt: number;
}

type PersistedUploadJob = Omit<UploadJob, 'uploadUrl' | 'uploadToken'>;
type QueueListener = (jobs: UploadJob[]) => void;

const MAX_RETRIES = 5;
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000];
const STORAGE_KEY = 'packagepro-upload-queue';

class UploadQueue {
  private jobs: UploadJob[] = [];
  private processing = false;
  private listeners: QueueListener[] = [];
  private hydrated = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private hydrate() {
    if (this.hydrated || typeof window === 'undefined') return;
    this.hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedUploadJob[];
      this.jobs = parsed.map((job) => ({
        ...job,
        uploadUrl: undefined,
        uploadToken: undefined,
        status:
          job.status === 'uploading' || job.status === 'finalizing'
            ? 'pending'
            : job.status,
      }));
    } catch {
      this.jobs = [];
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    const persistedJobs: PersistedUploadJob[] = this.jobs.map(
      ({ uploadUrl: _uploadUrl, uploadToken: _uploadToken, ...job }) => job
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedJobs));
  }

  subscribe(listener: QueueListener) {
    this.hydrate();
    this.listeners.push(listener);
    listener([...this.jobs]);
    this.process();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.persist();
    this.listeners.forEach((l) => l([...this.jobs]));
  }

  private scheduleProcess(delayMs = 0) {
    if (typeof window === 'undefined') return;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.process();
    }, delayMs);
  }

  async enqueue(job: Omit<UploadJob, 'status' | 'attempts' | 'createdAt'>) {
    this.hydrate();
    const queuedJob: UploadJob = {
      ...job,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    };
    this.jobs.push(queuedJob);
    this.notify();
    void this.process();
    return queuedJob.id;
  }

  getJobs() {
    this.hydrate();
    return [...this.jobs];
  }

  getPendingCount() {
    this.hydrate();
    return this.jobs.filter((j) => ['pending', 'uploading', 'finalizing'].includes(j.status)).length;
  }

  getJob(jobId: string) {
    this.hydrate();
    return this.jobs.find((job) => job.id === jobId) ?? null;
  }

  private async ensureUploadCredentials(job: UploadJob) {
    if (job.uploadUrl && job.uploadToken) {
      return;
    }

    const { api } = await import('./api');
    const refreshed = await api.refreshUploadUrl(job.videoId);
    job.uploadUrl = refreshed.upload_url;
    job.uploadToken = refreshed.token;
  }

  private shouldRefreshUploadCredentials(error: string) {
    const normalized = error.toLowerCase();
    return (
      normalized.includes('401') ||
      normalized.includes('403') ||
      normalized.includes('expired') ||
      normalized.includes('signature')
    );
  }

  private async refreshUploadCredentials(job: UploadJob) {
    const { api } = await import('./api');
    const refreshed = await api.refreshUploadUrl(job.videoId);
    job.uploadUrl = refreshed.upload_url;
    job.uploadToken = refreshed.token;
  }

  private async process() {
    this.hydrate();
    if (this.processing) return;
    this.processing = true;

    while (true) {
      const now = Date.now();
      const job = this.jobs.find(
        (j) => j.status === 'pending' && (!j.nextRetryAt || j.nextRetryAt <= now)
      );
      if (!job) {
        const nextRetryAt = this.jobs
          .filter((j) => j.status === 'pending' && typeof j.nextRetryAt === 'number')
          .reduce<number | null>((soonest, entry) => {
            if (typeof entry.nextRetryAt !== 'number') return soonest;
            if (soonest === null) return entry.nextRetryAt;
            return Math.min(soonest, entry.nextRetryAt);
          }, null);

        if (nextRetryAt !== null) {
          this.scheduleProcess(Math.max(nextRetryAt - now, 0));
        }
        break;
      }

      job.status = 'uploading';
      job.attempts++;
      job.nextRetryAt = undefined;
      this.notify();

      try {
        await this.ensureUploadCredentials(job);
        const result = await window.electronAPI.uploadFile(
          job.filePath,
          job.uploadUrl || '',
          job.uploadToken || ''
        );

        if (result.success) {
          job.status = 'finalizing';
          this.notify();

          const { api } = await import('./api');
          await api.finalizeVideo(job.videoId, {
            file_size_bytes: job.fileSize,
          });
          job.status = 'completed';
          job.lastError = undefined;
          await window.electronAPI.deleteVideo(job.sessionId);
          this.notify();
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (err) {
        job.lastError = String(err);
        if (this.shouldRefreshUploadCredentials(job.lastError)) {
          try {
            await this.refreshUploadCredentials(job);
          } catch (refreshError) {
            job.uploadUrl = undefined;
            job.uploadToken = undefined;
            job.lastError = `${job.lastError}; refresh failed: ${String(refreshError)}`;
          }
        }
        if (job.attempts >= MAX_RETRIES) {
          job.status = 'failed';
          job.nextRetryAt = undefined;
        } else {
          job.status = 'pending';
          const delay = RETRY_DELAYS[Math.min(job.attempts - 1, RETRY_DELAYS.length - 1)];
          job.nextRetryAt = Date.now() + delay;
          this.scheduleProcess(delay);
        }
        this.notify();
      }
    }

    this.processing = false;
  }

  async retryFailed(jobId: string) {
    this.hydrate();
    const job = this.jobs.find((j) => j.id === jobId);
    if (job && job.status === 'failed') {
      job.status = 'pending';
      job.attempts = 0;
      job.nextRetryAt = undefined;
      this.notify();
      void this.process();
    }
  }
}

export const uploadQueue = new UploadQueue();
