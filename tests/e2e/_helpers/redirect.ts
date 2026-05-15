import { type APIRequestContext, expect } from '@playwright/test';

export async function expectRedirectTo(
  request: APIRequestContext,
  fromPath: string,
  expectedPathname: string
): Promise<void> {
  const response = await request.get(fromPath, { maxRedirects: 0 });
  const status = response.status();

  expect(
    status >= 300 && status < 400,
    `GET ${fromPath} should be a 3xx redirect, got ${status}`
  ).toBe(true);

  const location = response.headers()['location'];
  expect(location, `GET ${fromPath} should set a Location header`).toBeTruthy();

  const target = new URL(location ?? '', 'http://localhost:3000');
  expect(target.pathname, `GET ${fromPath} should redirect to ${expectedPathname}`).toBe(
    expectedPathname
  );
}
