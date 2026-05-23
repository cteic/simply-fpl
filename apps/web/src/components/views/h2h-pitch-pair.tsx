'use client';

import type { H2hPlayer, H2hPosition, H2hSide } from '@simplyfpl/features/h2h';
import { getClubColor, getKitUrl } from '@simplyfpl/fpl-client';
import { BenchDivider, Pitch, PitchRow, Player, XStack, YStack, styled } from '@simplyfpl/ui';
import type { ShirtKind } from '@simplyfpl/ui';

const PitchPairWrap = styled(XStack, {
  gap: 12,
  marginBottom: 12,
  alignItems: 'stretch',
  $sm: { flexDirection: 'column' },
});

const PitchColumn = styled(YStack, {
  flex: 1,
  minWidth: 0,
});

const POSITION_TO_SHIRT: Record<H2hPosition, ShirtKind> = {
  gk: 'gk',
  def: 'def',
  mid: 'mid',
  fwd: 'fwd',
};

function kitProps(player: H2hPlayer): {
  kitUrl: string | undefined;
  kitUrl2x: string | undefined;
} {
  if (player.teamCode <= 0) return { kitUrl: undefined, kitUrl2x: undefined };
  const isGoalkeeper = player.position === 'gk';
  return {
    kitUrl: getKitUrl(player.teamCode, { isGoalkeeper }),
    kitUrl2x: getKitUrl(player.teamCode, { isGoalkeeper, size: 220 }),
  };
}

function pickBadgeTone(player: H2hPlayer): 'default' | 'hot' | 'captain' | 'tbp' {
  if (player.minutes === 0) return 'tbp';
  if (player.isCaptain) return 'captain';
  if (player.effectivePoints >= 10) return 'hot';
  return 'default';
}

function groupXiByPosition(xi: H2hPlayer[]): Record<H2hPosition, H2hPlayer[]> {
  const grouped: Record<H2hPosition, H2hPlayer[]> = { gk: [], def: [], mid: [], fwd: [] };
  for (const player of xi) {
    grouped[player.position].push(player);
  }
  return grouped;
}

function PitchSide({ side, label }: { side: H2hSide; label: string }) {
  const grouped = groupXiByPosition(side.xi);
  const rows: H2hPlayer[][] = [grouped.gk, grouped.def, grouped.mid, grouped.fwd];
  const headerLabel = `${label} · ${side.teamName}`;

  return (
    <Pitch teamName={headerLabel} formation={side.formation}>
      {rows.map((row, i) =>
        row.length === 0 ? null : (
          <PitchRow key={`row-${i}`}>
            {row.map((p) => {
              const kit = kitProps(p);
              return (
                <Player
                  key={p.id}
                  name={p.isCaptain ? `${p.name} (C)` : p.name}
                  detail={p.minutes === 0 ? `${p.teamShort} · TBP` : p.teamShort}
                  position={POSITION_TO_SHIRT[p.position]}
                  badge={p.minutes === 0 ? '–' : String(p.effectivePoints)}
                  badgeTone={pickBadgeTone(p)}
                  kitUrl={kit.kitUrl}
                  kitUrl2x={kit.kitUrl2x}
                  accentColor={getClubColor(p.teamShort)}
                />
              );
            })}
          </PitchRow>
        )
      )}
      {side.bench.length > 0 ? (
        <>
          <BenchDivider />
          <PitchRow>
            {side.bench.map((p) => {
              const kit = kitProps(p);
              return (
                <Player
                  key={p.id}
                  name={p.name}
                  detail={p.teamShort}
                  position={POSITION_TO_SHIRT[p.position]}
                  badge={String(p.rawPoints)}
                  badgeTone="bench"
                  bench
                  kitUrl={kit.kitUrl}
                  kitUrl2x={kit.kitUrl2x}
                  accentColor={getClubColor(p.teamShort)}
                />
              );
            })}
          </PitchRow>
        </>
      ) : null}
    </Pitch>
  );
}

export default function PitchPair({ you, them }: { you: H2hSide; them: H2hSide }) {
  return (
    <PitchPairWrap>
      <PitchColumn>
        <PitchSide side={you} label="You" />
      </PitchColumn>
      <PitchColumn>
        <PitchSide side={them} label="Them" />
      </PitchColumn>
    </PitchPairWrap>
  );
}
