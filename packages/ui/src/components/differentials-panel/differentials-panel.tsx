'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { Card } from '../card';
import { SectionHeader } from '../section-header';

const Wrap = styled(Card, {
  paddingHorizontal: 0,
  paddingVertical: 0,
});

const Head = styled(YStack, {
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 8,
});

const SubTitle = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorMuted',
  marginTop: 2,
});

const Cols = styled(XStack, {
  gap: 0,
  borderTopWidth: 1,
  borderTopColor: '$border',
  $sm: { flexDirection: 'column' },
});

const Col = styled(YStack, {
  flex: 1,
  minWidth: 0,
  borderRightWidth: 1,
  borderRightColor: '$border',
  variants: {
    last: { true: { borderRightWidth: 0 } },
  } as const,
  $sm: {
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '$border',
  },
});

const ColHead = styled(Text, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const Row = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 9,
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

const PlayerName = styled(Text, {
  flex: 1,
  fontFamily: '$body',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
});

const TeamShort = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
  marginLeft: 8,
});

const PointsCell = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
  marginLeft: 12,
});

const EmptyText = styled(Text, {
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontFamily: '$body',
  fontSize: 12,
  color: '$colorSubtle',
});

const CapCard = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderTopWidth: 1,
  borderTopColor: '$border',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const CapLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
});

const CapValue = styled(Text, {
  fontFamily: '$body',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
});

const CapSameBadge = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '$positive',
  backgroundColor: '$positiveBg',
  borderWidth: 1,
  borderColor: '$positiveBorder',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 3,
});

export interface DifferentialPlayer {
  id: number;
  name: string;
  teamShort: string;
  livePoints: number;
}

export interface DifferentialsCaptain {
  yoursName: string | null;
  theirsName: string | null;
  same: boolean;
}

export interface DifferentialsPanelProps {
  rivalLabel: string;
  yoursOnly: DifferentialPlayer[];
  theirsOnly: DifferentialPlayer[];
  captain: DifferentialsCaptain;
}

export function DifferentialsPanel({
  rivalLabel,
  yoursOnly,
  theirsOnly,
  captain,
}: DifferentialsPanelProps) {
  return (
    <Wrap>
      <Head>
        <SectionHeader title="Differentials" />
        <SubTitle>vs {rivalLabel}</SubTitle>
      </Head>
      <Cols>
        <Col>
          <ColHead>You have</ColHead>
          <DiffList players={yoursOnly} empty="No unique picks vs this rival." />
        </Col>
        <Col last>
          <ColHead>They have</ColHead>
          <DiffList players={theirsOnly} empty="No unique picks vs this rival." />
        </Col>
      </Cols>
      <CapCard>
        <YStack>
          <CapLabel>Captaincy</CapLabel>
          <CapValue>
            {captain.yoursName ?? '—'} vs {captain.theirsName ?? '—'}
          </CapValue>
        </YStack>
        {captain.same ? <CapSameBadge>Same captain</CapSameBadge> : null}
      </CapCard>
    </Wrap>
  );
}

function DiffList({ players, empty }: { players: DifferentialPlayer[]; empty: string }) {
  if (players.length === 0) {
    return <EmptyText>{empty}</EmptyText>;
  }
  return (
    <YStack>
      {players.map((p, idx) => (
        <Row key={p.id} last={idx === players.length - 1}>
          <PlayerName numberOfLines={1}>{p.name}</PlayerName>
          <TeamShort>{p.teamShort}</TeamShort>
          <PointsCell>{p.livePoints}</PointsCell>
        </Row>
      ))}
    </YStack>
  );
}
