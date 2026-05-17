import { expect, test } from '@playwright/test';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

test('/status returns JSON when requested with application/json', async ({ request }) => {
  const response = await request.get('/status', {
    headers: { Accept: 'application/json' },
  });

  const status = response.status();
  expect(
    [200, 503],
    `GET /status should return 200 (healthy) or 503 (degraded), got ${status}`
  ).toContain(status);

  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).toContain('application/json');

  const body: unknown = await response.json();
  expect(isObject(body), 'status body should be a JSON object').toBe(true);
  if (!isObject(body)) return;

  if (status === 200) {
    expect(body['worker']).toBeDefined();
    expect(body['kv']).toBeDefined();
    expect(body['fpl']).toBeDefined();
  } else {
    expect(
      'error' in body || 'worker' in body,
      'degraded /status JSON should include either error or worker fields'
    ).toBe(true);
  }
});
