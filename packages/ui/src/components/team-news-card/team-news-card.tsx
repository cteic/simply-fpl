'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import type { PlayerNewsItem, PlayerNewsStatus } from '@simplyfpl/types';

import { Card } from '../card';
import { SectionHeader } from '../section-header';
import { Skeleton } from '../skeleton';

const StatusPill = styled(Text, {
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 3,
  variants: {
    tone: {
      doubt: { backgroundColor: '$warningBg', color: '$warning' },
      suspended: { backgroundColor: '$infoBg', color: '$info' },
      injured: { backgroundColor: '$negativeBg', color: '$negative' },
      unavailable: { backgroundColor: '$backgroundStrong', color: '$colorSubtle' },
    },
  } as const,
  defaultVariants: { tone: 'doubt' },
});

const PlayerName = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  fontWeight: '500',
  color: '$color',
  flex: 1,
});

const NewsText = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
  flex: 1,
  marginTop: 1,
});

const CopText = styled(Text, {
  fontFamily: '$mono',
  fontSize: 10,
  color: '$colorMuted',
  marginTop: 2,
});

const Row = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  alignItems: 'flex-start',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const EmptyText = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  color: '$colorSubtle',
  paddingHorizontal: 16,
  paddingVertical: 14,
  textAlign: 'center',
});

type StatusTone = 'doubt' | 'suspended' | 'injured' | 'unavailable';

function statusTone(status: PlayerNewsStatus): StatusTone {
  if (status === 'suspended') return 'suspended';
  if (status === 'injured') return 'injured';
  if (status === 'unavailable') return 'unavailable';
  return 'doubt';
}

function statusLabel(status: PlayerNewsStatus): string {
  if (status === 'suspended') return 'Susp';
  if (status === 'injured') return 'Inj';
  if (status === 'unavailable') return 'N/A';
  return 'Doubt';
}

interface PlayerRowProps {
  player: PlayerNewsItem;
  isLast: boolean;
}

function PlayerRow({ player, isLast }: PlayerRowProps) {
  return (
    <Row borderBottomWidth={isLast ? 0 : 1}>
      <YStack flex={1} gap={2}>
        <XStack alignItems="center" gap={8}>
          <PlayerName numberOfLines={1}>{player.web_name}</PlayerName>
          <StatusPill tone={statusTone(player.status)}>{statusLabel(player.status)}</StatusPill>
        </XStack>
        {player.news !== '' && <NewsText numberOfLines={2}>{player.news}</NewsText>}
        {player.chance_of_playing_next_round !== null && (
          <CopText>{player.chance_of_playing_next_round}% chance</CopText>
        )}
      </YStack>
    </Row>
  );
}

export interface TeamNewsCardProps {
  players: PlayerNewsItem[];
}

export function TeamNewsCard({ players }: TeamNewsCardProps) {
  return (
    <YStack>
      <SectionHeader title="Team News" />
      <Card>
        {players.length === 0 ? (
          <EmptyText>All your players are available</EmptyText>
        ) : (
          players.map((player, i) => (
            <PlayerRow key={player.id} player={player} isLast={i === players.length - 1} />
          ))
        )}
      </Card>
    </YStack>
  );
}

export function TeamNewsCardSkeleton() {
  return (
    <YStack>
      <SectionHeader title="Team News" />
      <Card paddingHorizontal={16} paddingVertical={14} gap={10}>
        <Skeleton height={14} borderRadius={3} />
        <Skeleton height={14} borderRadius={3} width="70%" />
        <Skeleton height={14} borderRadius={3} width="85%" />
      </Card>
    </YStack>
  );
}
