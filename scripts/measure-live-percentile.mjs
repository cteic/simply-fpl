#!/usr/bin/env node
// Ops-only probe: does FPL's own `percentile_rank` move during a live gameweek?
//
// FPL's `/api/entry/{id}/history/` and `/api/entry/{id}/event/{gw}/picks/`
// both return two fields we do not model or consume: `percentile_rank` (a
// band drawn from `game_config.rules.percentile_ranks`, so 1/5/10/.../95) and
// `overall_rank_percentage` (overall rank as a whole-number percentage). Both
// are populated for settled gameweeks. Whether they update while a gameweek is
// in flight decides whether FPL now ships a live rank signal of its own, and
// that question is only answerable from inside a live gameweek.
//
// This script answers it with data. It appends one JSONL row per entry per
// poll to `var/live-percentile/<season>-gw<NN>.jsonl`, recording FPL's fields
// alongside the entry's live points, so the series can be replayed offline
// against our own estimator afterwards.
//
// It talks to FPL directly rather than through the Worker on purpose: it is an
// ops measurement, not product code, and must not perturb the LiveGwDO
// fan-out. Do not import it from anything that ships.
//
// Usage:
//   node scripts/measure-live-percentile.mjs --entries=219895,4173513
//   node scripts/measure-live-percentile.mjs --entries=219895 --interval=120 --until=2026-11-27T23:00:00Z
//   node scripts/measure-live-percentile.mjs --entries=219895 --once
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FPL_BASE = 'https://fantasy.premierleague.com/api';
const USER_AGENT = 'simplyfpl-ops-probe';
const DEFAULT_INTERVAL_SECONDS = 120;
const MIN_INTERVAL_SECONDS = 30;

function parseArgs(argv) {
  const out = { entries: [], interval: DEFAULT_INTERVAL_SECONDS, until: null, once: false };
  for (const arg of argv) {
    if (arg === '--once') {
      out.once = true;
      continue;
    }
    const match = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'entries') {
      out.entries = value
        .split(',')
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isInteger(id) && id > 0);
    } else if (key === 'interval') {
      const seconds = Number.parseInt(value, 10);
      if (Number.isInteger(seconds)) out.interval = Math.max(MIN_INTERVAL_SECONDS, seconds);
    } else if (key === 'until') {
      const at = Date.parse(value);
      if (!Number.isNaN(at)) out.until = at;
    }
  }
  return out;
}

async function getJson(path) {
  const response = await fetch(`${FPL_BASE}${path}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`GET ${path} returned ${response.status}`);
  }
  return response.json();
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function readCurrentEvent(bootstrap) {
  if (!isRecord(bootstrap) || !Array.isArray(bootstrap.events)) return null;
  const current = bootstrap.events.find((event) => isRecord(event) && event.is_current === true);
  return isRecord(current) ? current : null;
}

function readSeason(bootstrap) {
  const url = isRecord(bootstrap?.game_config?.settings)
    ? bootstrap.game_config.settings.static_content_url
    : null;
  if (typeof url !== 'string') return 'unknown';
  const match = /\/(\d{4})_(\d{2})\//.exec(url);
  return match ? `${match[1]}-${match[2]}` : 'unknown';
}

function readHistoryRow(history, gw) {
  if (!isRecord(history) || !Array.isArray(history.current)) return null;
  const row = history.current.find((entry) => isRecord(entry) && entry.event === gw);
  return isRecord(row) ? row : null;
}

async function pollOnce(entries, outPath) {
  const bootstrap = await getJson('/bootstrap-static/');
  const event = readCurrentEvent(bootstrap);
  if (!event) {
    process.stdout.write('no current gameweek; nothing to measure\n');
    return { wrote: 0, gw: null };
  }

  const eventStatus = await getJson('/event-status/').catch(() => null);
  const observedAt = new Date().toISOString();
  let wrote = 0;

  for (const entryId of entries) {
    try {
      const history = await getJson(`/entry/${entryId}/history/`);
      const row = readHistoryRow(history, event.id);
      const record = {
        observed_at: observedAt,
        entry: entryId,
        gw: event.id,
        gw_finished: event.finished === true,
        gw_data_checked: event.data_checked === true,
        ranked_count: typeof event.ranked_count === 'number' ? event.ranked_count : null,
        average_entry_score:
          typeof event.average_entry_score === 'number' ? event.average_entry_score : null,
        row_present: row !== null,
        points: row ? row.points : null,
        total_points: row ? row.total_points : null,
        event_rank: row ? row.rank : null,
        overall_rank: row ? row.overall_rank : null,
        percentile_rank: row && row.percentile_rank !== undefined ? row.percentile_rank : null,
        overall_rank_percentage:
          row && row.overall_rank_percentage !== undefined ? row.overall_rank_percentage : null,
        bonus_added:
          isRecord(eventStatus) && Array.isArray(eventStatus.status)
            ? eventStatus.status.some((day) => isRecord(day) && day.bonus_added === true)
            : null,
      };
      await appendFile(outPath, `${JSON.stringify(record)}\n`, 'utf8');
      wrote += 1;
      process.stdout.write(
        `${observedAt} entry=${entryId} gw=${event.id} pts=${record.points} ` +
          `pct=${record.percentile_rank} or=${record.overall_rank} ` +
          `or%=${record.overall_rank_percentage}\n`
      );
    } catch (error) {
      process.stderr.write(`entry ${entryId}: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  return { wrote, gw: event.id, season: readSeason(bootstrap) };
}

async function main() {
  const { entries, interval, until, once } = parseArgs(process.argv.slice(2));
  if (entries.length === 0) {
    process.stderr.write('pass at least one entry id: --entries=219895,4173513\n');
    process.exit(1);
  }

  const bootstrap = await getJson('/bootstrap-static/');
  const event = readCurrentEvent(bootstrap);
  if (!event) {
    process.stderr.write('no current gameweek right now; run this once GW N is live\n');
    process.exit(1);
  }

  const season = readSeason(bootstrap);
  const gwLabel = String(event.id).padStart(2, '0');
  const outDir = join(REPO_ROOT, 'var', 'live-percentile');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${season}-gw${gwLabel}.jsonl`);

  process.stdout.write(`writing ${outPath}\n`);
  process.stdout.write(
    `gw ${event.id} finished=${event.finished === true} data_checked=${event.data_checked === true}\n`
  );
  if (event.finished === true) {
    process.stdout.write(
      'warning: this gameweek has finished, so the fields are settled and will not move\n'
    );
  }

  for (;;) {
    await pollOnce(entries, outPath);
    if (once) break;
    if (until !== null && Date.now() >= until) break;
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}

await main();
