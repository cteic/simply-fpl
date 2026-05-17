import { test } from '@playwright/test';

import { expectRedirectTo } from '../_helpers/redirect';

test('/settings redirects to / while FEATURE_AUTH is off', async ({ request }) => {
  await expectRedirectTo(request, '/settings', '/');
});
