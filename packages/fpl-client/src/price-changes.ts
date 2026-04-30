import type { FplBootstrapStatic, FplTeam, PriceChange } from '@simplyfpl/types';

// FPL price change thresholds (approximate — FPL doesn't publish exact algo)
// A player rises if net transfers in > ~3% of their ownership
// A player falls if net transfers out > ~3% of their ownership
const RISE_THRESHOLD = 0.03;
const FALL_THRESHOLD = 0.03;

export function predictPriceChanges(bootstrap: FplBootstrapStatic): PriceChange[] {
  const teamMap = new Map<number, FplTeam>(bootstrap.teams.map((t) => [t.id, t]));

  return bootstrap.elements
    .filter((player) => player.chance_of_playing_next_round !== 0) // skip unavailable
    .map((player) => {
      const team = teamMap.get(player.team);
      if (!team) return null;

      const ownership = parseFloat(player.selected_by_percent);
      const totalManagers = 10_000_000; // approximate FPL total managers
      const ownedBy = (ownership / 100) * totalManagers;

      const netTransfers = player.transfers_in_event - player.transfers_out_event;
      const netRatio = ownedBy > 0 ? netTransfers / ownedBy : 0;

      let direction: PriceChange['direction'] = 'none';
      let probability = 0;

      if (netRatio > RISE_THRESHOLD) {
        direction = 'rise';
        probability = Math.min((netRatio - RISE_THRESHOLD) / RISE_THRESHOLD, 1);
      } else if (netRatio < -FALL_THRESHOLD) {
        direction = 'fall';
        probability = Math.min((Math.abs(netRatio) - FALL_THRESHOLD) / FALL_THRESHOLD, 1);
      }

      return {
        player,
        team,
        netTransfers,
        direction,
        probability,
      } satisfies PriceChange;
    })
    .filter((p): p is PriceChange => p !== null)
    .filter((p) => p.direction !== 'none')
    .sort((a, b) => b.probability - a.probability);
}

export function formatPrice(costInTenths: number): string {
  return `£${(costInTenths / 10).toFixed(1)}m`;
}
