import { test } from '@playwright/test';

import { expectRedirectTo } from '../_helpers/redirect';

test('/prices redirects to / while FEATURE_PRICES is off', async ({ request }) => {
  await expectRedirectTo(request, '/prices', '/');
});
