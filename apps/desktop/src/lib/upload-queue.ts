interface UploadJob {
  id: string;
  videoId: string;
  sessionId: string;
  filePath: string;
  fileSize?: number;
  uploadUrl: string;
  uploadToken: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: number;
}

type QueueListener = (jobs: UploadJob[]) => void;

const MAX_RETRIES = 5;
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000];

class UploadQueue {
  private jobs: UploadJob[] = [];
  private processing = false;
  private listeners: QueueListener[] = [];

  subscribe(listener: QueueListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.jobs]));
  }

  async enqueue(job: Omit<UploadJob, 'status' | 'attempts' | 'createdAt'>) {
    this.jobs.push({
      ...job,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    });
    this.notify();
    this.process();
  }

  getJobs() {
    return [...this.jobs];
  }

  getPendingCount() {
    return this.jobs.filter((j) => j.status === 'pending' || j.status === 'uploading').length;
  }

  private async process() {
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
          job.status = 'completed';
          // Clean up local file
          await window.electronAPI.deleteVideo(job.sessionId);
          this.notify();

          // Finalize on backend
          const { api } = await import('./api');
          await api.finalizeVideo(job.videoId, {
            file_size_bytes: job.fileSize,
          });
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
    const job = this.jobs.find((j) => j.id === jobId);
    if (job && job.status === 'failed') {
      job.status = 'pending';
      job.attempts = 0;
      this.notify();
      this.process();
    }
  }
}

export const uploadQueue = new UploadQueue();
