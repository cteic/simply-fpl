'use client';

import { predictPriceChanges, formatPrice } from '@simplyfpl/fpl-client';
import { useBootstrap } from '@/queries/fpl';

export function PriceChangesView() {
  const { data: bootstrap, isLoading } = useBootstrap();

  if (isLoading) return <div aria-busy="true">Loading price data...</div>;
  if (!bootstrap) return <div>Could not load price data.</div>;

  const changes = predictPriceChanges(bootstrap);
  const risers = changes.filter(c => c.direction === 'rise');
  const fallers = changes.filter(c => c.direction === 'fall');

  return (
    <div>
      <h1>Price Changes</h1>
      <p>Predicted price changes based on live GW transfer activity. Updates hourly.</p>

      <section aria-label="Predicted risers">
        <h2>Predicted Risers ({risers.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Price</th>
              <th>Net transfers</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {risers.map(({ player, team, netTransfers, probability }) => (
              <tr key={player.id}>
                <td>{player.web_name}</td>
                <td>{team.short_name}</td>
                <td>{formatPrice(player.now_cost)}</td>
                <td>+{netTransfers.toLocaleString()}</td>
                <td>{Math.round(probability * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Predicted fallers">
        <h2>Predicted Fallers ({fallers.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Price</th>
              <th>Net transfers</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {fallers.map(({ player, team, netTransfers, probability }) => (
              <tr key={player.id}>
                <td>{player.web_name}</td>
                <td>{team.short_name}</td>
                <td>{formatPrice(player.now_cost)}</td>
                <td>{netTransfers.toLocaleString()}</td>
                <td>{Math.round(probability * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
