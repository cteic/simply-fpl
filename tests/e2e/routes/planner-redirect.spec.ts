import { test } from '@playwright/test';

import { expectRedirectTo } from '../_helpers/redirect';

test('/planner redirects to / while FEATURE_PLANNER is off', async ({ request }) => {
  await expectRedirectTo(request, '/planner', '/');
});
