import { useMemo, useState } from 'react';

import { useLocalSearchParams } from 'expo-router';

import { h2h } from '@simplyfpl/features';
import type { H2hPlayer, H2hPosition, H2hResult, H2hSide } from '@simplyfpl/features/h2h';
import { getClubColor, getCurrentGameweek, getKitUrl, parseEntryId } from '@simplyfpl/fpl-client';
import {
  BenchDivider,
  Button,
  Card,
  FNote,
  Input,
  Pitch,
  PitchRow,
  Player,
  SectionHeader,
  Text,
  XStack,
  YStack,
  styled,
} from '@simplyfpl/ui';
import type { ShirtKind } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { useSavedEntryId } from '@/lib/saved-team';
import { useBootstrap, useEntry, useEntryPicks, useLiveGameweek } from '@/queries/fpl';

const { computeH2h } = h2h;

function parseParam(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function HeadToHeadView() {
  const params = useLocalSearchParams<{ you?: string; them?: string }>();
  const { entryId: savedId } = useSavedEntryId();

  const paramYou = parseParam(params.you);
  const paramThem = parseParam(params.them);

  const [yourInput, setYourInput] = useState('');
  const [theirInput, setTheirInput] = useState('');
  const [submitted, setSubmitted] = useState<{ you: number; them: number } | null>(null);

  const yourEntryId = submitted?.you ?? paramYou ?? savedId;
  const theirEntryId = submitted?.them ?? paramThem;

  if (yourEntryId === null || theirEntryId === null || yourEntryId === theirEntryId) {
    return (
      <Screen>
        <YStack>
          <Text
            fontFamily="$body"
            fontSize={21}
            fontWeight="600"
            letterSpacing={-0.4}
            color="$color"
          >
            Head to Head
          </Text>
          <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={4}>
            Compare your live gameweek against any rival.
          </Text>
        </YStack>
        <Card paddingHorizontal={20} paddingVertical={20}>
          <SectionHeader title="Pick two teams" />
          <YStack gap={10} marginTop={4}>
            <Input
              value={yourInput}
              onChangeText={setYourInput}
              placeholder={savedId ? `Your team (${savedId})` : 'Your team ID'}
              keyboardType="number-pad"
              backgroundColor="$background"
              borderColor="$borderStrong"
            />
            <Input
              value={theirInput}
              onChangeText={setTheirInput}
              placeholder="Rival team ID"
              keyboardType="number-pad"
              backgroundColor="$background"
              borderColor="$borderStrong"
            />
            <XStack>
              <Button
                tone="primary"
                size="md"
                onPress={() => {
                  const you = parseEntryId(yourInput) ?? savedId;
                  const them = parseEntryId(theirInput);
                  if (you !== null && them !== null && you !== them) {
                    setSubmitted({ you, them });
                  }
                }}
              >
                Compare
              </Button>
            </XStack>
          </YStack>
        </Card>
        <FNote>Open a mini-league and tap a rival to jump straight into a head-to-head.</FNote>
      </Screen>
    );
  }

  return <HeadToHeadInner yourEntryId={yourEntryId} theirEntryId={theirEntryId} />;
}

function HeadToHeadInner({
  yourEntryId,
  theirEntryId,
}: {
  yourEntryId: number;
  theirEntryId: number;
}) {
  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: yourEntry, isLoading: yourLoading } = useEntry(yourEntryId);
  const { data: theirEntry, isLoading: theirLoading } = useEntry(theirEntryId);
  const { data: yourPicks } = useEntryPicks(yourEntryId, currentGw);
  const { data: theirPicks } = useEntryPicks(theirEntryId, currentGw);
  const { data: liveGw } = useLiveGameweek(currentGw);

  const ready = yourEntry && theirEntry && yourPicks && theirPicks && bootstrap && liveGw;
  const result: H2hResult | null = useMemo(() => {
    if (!ready) return null;
    return computeH2h({ yourEntry, theirEntry, yourPicks, theirPicks, bootstrap, liveGw });
  }, [ready, yourEntry, theirEntry, yourPicks, theirPicks, bootstrap, liveGw]);

  if (yourLoading || theirLoading || !result) {
    return (
      <Screen>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted" marginTop={40}>
          Loading head-to-head…
        </Text>
      </Screen>
    );
  }

  const { you, them, scoreDelta, differentialYou, differentialThem, commonPicks } = result;

  return (
    <Screen>
      <YStack>
        <Text fontFamily="$body" fontSize={21} fontWeight="600" letterSpacing={-0.4} color="$color">
          Head to Head
        </Text>
        <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={4}>
          {`${you.managerName || you.teamName} vs ${them.managerName || them.teamName} · GW${currentGw ?? '—'}`}
        </Text>
      </YStack>

      <Scoreboard you={you} them={them} scoreDelta={scoreDelta} />
      <PitchSide side={you} label="You" />
      <PitchSide side={them} label="Them" />

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
    </Screen>
  );
}

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

const SummaryDivider = styled(YStack, {
  height: 1,
  backgroundColor: '$border',
  marginVertical: 12,
});

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

function Scoreboard({
  you,
  them,
  scoreDelta,
}: {
  you: H2hSide;
  them: H2hSide;
  scoreDelta: number;
}) {
  let tone: 'ahead' | 'behind' | 'level' = 'level';
  if (scoreDelta > 0) tone = 'ahead';
  else if (scoreDelta < 0) tone = 'behind';

  let deltaLabel = 'Level';
  if (scoreDelta > 0) deltaLabel = `+${scoreDelta}`;
  else if (scoreDelta < 0) deltaLabel = `${scoreDelta}`;

  return (
    <Card paddingHorizontal={20} paddingVertical={16}>
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
    </Card>
  );
}

function SideStat({
  label,
  side,
  alignRight,
}: {
  label: string;
  side: H2hSide;
  alignRight: boolean;
}) {
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
  for (const player of xi) grouped[player.position].push(player);
  return grouped;
}

function PitchSide({ side, label }: { side: H2hSide; label: string }) {
  const grouped = groupXiByPosition(side.xi);
  const rows: H2hPlayer[][] = [grouped.gk, grouped.def, grouped.mid, grouped.fwd];

  return (
    <Pitch teamName={`${label} · ${side.teamName}`} formation={side.formation}>
      {rows.map((row, i) =>
        row.length === 0 ? null : (
          <PitchRow key={`row-${i}`} gap={6}>
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
                  compact
                />
              );
            })}
          </PitchRow>
        )
      )}
      {side.bench.length > 0 ? (
        <>
          <BenchDivider />
          <PitchRow gap={6}>
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
                  compact
                />
              );
            })}
          </PitchRow>
        </>
      ) : null}
    </Pitch>
  );
}

const RowBox = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 9,
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

function DifferentialBlock({
  title,
  players,
  empty,
}: {
  title: string;
  players: H2hPlayer[];
  empty: string;
}) {
  if (players.length === 0 && !empty) return null;
  return (
    <Card>
      <YStack paddingHorizontal={16} paddingTop={14} paddingBottom={8}>
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
    <Card>
      <YStack paddingHorizontal={16} paddingTop={14} paddingBottom={8}>
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
