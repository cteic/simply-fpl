'use client';

import { useMemo } from 'react';

import { ads, h2h } from '@simplyfpl/features';
import type { H2hPlayer, H2hResult, H2hSide } from '@simplyfpl/features/h2h';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';
import {
  AdSlot,
  Card,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
  styled,
} from '@simplyfpl/ui';

import { useBootstrap, useEntry, useEntryPicks, useLiveGameweek } from '@/queries/fpl';

import PitchPair from './h2h-pitch-pair';

const { computeH2h } = h2h;

interface InnerProps {
  yourEntryId: number;
  theirEntryId: number;
}

export default function HeadToHeadInner({ yourEntryId, theirEntryId }: InnerProps) {
  const adFree = ads.useAdFree();
  const { data: bootstrap, isError: bootstrapError } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const {
    data: yourEntry,
    isLoading: yourEntryLoading,
    isError: yourEntryError,
  } = useEntry(yourEntryId);
  const {
    data: theirEntry,
    isLoading: theirEntryLoading,
    isError: theirEntryError,
  } = useEntry(theirEntryId);
  const { data: yourPicks, isError: yourPicksError } = useEntryPicks(yourEntryId, currentGw);
  const { data: theirPicks, isError: theirPicksError } = useEntryPicks(theirEntryId, currentGw);
  const { data: liveGw, isError: liveGwError } = useLiveGameweek(currentGw);

  const anyError =
    bootstrapError ||
    yourEntryError ||
    theirEntryError ||
    yourPicksError ||
    theirPicksError ||
    liveGwError;

  const ready = yourEntry && theirEntry && yourPicks && theirPicks && bootstrap && liveGw;
  const result: H2hResult | null = useMemo(() => {
    if (!ready) return null;
    return computeH2h({
      yourEntry,
      theirEntry,
      yourPicks,
      theirPicks,
      bootstrap,
      liveGw,
    });
  }, [ready, yourEntry, theirEntry, yourPicks, theirPicks, bootstrap, liveGw]);

  if (anyError) {
    return (
      <PageShell>
        <PageHeader title="Head to Head" meta="Couldn't load this matchup" />
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          We couldn't load one or both managers' live data. Check the team IDs and refresh to try
          again.
        </Text>
      </PageShell>
    );
  }

  if (yourEntryLoading || theirEntryLoading) {
    return (
      <PageShell>
        <PageHeader title="Head to Head" meta="Loading…" />
      </PageShell>
    );
  }

  if (!result) {
    return (
      <PageShell>
        <PageHeader title="Head to Head" meta="Loading live data…" />
      </PageShell>
    );
  }

  const { you, them, scoreDelta, differentialYou, differentialThem, commonPicks } = result;

  return (
    <PageShell>
      <PageHeader
        tone="stadium"
        title="Head to Head"
        meta={`${you.managerName || you.teamName} vs ${them.managerName || them.teamName} · GW${currentGw ?? '—'}`}
      />

      <Scoreboard you={you} them={them} scoreDelta={scoreDelta} />

      <PitchPair you={you} them={them} />

      <AdSlot placement="h2h-below-fold" minHeight={250} adFree={adFree} />

      <DifferentialBlock
        title={`Only ${you.managerName || 'you'} have`}
        players={differentialYou}
        empty="No differentials — you both picked the same XI."
      />

      <DifferentialBlock
        title={`Only ${them.managerName || 'they'} have`}
        players={differentialThem}
        empty=""
      />

      <CommonBlock players={commonPicks} />

      <FNote>Live GW points refresh every 60s. Bonus shown is provisional until confirmed.</FNote>
    </PageShell>
  );
}

const ScoreCard = styled(Card, {
  paddingHorizontal: 20,
  paddingVertical: 14,
  marginBottom: 12,
});

const SummaryDivider = styled(YStack, {
  height: 1,
  backgroundColor: '$border',
  marginVertical: 12,
});

const ScoreNumber = styled(Text, {
  fontFamily: '$mono',
  fontSize: 30,
  fontWeight: '500',
  color: '$color',
});

const ScoreLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '500',
  letterSpacing: '$10',
  textTransform: 'uppercase',
  color: '$colorSubtle',
  marginBottom: 4,
});

const ScoreSub = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorMuted',
  marginTop: 2,
});

const DeltaBadge = styled(Text, {
  fontFamily: '$mono',
  fontSize: 14,
  fontWeight: '500',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: '$3',
  variants: {
    tone: {
      ahead: { color: '$positive', backgroundColor: '$positiveBg' },
      behind: { color: '$negative', backgroundColor: '$negativeBg' },
      level: { color: '$colorMuted', backgroundColor: '$border' },
    },
  } as const,
});

