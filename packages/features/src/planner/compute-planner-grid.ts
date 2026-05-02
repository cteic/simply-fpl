import type {
  FplBootstrapStatic,
  FplDifficulty,
  FplEntryGameweekPicks,
  FplFixture,
  FplPlayer,
  FplTeam,
} from '@simplyfpl/types';

export type PlannerForm = 'good' | 'avg' | 'warning' | 'bad' | 'none';

export interface PlannerPlayerCell {
  playerId: number;
  name: string;
  teamId: number;
  fdr: FplDifficulty;
  isHome: boolean;
  opponent: string;
  doubleGameweek: boolean;
  blank: boolean;
  form: PlannerForm;
}

export interface PlannerGridCell {
  gameweek: number;
  label: string;
  players: PlannerPlayerCell[];
}

interface ComputeArgs {
  picks: FplEntryGameweekPicks;
  bootstrap: FplBootstrapStatic;
  fixtures: FplFixture[];
  startGameweek: number;
  count?: number;
}

export function computePlannerGrid({
  picks,
  bootstrap,
  fixtures,
  startGameweek,
  count = 5,
}: ComputeArgs): PlannerGridCell[] {
  const playersById = new Map<number, FplPlayer>();
  for (const player of bootstrap.elements) playersById.set(player.id, player);

  const teamsById = new Map<number, FplTeam>();
  for (const team of bootstrap.teams) teamsById.set(team.id, team);

  // Map gameweek -> teamId -> fixtures (one or more)
  const fixturesByGwTeam = new Map<number, Map<number, FplFixture[]>>();
  for (const fixture of fixtures) {
    if (fixture.event === null) continue;
    const gwMap = fixturesByGwTeam.get(fixture.event) ?? new Map<number, FplFixture[]>();
    pushTo(gwMap, fixture.team_h, fixture);
    pushTo(gwMap, fixture.team_a, fixture);
    fixturesByGwTeam.set(fixture.event, gwMap);
  }

  const starters = picks.picks
    .filter((pick) => pick.position <= 11)
    .sort((a, b) => a.position - b.position);

  const cells: PlannerGridCell[] = [];
  for (let i = 0; i < count; i += 1) {
    const gw = startGameweek + i;
    const teamMap = fixturesByGwTeam.get(gw);

    const event = bootstrap.events.find((e) => e.id === gw);
    const isCurrent = event?.is_current ?? false;
    const baseLabel = `GW${gw}`;
    const label = isCurrent ? `${baseLabel} · Live` : baseLabel;

    const playerCells: PlannerPlayerCell[] = [];
    for (const pick of starters) {
      const player = playersById.get(pick.element);
      if (!player) continue;
      const team = teamsById.get(player.team);
      const teamFixtures = teamMap?.get(player.team) ?? [];
      const cell = buildPlayerCell(player, team, teamFixtures, teamsById);
      playerCells.push(cell);
    }

    cells.push({ gameweek: gw, label: dgwLabel(label, playerCells), players: playerCells });
  }

  return cells;
}

function pushTo(map: Map<number, FplFixture[]>, key: number, value: FplFixture) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

function buildPlayerCell(
  player: FplPlayer,
  team: FplTeam | undefined,
  teamFixtures: FplFixture[],
  teamsById: Map<number, FplTeam>
): PlannerPlayerCell {
  const blank = teamFixtures.length === 0;
  const doubleGameweek = teamFixtures.length > 1;

  // Use the worst (highest) FDR across the GW's fixtures so the row reflects the toughest match
  let worstFdr: FplDifficulty = 3;
  const opponentParts: string[] = [];
  let isHome = false;

  for (const fixture of teamFixtures) {
    const playingHome = fixture.team_h === player.team;
    const fdr = playingHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
    if (fdr > worstFdr || opponentParts.length === 0) {
      worstFdr = fdr;
      isHome = playingHome;
    }
    const opponentId = playingHome ? fixture.team_a : fixture.team_h;
    const opponentShort = teamsById.get(opponentId)?.short_name ?? '—';
    opponentParts.push(`${opponentShort} (${playingHome ? 'H' : 'A'})`);
  }

  return {
    playerId: player.id,
    name: player.web_name,
    teamId: player.team,
    fdr: blank ? 3 : worstFdr,
    isHome,
    opponent: blank ? 'Blank' : opponentParts.join(' · '),
    doubleGameweek,
    blank,
    form: deriveForm(player),
  };
}

function deriveForm(player: FplPlayer): PlannerForm {
  // chance_of_playing_next_round is 0–100 or null
  const cop = player.chance_of_playing_next_round;
  if (cop !== null) {
    if (cop === 0) return 'bad';
    if (cop < 50) return 'warning';
    if (cop < 100) return 'avg';
  }
  const form = Number.parseFloat(String(player.event_points ?? 0));
  if (Number.isNaN(form)) return 'avg';
  if (form >= 8) return 'good';
  if (form >= 4) return 'avg';
  if (form > 0) return 'warning';
  return 'none';
}

function dgwLabel(base: string, players: PlannerPlayerCell[]): string {
  const hasDgw = players.some((p) => p.doubleGameweek);
  const hasBlank = players.some((p) => p.blank);
  if (hasDgw && hasBlank) return `${base} · DGW/Blanks`;
  if (hasDgw) return `${base} · DGW`;
  if (hasBlank) return `${base} · Blanks`;
  return base;
}
