import { describe, expect, it } from 'vitest';

import { sanitizeNextParam } from './next-param';

describe('sanitizeNextParam', () => {
  it('accepts a plain path', () => {
    expect(sanitizeNextParam('/leagues')).toBe('/leagues');
  });

  it('accepts a nested path', () => {
    expect(sanitizeNextParam('/leagues/123')).toBe('/leagues/123');
  });

  it('rejects a double-slash open redirect', () => {
    expect(sanitizeNextParam('//evil.com')).toBe('/leagues');
  });

  it('rejects a backslash redirect', () => {
    expect(sanitizeNextParam('/\\evil.com')).toBe('/leagues');
  });

  it('strips control characters before evaluating', () => {
    expect(sanitizeNextParam('/valid\x00path')).toBe('/validpath');
  });

  it('rejects an absolute URL', () => {
    expect(sanitizeNextParam('https://evil.com')).toBe('/leagues');
  });

  it('falls back when null', () => {
    expect(sanitizeNextParam(null)).toBe('/leagues');
  });

  it('falls back on empty string', () => {
    expect(sanitizeNextParam('')).toBe('/leagues');
  });
});
