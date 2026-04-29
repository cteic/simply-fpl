'use client';

import { calculateLivePoints } from '@simplyfpl/fpl-client';
import { useBootstrap, useCurrentGameweek, useEntry, useEntryPicks, useLiveGameweek } from '@/queries/fpl';

interface Props {
  entryId: number;
}

export function LiveRankView({ entryId }: Props) {
  const currentGw = useCurrentGameweek();
  const { data: bootstrap } = useBootstrap();
  const { data: entry, isLoading: entryLoading } = useEntry(entryId);
  const { data: picks, isLoading: picksLoading } = useEntryPicks(entryId, currentGw);
  const { data: liveGw, isLoading: liveLoading } = useLiveGameweek(currentGw);

  if (entryLoading || picksLoading || liveLoading) {
    return <div aria-busy="true">Loading live rank...</div>;
  }

  if (!entry || !picks || !liveGw || !bootstrap) {
    return <div>Could not load data. Check your team ID and try again.</div>;
  }

  const livePoints = calculateLivePoints(picks, liveGw, bootstrap);
  const transferHit = picks.entry_history.event_transfers_cost;
  const gwPoints = picks.entry_history.points;

  // Rank movement indicator
  const prevRank = entry.summary_overall_rank;
  const rankLabel = prevRank?.toLocaleString() ?? '—';

  return (
    <div>
      <h1>{entry.name}</h1>
      <p>{entry.player_first_name} {entry.player_last_name}</p>

      <section aria-label="Gameweek summary">
        <h2>GW{currentGw} — Live</h2>
        <dl>
          <div>
            <dt>Live points</dt>
            <dd>{livePoints}</dd>
          </div>
          {transferHit > 0 && (
            <div>
              <dt>Transfer hit</dt>
              <dd>−{transferHit}</dd>
            </div>
          )}
          <div>
            <dt>Active chip</dt>
            <dd>{picks.active_chip ?? 'None'}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Overall summary">
        <h2>Overall</h2>
        <dl>
          <div>
            <dt>Total points</dt>
            <dd>{entry.summary_overall_points}</dd>
          </div>
          <div>
            <dt>Overall rank</dt>
            <dd>{rankLabel}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Picks">
        <h2>Picks</h2>
        <ul>
          {picks.picks.slice(0, 11).map(pick => {
            const player = bootstrap.elements.find(e => e.id === pick.element);
            const live = liveGw.elements.find(e => e.id === pick.element);
            const pts = (live?.stats.total_points ?? 0) * pick.multiplier;
            return (
              <li key={pick.element}>
                {player?.web_name ?? pick.element}
                {pick.is_captain && ' (C)'}
                {pick.is_vice_captain && ' (V)'}
                {' '}— {pts} pts
              </li>
            );
          })}
        </ul>
      </section>

      <p>
        <small>Updates every 60 seconds during active gameweeks.</small>
      </p>
    </div>
  );
}
