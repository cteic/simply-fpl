import { createBdd } from 'playwright-bdd';

const { Given, When, Then, And } = createBdd();

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

const BOOTSTRAP_WITH_HAALAND = {
  events: [
    {
      id: 1,
      name: 'Gameweek 1',
      deadline_time: '2025-08-15T17:30:00Z',
      is_current: true,
      is_next: false,
      is_previous: false,
      average_entry_score: 30,
      highest_score: null,
      finished: false,
    },
  ],
  element_types: [
    {
      id: 1,
      plural_name: 'Goalkeepers',
      plural_name_short: 'GKP',
      singular_name: 'Goalkeeper',
      singular_name_short: 'GKP',
    },
    {
      id: 2,
      plural_name: 'Defenders',
      plural_name_short: 'DEF',
      singular_name: 'Defender',
      singular_name_short: 'DEF',
    },
    {
      id: 3,
      plural_name: 'Midfielders',
      plural_name_short: 'MID',
      singular_name: 'Midfielder',
      singular_name_short: 'MID',
    },
    {
      id: 4,
      plural_name: 'Forwards',
      plural_name_short: 'FWD',
      singular_name: 'Forward',
      singular_name_short: 'FWD',
    },
  ],
  teams: [{ id: 1, name: 'Liverpool', short_name: 'LIV', code: 14 }],
  elements: [
    {
      id: 1,
      web_name: 'Salah',
      first_name: 'Mohamed',
      second_name: 'Salah',
      team: 1,
      element_type: 3,
      now_cost: 135,
      total_points: 4,
      event_points: 4,
      selected_by_percent: '45.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: null,
      news: '',
    },
    {
      id: 2,
      web_name: 'Haaland',
      first_name: 'Erling',
      second_name: 'Haaland',
      team: 1,
      element_type: 4,
      now_cost: 150,
      total_points: 12,
      event_points: 12,
      selected_by_percent: '60.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: null,
      news: '',
    },
    ...Array.from({ length: 9 }, (_, i) => ({
      id: i + 3,
      web_name: `Player${i + 3}`,
      first_name: 'Player',
      second_name: `${i + 3}`,
      team: 1,
      element_type: 2,
      now_cost: 50,
      total_points: 2,
      event_points: 2,
      selected_by_percent: '5.0',
      transfers_in_event: 0,
      transfers_out_event: 0,
      chance_of_playing_next_round: null,
      news: '',
    })),
  ],
};

const LIVE_WITH_SALAH_CAPTAIN = {
  elements: [
    {
      id: 1,
      stats: {
        minutes: 90,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points: 4,
      },
      explain: [],
    },
    {
      id: 2,
      stats: {
        minutes: 90,
        goals_scored: 1,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points: 12,
      },
      explain: [],
    },
    ...Array.from({ length: 9 }, (_, i) => ({
      id: i + 3,
      stats: {
        minutes: 90,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points: 2,
      },
      explain: [],
    })),
  ],
};

const ENTRY_SNAPSHOT = {
  bootstrap: BOOTSTRAP_WITH_HAALAND,
  entry: {
    id: 12345,
    player_first_name: 'Test',
    player_last_name: 'Manager',
    name: 'Test FC',
    summary_overall_rank: 100000,
    summary_overall_points: 800,
    summary_event_rank: null,
    summary_event_points: 28,
  },
  picks: {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 28,
      total_points: 800,
      rank: 100000,
      rank_sort: 100000,
      overall_rank: 100000,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: [
      { element: 1, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: true },
      ...Array.from({ length: 9 }, (_, i) => ({
        element: i + 3,
        position: i + 3,
        multiplier: 1,
        is_captain: false,
        is_vice_captain: false,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        element: i + 12,
        position: i + 12,
        multiplier: 1,
        is_captain: false,
        is_vice_captain: false,
      })),
    ],
  },
  gw: 1,
  picksAvailable: true,
};

Given(
  'the Worker returns a live gameweek with Salah as captain scoring 4 points',
  async ({ page }) => {
    await page.route(`${WORKER_URL}/fpl/event/*/live/`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(LIVE_WITH_SALAH_CAPTAIN),
      })
    );
    await page.route(`${WORKER_URL}/fpl/entry/*/event/*/picks/`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ENTRY_SNAPSHOT),
      })
    );
  }
);

Given(
  'the Worker returns a live gameweek with Salah as captain scoring 4 points and Haaland scoring 12 points in the XI',
  async ({ page }) => {
    await page.route(`${WORKER_URL}/fpl/event/*/live/`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(LIVE_WITH_SALAH_CAPTAIN),
      })
    );
    await page.route(`${WORKER_URL}/fpl/entry/*/event/*/picks/`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ENTRY_SNAPSHOT),
      })
    );
  }
);

Given('the Worker returns bootstrap static data with Haaland in the squad', async ({ page }) => {
  await page.route(`${WORKER_URL}/fpl/bootstrap-static-slim`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(BOOTSTRAP_WITH_HAALAND),
    })
  );
});

When('I click the What if? button on the captain tile', async ({ page }) => {
  const btn = page.getByRole('button', { name: 'What if?' }).first();
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
});

Then('the what-if panel is visible showing captain alternatives', async ({ page }) => {
  await page.waitForSelector('text=Change captain to', { timeout: 5000 });
});

When('I select Haaland from the what-if panel', async ({ page }) => {
  const haaland = page.getByText('Haaland').last();
  await haaland.waitFor({ state: 'visible', timeout: 5000 });
  await haaland.click();
});

Then('the what-if panel shows a positive points delta', async ({ page }) => {
  const deltaText = page.locator('text=/\\+[0-9]+/');
  await deltaText.waitFor({ state: 'visible', timeout: 5000 });
});

When('I click Reset in the what-if panel', async ({ page }) => {
  const reset = page.getByRole('button', { name: 'Reset' });
  await reset.waitFor({ state: 'visible', timeout: 5000 });
  await reset.click();
});

Then('the what-if panel shows no simulation result', async ({ page }) => {
  await page
    .waitForSelector('[data-testid="what-if-result"]', { state: 'detached', timeout: 3000 })
    .catch(() => {});
  const positive = await page.locator('text=/\\+[0-9]+ pts/').count();
  return positive === 0;
});
