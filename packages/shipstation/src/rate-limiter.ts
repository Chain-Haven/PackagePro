export class RateLimiter {
  private static buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private readonly bucketKey: string;

  constructor(maxPerMinute: number, bucketKey: string) {
    this.maxTokens = maxPerMinute;
    this.refillRate = maxPerMinute / 60000;
    this.bucketKey = bucketKey;

    if (!RateLimiter.buckets.has(bucketKey)) {
      RateLimiter.buckets.set(bucketKey, {
        tokens: maxPerMinute,
        lastRefill: Date.now(),
      });
    }
  }

  async acquire(): Promise<void> {
    this.refill();
    const bucket = RateLimiter.buckets.get(this.bucketKey)!;
    if (bucket.tokens < 1) {
      const waitMs = (1 - bucket.tokens) / this.refillRate;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.refill();
    }
    RateLimiter.buckets.get(this.bucketKey)!.tokens -= 1;
  }

  private refill(): void {
    const bucket = RateLimiter.buckets.get(this.bucketKey)!;
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;
  }
}
