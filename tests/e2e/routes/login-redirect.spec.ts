import { test } from '@playwright/test';

import { expectRedirectTo } from '../_helpers/redirect';

test('/login redirects to / while FEATURE_AUTH is off', async ({ request }) => {
  await expectRedirectTo(request, '/login', '/');
});