interface ScoreboardProps {
  you: H2hSide;
  them: H2hSide;
  scoreDelta: number;
}

function Scoreboard({ you, them, scoreDelta }: ScoreboardProps) {
  let tone: 'ahead' | 'behind' | 'level' = 'level';
  if (scoreDelta > 0) tone = 'ahead';
  else if (scoreDelta < 0) tone = 'behind';

  let deltaLabel = 'Level';
  if (scoreDelta > 0) deltaLabel = `+${scoreDelta}`;
  else if (scoreDelta < 0) deltaLabel = `${scoreDelta}`;

  return (
    <ScoreCard>
      <XStack justifyContent="space-between" alignItems="center">
        <SideStat label="You" side={you} alignRight={false} />
        <DeltaBadge tone={tone}>{deltaLabel}</DeltaBadge>
        <SideStat label="Them" side={them} alignRight />
      </XStack>
      <SummaryDivider />
      <XStack justifyContent="space-between" alignItems="center">
        <CaptainCell side={you.captain} alignRight={false} />
        <ScoreLabel>Captains</ScoreLabel>
        <CaptainCell side={them.captain} alignRight />
      </XStack>
    </ScoreCard>
  );
}

interface SideStatProps {
  label: string;
  side: H2hSide;
  alignRight: boolean;
}

function SideStat({ label, side, alignRight }: SideStatProps) {
  return (
    <YStack alignItems={alignRight ? 'flex-end' : 'flex-start'} flex={1}>
      <ScoreLabel>{label}</ScoreLabel>
      <ScoreNumber>{side.netGwPoints}</ScoreNumber>
      <ScoreSub>
        {side.gwPoints} GW{side.transferCost > 0 ? ` · -${side.transferCost} hit` : ''}
      </ScoreSub>
      <ScoreSub>{side.teamName}</ScoreSub>
    </YStack>
  );
}

const CapName = styled(Text, {
  fontFamily: '$body',
  fontSize: 13,
  fontWeight: '500',
  color: '$color',
});

const CapPoints = styled(Text, {
  fontFamily: '$mono',
  fontSize: 14,
  fontWeight: '500',
  color: '$color',
});

const CapMeta = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
});

function CaptainCell({ side, alignRight }: { side: H2hPlayer | null; alignRight: boolean }) {
  if (side === null) {
    return (
      <YStack alignItems={alignRight ? 'flex-end' : 'flex-start'} flex={1}>
        <CapName>—</CapName>
      </YStack>
    );
  }
  return (
    <YStack alignItems={alignRight ? 'flex-end' : 'flex-start'} flex={1}>
      <CapName>{side.name}</CapName>
      <CapMeta>{side.teamShort}</CapMeta>
      <CapPoints>{side.effectivePoints} pts</CapPoints>
    </YStack>
  );
}

interface DifferentialBlockProps {
  title: string;
  players: H2hPlayer[];
  empty: string;
}

function DifferentialBlock({ title, players, empty }: DifferentialBlockProps) {
  if (players.length === 0 && !empty) return null;
  return (
    <Card paddingHorizontal={0} paddingVertical={0} marginBottom={10}>
      <YStack paddingHorizontal={16} paddingTop={10} paddingBottom={6}>
        <SectionHeader title={title} />
      </YStack>
      {players.length === 0 ? (
        <YStack paddingHorizontal={16} paddingVertical={12}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {empty}
          </Text>
        </YStack>
      ) : (
        <YStack>
          {players.map((p, idx) => (
            <PlayerRow key={p.id} player={p} last={idx === players.length - 1} />
          ))}
        </YStack>
      )}
    </Card>
  );
}

function CommonBlock({ players }: { players: H2hPlayer[] }) {
  if (players.length === 0) return null;
  return (
    <Card paddingHorizontal={0} paddingVertical={0} marginBottom={10}>
      <YStack paddingHorizontal={16} paddingTop={10} paddingBottom={6}>
        <SectionHeader title={`Both have (${players.length})`} />
      </YStack>
      <YStack>
        {players.map((p, idx) => (
          <PlayerRow key={p.id} player={p} last={idx === players.length - 1} />
        ))}
      </YStack>
    </Card>
  );
}

const RowBox = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 7,
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

const RowName = styled(Text, {
  flex: 1,
  fontFamily: '$body',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
});

const RowMeta = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
  marginLeft: 8,
});

const RowPts = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
  marginLeft: 12,
});

function PlayerRow({ player, last }: { player: H2hPlayer; last: boolean }) {
  return (
    <RowBox last={last}>
      <RowName>{player.name}</RowName>
      <RowMeta>{player.teamShort}</RowMeta>
      <RowPts>{player.effectivePoints}</RowPts>
    </RowBox>
  );
}
