/**
 * Minimal in-memory sliding-window rate limiter (spec §6).
 * Good enough to stop a single client from flooding the public endpoint.
 * NOTE: counters live per server instance — for multi-instance production
 * deployments use a shared store (e.g. Upstash Redis) instead.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

function prune(bucket: Bucket, windowMs: number, now: number) {
  const cutoff = now - windowMs;
  while (bucket.hits.length > 0 && bucket.hits[0] <= cutoff) {
    bucket.hits.shift();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  prune(bucket, windowMs, now);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push(now);

  // Opportunistic memory hygiene.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      prune(b, windowMs, now);
      if (b.hits.length === 0) buckets.delete(k);
      if (buckets.size < 5_000) break;
    }
  }

  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export const PUBLIC_CREATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5/hour per IP
export const STATUS_LOOKUP_LIMIT = { limit: 30, windowMs: 60 * 1000 }; // 30/min per IP
