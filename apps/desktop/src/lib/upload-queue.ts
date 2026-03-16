interface UploadJob {
  id: string;
  videoId: string;
  sessionId: string;
  filePath: string;
  fileSize?: number;
  uploadUrl: string;
  uploadToken: string;
  status: 'pending' | 'uploading' | 'finalizing' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: number;
}

type QueueListener = (jobs: UploadJob[]) => void;

const MAX_RETRIES = 5;
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000];
const STORAGE_KEY = 'packagepro-upload-queue';

class UploadQueue {
  private jobs: UploadJob[] = [];
  private processing = false;
  private listeners: QueueListener[] = [];
  private hydrated = false;

  private hydrate() {
    if (this.hydrated || typeof window === 'undefined') return;
    this.hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as UploadJob[];
      this.jobs = parsed.map((job) => ({
        ...job,
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
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

  private async process() {
    this.hydrate();
    if (this.processing) return;
    this.processing = true;

    while (true) {
      const job = this.jobs.find((j) => j.status === 'pending');
      if (!job) break;

      job.status = 'uploading';
      job.attempts++;
      this.notify();

      try {
        const result = await window.electronAPI.uploadFile(
          job.filePath,
          job.uploadUrl,
          job.uploadToken
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
        if (job.attempts >= MAX_RETRIES) {
          job.status = 'failed';
        } else {
          job.status = 'pending';
          const delay = RETRY_DELAYS[Math.min(job.attempts - 1, RETRY_DELAYS.length - 1)];
          await new Promise((r) => setTimeout(r, delay));
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
      this.notify();
      void this.process();
    }
  }
}

export const uploadQueue = new UploadQueue();
