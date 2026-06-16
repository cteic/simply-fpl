export interface KvStore {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

function isRateLimitRecord(value: unknown): value is RateLimitRecord {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'count' in value &&
    typeof value.count === 'number' &&
    'windowStart' in value &&
    typeof value.windowStart === 'number'
  );
}

export async function checkRateLimit(
  kv: KvStore,
  key: string,
  limit: number,
  windowSecs: number,
  now: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const existing = await kv.get(key, 'json');

  if (!isRateLimitRecord(existing)) {
    await kv.put(key, JSON.stringify({ count: 1, windowStart: now }), {
      expirationTtl: windowSecs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const elapsed = (now - existing.windowStart) / 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil(windowSecs - elapsed));
    return { allowed: false, retryAfterSeconds };
  }

  await kv.put(
    key,
    JSON.stringify({ count: existing.count + 1, windowStart: existing.windowStart }),
    { expirationTtl: windowSecs }
  );
  return { allowed: true, retryAfterSeconds: 0 };
}
