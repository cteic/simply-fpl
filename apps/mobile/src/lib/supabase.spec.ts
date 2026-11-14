import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

describe('mobile Supabase client', () => {
  it('uses the PKCE flow the magic-link callback expects', async () => {
    const { SUPABASE_AUTH_OPTIONS } = await import('./supabase');
    expect(SUPABASE_AUTH_OPTIONS.flowType).toBe('pkce');
  });
});
