import type { FplPlayer } from '@simplyfpl/types';

export type StatusChangeType = 'newly_flagged' | 'upgraded' | 'ruled_out';

export interface PlayerStatusChange {
  playerId: number;
  playerName: string;
  teamId: number;
  changeType: StatusChangeType;
  news: string;
  chanceOfPlaying: number | null;
}

export interface PlayerStatusSnapshot {
  [playerId: string]: {
    status: string | undefined;
    news: string;
    chance: number | null;
  };
}

const UNAVAILABLE_STATUSES = new Set(['i', 's', 'n', 'u']);

function isUnavailable(status: string | undefined, chance: number | null): boolean {
  if (status && UNAVAILABLE_STATUSES.has(status)) return true;
  if (chance === 0) return true;
  return false;
}

function isFlagged(status: string | undefined, news: string, chance: number | null): boolean {
  if (isUnavailable(status, chance)) return true;
  if (status === 'd') return true;
  if (news.length > 0) return true;
  return false;
}

export function buildSnapshot(players: FplPlayer[]): PlayerStatusSnapshot {
  const snap: PlayerStatusSnapshot = {};
  for (const p of players) {
    snap[String(p.id)] = {
      status: p.status,
      news: p.news,
      chance: p.chance_of_playing_next_round,
    };
  }
  return snap;
}

export function detectPlayerStatusChanges(
  prev: PlayerStatusSnapshot,
  current: FplPlayer[]
): PlayerStatusChange[] {
  const changes: PlayerStatusChange[] = [];

  for (const player of current) {
    const prevEntry = prev[String(player.id)];

    if (!prevEntry) continue;

    const currUnavailable = isUnavailable(player.status, player.chance_of_playing_next_round);
    const prevUnavailable = isUnavailable(prevEntry.status, prevEntry.chance);

    if (currUnavailable) {
      if (!prevUnavailable) {
        changes.push({
          playerId: player.id,
          playerName: player.web_name,
          teamId: player.team,
          changeType: 'ruled_out',
          news: player.news,
          chanceOfPlaying: player.chance_of_playing_next_round,
        });
      }
      continue;
    }

    const currFlagged = isFlagged(player.status, player.news, player.chance_of_playing_next_round);
    const prevFlagged = isFlagged(prevEntry.status, prevEntry.news, prevEntry.chance);

    if (currFlagged && !prevFlagged) {
      changes.push({
        playerId: player.id,
        playerName: player.web_name,
        teamId: player.team,
        changeType: 'newly_flagged',
        news: player.news,
        chanceOfPlaying: player.chance_of_playing_next_round,
      });
      continue;
    }

    if (currFlagged && prevFlagged && !prevUnavailable) {
      const currChance = player.chance_of_playing_next_round;
      const prevChance = prevEntry.chance;
      if (currChance !== null && (prevChance === null || currChance > prevChance)) {
        changes.push({
          playerId: player.id,
          playerName: player.web_name,
          teamId: player.team,
          changeType: 'upgraded',
          news: player.news,
          chanceOfPlaying: currChance,
        });
      }
    }
  }

  return changes;
}
