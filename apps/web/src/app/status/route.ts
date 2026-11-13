export const dynamic = 'force-dynamic';

interface StatusPayload {
  worker: string;
  kv: string;
  fpl: string;
  durable_object: string;
  version: string;
  timestamp: string;
}

interface StatusResult {
  ok: boolean;
  httpStatus: number;
  payload: StatusPayload | null;
  error: string | null;
  workerUrl: string;
}

function isStatusPayload(value: unknown): value is StatusPayload {
  if (typeof value !== 'object' || value === null) return false;
  const obj: Record<string, unknown> = { ...value };
  return (
    typeof obj['worker'] === 'string' &&
    typeof obj['kv'] === 'string' &&
    typeof obj['fpl'] === 'string' &&
    typeof obj['durable_object'] === 'string' &&
    typeof obj['version'] === 'string' &&
    typeof obj['timestamp'] === 'string'
  );
}

async function fetchStatus(): Promise<StatusResult> {
  const workerUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
  try {
    const res = await fetch(`${workerUrl}/status`, { cache: 'no-store' });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        httpStatus: res.status,
        payload: null,
        error: `Non-JSON response from worker: ${text.slice(0, 200)}`,
        workerUrl,
      };
    }
    if (!isStatusPayload(parsed)) {
      return {
        ok: false,
        httpStatus: res.status,
        payload: null,
        error: `Worker response missing required fields`,
        workerUrl,
      };
    }
    return { ok: res.ok, httpStatus: res.status, payload: parsed, error: null, workerUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      httpStatus: 0,
      payload: null,
      error: `Failed to reach worker: ${msg}`,
      workerUrl,
    };
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusColor(value: string): string {
  if (value === 'ok') return '#15803d';
  if (value === 'degraded') return '#b45309';
  return '#b91c1c';
}

function pill(value: string): string {
  const color = statusColor(value);
  const safe = escapeHtml(value);
  return `<span class="pill" style="color:${color};background:${color}15">${safe}</span>`;
}

const ROWS: Array<{ key: keyof StatusPayload; label: string }> = [
  { key: 'worker', label: 'Worker' },
  { key: 'kv', label: 'KV (FPL_CACHE)' },
  { key: 'fpl', label: 'FPL upstream' },
  { key: 'durable_object', label: 'Durable Object (LiveGwDO)' },
];

function renderHtml(result: StatusResult): string {
  const overall = result.ok ? 'ok' : 'down';
  const errBlock = result.error ? `<div class="err">${escapeHtml(result.error)}</div>` : '';

  const rows = ROWS.map(({ key, label }) => {
    const value = result.payload?.[key] ?? 'unknown';
    return `<tr><td>${label}</td><td>${pill(value)}</td></tr>`;
  }).join('');

  const version = escapeHtml(result.payload?.version ?? 'unknown');
  const timestamp = escapeHtml(result.payload?.timestamp ?? new Date().toISOString());
  const workerUrl = escapeHtml(result.workerUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Status — SimplyFPL</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         background:#F7F7F5; color:#1a1a1a; margin:0; padding:48px 24px; }
  .wrap { max-width:640px; margin:0 auto; }
  h1 { font-size:24px; font-weight:600; margin:0 0 8px; }
  .meta { font-size:13px; color:#666; margin:0 0 24px; }
  table { width:100%; border-collapse:collapse; border:1px solid #e5e5e2; background:#fff; font-size:14px; }
  th { text-align:left; padding:10px 14px; border-bottom:1px solid #e5e5e2;
       font-weight:500; color:#666; background:#fafafa; }
  td { padding:10px 14px; border-bottom:1px solid #f0f0ee; }
  .pill { display:inline-block; padding:2px 8px; border-radius:4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:13px; }
  .err { padding:12px 14px; border:1px solid #fecaca; background:#fef2f2; color:#991b1b;
         border-radius:4px; margin-bottom:16px; font-size:13px; }
  .footer { margin-top:16px; font-size:12px; color:#666;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
</style>
</head>
<body>
<main class="wrap">
  <h1>SimplyFPL status</h1>
  <p class="meta">Overall: ${pill(overall)} · HTTP ${result.httpStatus} · Worker: ${workerUrl}</p>
  ${errBlock}
  <table>
    <thead><tr><th>Subsystem</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">version: ${version} · checked: ${timestamp}</div>
</main>
</body>
</html>`;
}

export async function GET(request: Request): Promise<Response> {
  const result = await fetchStatus();
  const accept = request.headers.get('Accept') ?? '';
  const wantsJson = accept.includes('application/json');

  const httpStatus = result.ok ? 200 : 503;

  if (wantsJson) {
    const body = result.payload ?? { error: result.error ?? 'unknown' };
    return new Response(JSON.stringify(body, null, 2), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(renderHtml(result), {
    status: httpStatus,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
