import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: { tier: 'pro' }, error: null }) }),
        }),
      }),
    }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      upsert: (row: unknown) => {
        upsert(row);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

function putRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/notifications/prefs', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

describe('PUT /api/notifications/prefs', () => {
  beforeEach(() => upsert.mockReset());

  it('saves the price drop and player availability toggles', async () => {
    const { PUT } = await import('./route');
    await PUT(putRequest({ price_drop: true, player_availability_changed: false }));
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ price_drop: true, player_availability_changed: false })
    );
  });
});
