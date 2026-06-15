export type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchWithTimeout(
  url: string | URL,
  timeoutMs: number
): Promise<FetchResult<ArrayBuffer>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.arrayBuffer();
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
