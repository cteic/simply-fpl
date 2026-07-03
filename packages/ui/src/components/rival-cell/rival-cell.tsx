'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { t } from '@simplyfpl/i18n';

import { Card } from '../card';

const Wrap = styled(Card, {
  paddingHorizontal: 16,
  paddingVertical: 12,
  variants: {
    you: {
      true: {
        backgroundColor: '$brandBg',
        borderColor: '$brand',
      },
    },
  } as const,
});

const Rank = styled(Text, {
  fontFamily: '$mono',
  fontSize: 13,
  fontWeight: '500',
  color: '$colorSubtle',
  minWidth: 28,
});

const Manager = styled(Text, {
  fontFamily: '$body',
  fontSize: 13,
  fontWeight: '500',
  letterSpacing: '$5',
  color: '$color',
});

const TeamName = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
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
  marginLeft: 6,
});

const ChipBadge = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '$warning',
  backgroundColor: '$warningBg',
  borderWidth: 1,
  borderColor: '$warningBorder',
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 3,
  marginLeft: 6,
});

const HitBadge = styled(Text, {
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

const Points = styled(Text, {
  fontFamily: '$mono',
  fontSize: 18,
  fontWeight: '500',
  color: '$color',
});

const MetaRow = styled(XStack, {
  gap: 10,
  marginTop: 4,
  flexWrap: 'wrap',
});

const MetaLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorSubtle',
});

const MetaValue = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11,
  color: '$colorMuted',
  marginLeft: 4,
});

const CHIP_LABEL: Record<string, string> = {
  bboost: 'BB',
  '3xc': 'TC',
  freehit: 'FH',
  wildcard: 'WC',
};

function chipLabel(chip: string | null): string | null {
  if (chip === null) return null;
  return CHIP_LABEL[chip] ?? chip.toUpperCase();
}

export interface RivalCellProps {
  rank: number | null;
  managerName: string;
  teamName: string;
  livePoints: number;
  captainName?: string | null;
  captainPoints?: number | null;
  captainMultiplier: number;
  activeChip: string | null;
  transferHits: number;
  benchPointsWasted: number;
  isYou?: boolean;
  onPress?: () => void;
}

export function RivalCell({
  rank,
  managerName,
  teamName,
  livePoints,
  captainName,
  captainPoints,
  captainMultiplier,
  activeChip,
  transferHits,
  benchPointsWasted,
  isYou = false,
  onPress,
}: RivalCellProps) {
  const chip = chipLabel(activeChip);
  const captainSuffix = captainMultiplier === 3 ? ' (TC)' : ' (C)';
  return (
    <Wrap
      you={isYou}
      {...(onPress !== undefined && !isYou
        ? { onPress, cursor: 'pointer', hoverStyle: { borderColor: '$borderStrong' } }
        : {})}
    >
      <XStack alignItems="center" gap={10}>
        <Rank>{rank === null ? '—' : `#${rank}`}</Rank>
        <YStack flex={1} minWidth={0}>
          <XStack alignItems="center" flexWrap="wrap">
            <Manager>{managerName}</Manager>
            {isYou ? <YouTag>{t('shared.you')}</YouTag> : null}
            {chip ? <ChipBadge>{chip}</ChipBadge> : null}
            {transferHits > 0 ? <HitBadge>-{transferHits}</HitBadge> : null}
          </XStack>
          <TeamName numberOfLines={1}>{teamName}</TeamName>
        </YStack>
        <Points>{livePoints}</Points>
      </XStack>
      <MetaRow>
        {captainName ? (
          <XStack alignItems="center">
            <MetaLabel>{t('shared.cap')}</MetaLabel>
            <MetaValue>
              {captainName}
              {captainSuffix}
              {captainPoints !== undefined && captainPoints !== null
                ? ` · ${captainPoints * captainMultiplier}`
                : ''}
            </MetaValue>
          </XStack>
        ) : null}
        <XStack alignItems="center">
          <MetaLabel>{t('shared.bench')}</MetaLabel>
          <MetaValue>{benchPointsWasted}</MetaValue>
        </XStack>
      </MetaRow>
    </Wrap>
  );
}
