import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Mock } from 'vitest';
import { expect, vi } from 'vitest';

const feature = await loadFeature('./analytics-identity.feature');

type AnyMock = Mock<(...args: unknown[]) => unknown>;
let mockGetUser: AnyMock;
let mockGetSession: AnyMock;

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        getSession: (...args: unknown[]) => mockGetSession(...args),
      },
    }),
}));

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(() => {
    vi.stubEnv('POSTHOG_HASH_SALT', 'test-salt');
    mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
    mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
  });

  Scenario(
    'a signed-in user gets a hashed analytics id from a validated token',
    ({ Given, When, Then, And }) => {
      let body: { id: string | null } | null = null;

      Given('a signed-in user', () => {
        mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-analytics-1' } } });
      });

      When('the identity route is called', async () => {
        const { GET } = await import('./route');
        const response = await GET();
        body = await response.json();
      });

      Then('the response contains a hashed id', () => {
        expect(body?.id).toEqual(expect.any(String));
        expect(body?.id).not.toBe('user-analytics-1');
      });

      And('the user was validated with the auth server', () => {
        expect(mockGetUser).toHaveBeenCalled();
        expect(mockGetSession).not.toHaveBeenCalled();
      });
    }
  );

  Scenario('an unauthenticated request gets a null id', ({ Given, When, Then }) => {
    let body: { id: string | null } | null = null;

    Given('no signed-in user', () => {
      mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
    });

    When('the identity route is called', async () => {
      const { GET } = await import('./route');
      const response = await GET();
      body = await response.json();
    });

    Then('the response id is null', () => {
      expect(body?.id).toBeNull();
    });
  });
});
