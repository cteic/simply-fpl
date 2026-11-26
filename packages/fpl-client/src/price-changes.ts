import type { FplBootstrapStatic, FplPlayer, FplTeam, PriceChange } from '@simplyfpl/types';

/**
 * Fallback threshold for the legacy net-transfer estimate, used only when a
 * bootstrap payload carries none of FPL's own price-change fields.
 *
 * FPL publishes its own threshold progress now, so this path exists for old
 * cached payloads and fixtures rather than for production traffic.
 */
const FALLBACK_THRESHOLD = 0.01;

/** Total managers to assume when a payload has no `total_players`. */
const FALLBACK_TOTAL_MANAGERS = 11_000_000;

/** Below this much threshold progress a player is not worth listing. */
export const PRICE_CHANGE_FLOOR_PERCENT = 1;

function parseSignedPercent(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasOfficialFields(bootstrap: FplBootstrapStatic): boolean {
  return bootstrap.elements.some((p) => p.price_change_percent !== undefined);
}

function todaysProjection(player: FplPlayer): { projectedPercent: number; likelihood: number } {
  const projections = player.price_change_projections ?? [];
  const today = projections.find((p) => p.offset === 0) ?? projections[0];
  if (!today) return { projectedPercent: 0, likelihood: 0 };
  const projectedPercent = parseSignedPercent(today.projected_percent) ?? 0;
  const likelihood = Number.isFinite(today.likelihood) ? today.likelihood : 0;
  return { projectedPercent, likelihood };
}

/**
 * Read FPL's own price-change figures off a bootstrap payload.
 *
 * `price_change_percent` is progress toward the threshold, where 100 means a
 * change is due, and its sign gives the direction. `price_change_projections`
 * carries today's and the next two days' projected progress with a likelihood
 * from -5 to +5. Ordering is by threshold progress descending, so whoever is
 * closest to changing sits at the top.
 *
 * `probability` is FPL's likelihood normalised to 0-1 so existing callers keep
 * working. It is a confidence, not the progress bar: render
 * `progressPercent` for the bar.
 */
function readOfficialPriceChanges(bootstrap: FplBootstrapStatic): PriceChange[] {
  const teamMap = new Map<number, FplTeam>(bootstrap.teams.map((t) => [t.id, t]));
  const changes: PriceChange[] = [];

  for (const player of bootstrap.elements) {
    const team = teamMap.get(player.team);
    if (!team) continue;

    const signedPercent = parseSignedPercent(player.price_change_percent);
    if (signedPercent === null) continue;

    const progressPercent = Math.abs(signedPercent);
    if (progressPercent < PRICE_CHANGE_FLOOR_PERCENT) continue;

    const { projectedPercent, likelihood } = todaysProjection(player);

    let direction: PriceChange['direction'] = 'none';
    if (signedPercent > 0) direction = 'rise';
    else if (signedPercent < 0) direction = 'fall';
    if (direction === 'none') continue;

    changes.push({
      player,
      team,
      netTransfers: player.transfers_in_event - player.transfers_out_event,
      direction,
      probability: Math.min(1, Math.abs(likelihood) / 5),
      progressPercent,
      likelihood,
      projectedPercent,
      hourlyRate: player.price_change_hourly_rate ?? 0,
      lockedUntil: player.price_change_locked_until ?? null,
      calibrating: player.price_change_calibrating ?? false,
      source: 'fpl-official',
    });
  }

  changes.sort((a, b) => b.progressPercent - a.progressPercent);
  return changes;
}

/**
 * Legacy net-transfer estimate. Kept only for payloads with no official
 * fields.
 *
 * Measured against FPL's own figures on the same payload this flagged 183
 * players as certain to change against a real base rate of 3 to 6 a night, and
 * disagreed with FPL on direction for some of them. Do not extend it.
 */
function estimatePriceChangesFromTransfers(bootstrap: FplBootstrapStatic): PriceChange[] {
  const teamMap = new Map<number, FplTeam>(bootstrap.teams.map((t) => [t.id, t]));
  const totalManagers = bootstrap.total_players ?? FALLBACK_TOTAL_MANAGERS;
  const changes: PriceChange[] = [];

  for (const player of bootstrap.elements) {
    if (player.chance_of_playing_next_round === 0) continue;
    const team = teamMap.get(player.team);
    if (!team) continue;

    const ownership = Number.parseFloat(player.selected_by_percent);
    if (!Number.isFinite(ownership)) continue;
    const ownedBy = (ownership / 100) * totalManagers;
    if (ownedBy <= 0) continue;

    const netTransfers = player.transfers_in_event - player.transfers_out_event;
    const netRatio = netTransfers / ownedBy;

    let direction: PriceChange['direction'] = 'none';
    if (netRatio > FALLBACK_THRESHOLD) direction = 'rise';
    else if (netRatio < -FALLBACK_THRESHOLD) direction = 'fall';
    if (direction === 'none') continue;

    const progressPercent = Math.min(100, (Math.abs(netRatio) / FALLBACK_THRESHOLD) * 100);

    changes.push({
      player,
      team,
      netTransfers,
      direction,
      // No calibrated confidence exists on this path. The old formula reported
      // certainty for anything past twice the threshold, which pinned 63% of
      // the list at 100% against a real base rate of 3 to 6 changes a night.
      // Reporting zero confidence and `calibrating` is the honest answer: the
      // ordering is still useful, the certainty was never real.
      probability: 0,
      progressPercent,
      likelihood: 0,
      projectedPercent: progressPercent,
      hourlyRate: 0,
      lockedUntil: null,
      calibrating: true,
      source: 'net-transfer-estimate',
    });
  }

  changes.sort((a, b) => b.progressPercent - a.progressPercent);
  return changes;
}

/**
 * Players moving toward a price change, closest first.
 *
 * Prefers FPL's own published figures and falls back to the legacy
 * net-transfer estimate only when a payload carries none of them. Check
 * `source` before presenting a figure as authoritative.
 */
export function predictPriceChanges(bootstrap: FplBootstrapStatic): PriceChange[] {
  if (!Array.isArray(bootstrap.elements) || !Array.isArray(bootstrap.teams)) return [];
  return hasOfficialFields(bootstrap)
    ? readOfficialPriceChanges(bootstrap)
    : estimatePriceChangesFromTransfers(bootstrap);
}

export function formatPrice(costInTenths: number): string {
  return `£${(costInTenths / 10).toFixed(1)}m`;
}
