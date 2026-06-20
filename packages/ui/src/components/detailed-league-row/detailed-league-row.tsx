'use client';

import { useState } from 'react';

import { Text, XStack, YStack, styled } from 'tamagui';

import type { DetailedLeagueRowData } from '@simplyfpl/types';

import { buildDetailedLeagueRowView, toggleExpanded } from './detailed-league-row-state';

const Root = styled(YStack, {
  width: '100%',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    you: {
      true: {
        backgroundColor: '$brandBg',
        borderLeftWidth: 3,
        borderLeftColor: '$brand',
      },
    },
    last: {
      true: { borderBottomWidth: 0 },
    },
  } as const,
});

const Header = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$background' },
  variants: {
    you: {
      true: { hoverStyle: { backgroundColor: '$brandBg' } },
    },
  } as const,
});

const Position = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11,
  color: '$colorSubtle',
  width: 22,
});

const Manager = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  fontWeight: '500',
  letterSpacing: '$5',
  color: '$color',
});

const TeamName = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorSubtle',
  marginTop: 1,
});

const YouTag = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '#FFFFFF',
  backgroundColor: '$brand',
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 3,
  marginLeft: 5,
});

const ChipPill = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '$colorMuted',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderStrong',
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 3,
  marginLeft: 6,
});

const HitPill = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$mono',
  fontSize: 10,
  fontWeight: '500',
  color: '$negative',
  backgroundColor: '$negativeBg',
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 3,
  marginLeft: 6,
});

const GwScore = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12,
  color: '$colorMuted',
  textAlign: 'right',
});

const Total = styled(Text, {
  fontFamily: '$mono',
  fontSize: 13,
  fontWeight: '500',
  color: '$color',
  textAlign: 'right',
  width: 52,
});

const Chevron = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11,
  color: '$colorSubtle',
  width: 14,
  textAlign: 'center',
});

const Detail = styled(YStack, {
  paddingHorizontal: 16,
  paddingBottom: 12,
  paddingLeft: 48,
  gap: 6,
});

const DetailLine = styled(XStack, {
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
});

const DetailLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '$colorSubtle',
  width: 54,
});

const DetailValue = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11.5,
  color: '$color',
  variants: {
    look: {
      muted: { color: '$colorMuted' },
      subtle: { color: '$colorSubtle' },
      amber: { color: '$warning' },
    },
  } as const,
});

export interface DetailedLeagueRowProps {
  data: DetailedLeagueRowData;
  last?: boolean;
  defaultExpanded?: boolean;
}

export function DetailedLeagueRow({
  data,
  last = false,
  defaultExpanded = false,
}: DetailedLeagueRowProps) {
  const view = buildDetailedLeagueRowView(data);
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Root you={view.highlighted} last={last}>
      <Header you={view.highlighted} onPress={() => setExpanded(toggleExpanded)}>
        <Position>{data.position}</Position>
        <YStack flex={1} minWidth={0}>
          <XStack alignItems="center" flexWrap="wrap">
            <Manager>{data.managerName}</Manager>
            {view.highlighted ? <YouTag>You</YouTag> : null}
            {view.chipLabel ? <ChipPill>{view.chipLabel}</ChipPill> : null}
            {view.hitLabel ? <HitPill>{view.hitLabel}</HitPill> : null}
          </XStack>
          <TeamName numberOfLines={1}>{data.teamName}</TeamName>
        </YStack>
        <GwScore>{view.gwScoreLabel}</GwScore>
        <Total>{data.totalPoints}</Total>
        <Chevron>{expanded ? '▾' : '▸'}</Chevron>
      </Header>
      {expanded ? (
        <Detail>
          {view.captainLabel ? (
            <DetailLine>
              <DetailLabel>Cap</DetailLabel>
              <DetailValue>{view.captainLabel}</DetailValue>
            </DetailLine>
          ) : null}
          {view.transferSummary ? (
            <DetailLine>
              <DetailLabel>Transfers</DetailLabel>
              <DetailValue look="subtle">out: {view.transferSummary.out}</DetailValue>
              <DetailValue>in: {view.transferSummary.in}</DetailValue>
              {view.transferSummary.hitLabel ? (
                <DetailValue look="amber">({view.transferSummary.hitLabel})</DetailValue>
              ) : null}
            </DetailLine>
          ) : null}
          {view.benchWaste ? (
            <DetailLine>
              <DetailLabel>Bench</DetailLabel>
              <DetailValue look="amber">{view.benchWaste}</DetailValue>
            </DetailLine>
          ) : null}
          <DetailLine>
            <DetailLabel>Played</DetailLabel>
            <DetailValue look="muted">{view.playedLabel}</DetailValue>
          </DetailLine>
        </Detail>
      ) : null}
    </Root>
  );
}
