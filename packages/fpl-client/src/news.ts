import type {
  FplBootstrapStatic,
  FplPlayer,
  PlayerNewsItem,
  PlayerNewsStatus,
  TeamNewsGroup,
} from '@simplyfpl/types';

function resolveStatus(player: FplPlayer): PlayerNewsStatus {
  const s = player.status;
  if (s === 's') return 'suspended';
  if (s === 'i' || s === 'n') return 'injured';
  if (s === 'u') return 'unavailable';
  if (s === 'd') return 'doubt';
  const cop = player.chance_of_playing_next_round;
  if (cop === 0) return 'injured';
  if (cop !== null && cop < 100) return 'doubt';
  if (player.news !== '') return 'doubt';
  return 'available';
}

export function hasPlayerNews(player: FplPlayer): boolean {
  return player.news !== '' || player.chance_of_playing_next_round !== null;
}

export function collateTeamNews(bootstrap: FplBootstrapStatic): TeamNewsGroup[] {
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const groupMap = new Map<number, PlayerNewsItem[]>();

  for (const player of bootstrap.elements) {
    if (!hasPlayerNews(player)) continue;
    const items = groupMap.get(player.team) ?? [];
    items.push({
      id: player.id,
      web_name: player.web_name,
      element_type: player.element_type,
      team_id: player.team,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      news: player.news,
      status: resolveStatus(player),
    });
    groupMap.set(player.team, items);
  }

  const groups: TeamNewsGroup[] = [];
  for (const [teamId, players] of groupMap.entries()) {
    const team = teamById.get(teamId);
    if (!team) continue;
    groups.push({
      team_id: teamId,
      team_name: team.name,
      team_short_name: team.short_name,
      players,
    });
  }

  return groups.sort((a, b) => a.team_name.localeCompare(b.team_name));
}

export function filterNewsForPicks(
  groups: TeamNewsGroup[],
  playerIds: Set<number>
): PlayerNewsItem[] {
  const result: PlayerNewsItem[] = [];
  for (const group of groups) {
    for (const player of group.players) {
      if (playerIds.has(player.id)) result.push(player);
    }
  }
  return result;
}
