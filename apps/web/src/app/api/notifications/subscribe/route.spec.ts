import { describe, expect, it } from 'vitest';

import { ALLOWED_PUSH_HOSTS, isAllowedEndpoint } from './route';

describe('ALLOWED_PUSH_HOSTS', () => {
  it('includes googleapis.com, mozilla.com, and apple.com', () => {
    expect(ALLOWED_PUSH_HOSTS).toContain('googleapis.com');
    expect(ALLOWED_PUSH_HOSTS).toContain('mozilla.com');
    expect(ALLOWED_PUSH_HOSTS).toContain('apple.com');
  });
});

describe('isAllowedEndpoint — valid FCM endpoint accepted', () => {
  it('accepts https://fcm.googleapis.com/...', () => {
    expect(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/dummytoken')).toBe(true);
  });

  it('accepts https://updates.push.services.mozilla.com/...', () => {
    expect(isAllowedEndpoint('https://updates.push.services.mozilla.com/push/dummy')).toBe(true);
  });

  it('accepts https://api.push.apple.com/...', () => {
    expect(isAllowedEndpoint('https://api.push.apple.com/3/device/dummy')).toBe(true);
  });
});

describe('isAllowedEndpoint — invalid endpoints rejected', () => {
  it('rejects http:// scheme', () => {
    expect(isAllowedEndpoint('http://evil.com/push')).toBe(false);
  });

  it('rejects an off-allow-list host', () => {
    expect(isAllowedEndpoint('https://evil.com/push')).toBe(false);
  });

  it('rejects a host that merely contains an allowed suffix but is not a subdomain', () => {
    expect(isAllowedEndpoint('https://notgoogleapis.com/push')).toBe(false);
  });

  it('rejects a completely invalid URL string', () => {
    expect(isAllowedEndpoint('not-a-url')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isAllowedEndpoint('')).toBe(false);
  });
});
