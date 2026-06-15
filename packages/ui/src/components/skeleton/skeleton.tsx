'use client';

import { XStack, YStack, styled } from 'tamagui';

import { colors } from '../../theme';
import { Card } from '../card';

/**
 * Skeleton
 * --------
 * Shared loading placeholders. Replaces the bare "Loading…" text the app used
 * to show. A single shimmering `Skeleton` block composes into the table / rank
 * / prices skeletons below, so every loading surface reads the same.
 *
 * The shimmer uses the `sfShimmer` keyframe (apps/web/src/app/globals.css);
 * on native it degrades to a static block, which is fine.
 */

const SHIMMER = {
  backgroundImage: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bg} 50%, ${colors.border} 75%)`,
  backgroundSize: '400% 100%',
  animation: 'sfShimmer 1.2s ease-in-out infinite',
} as const;

export const Skeleton = styled(YStack, {
  backgroundColor: '$border',
  borderRadius: '$2',
  style: SHIMMER,
});

const TableRow = styled(XStack, {
  alignItems: 'center',
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 11,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

interface SkeletonRowsProps {
  rows?: number;
}

export function SkeletonLeagueTable({ rows = 6 }: SkeletonRowsProps) {
  return (
    <Card>
      <TableRow>
        <Skeleton width={20} height={10} />
        <Skeleton flex={1} height={10} maxWidth={120} />
        <Skeleton width={36} height={10} />
        <Skeleton width={48} height={10} />
      </TableRow>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} last={i === rows - 1}>
          <Skeleton width={16} height={12} />
          <YStack flex={1} gap={5}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="35%" height={9} />
          </YStack>
          <Skeleton width={36} height={12} />
          <Skeleton width={48} height={12} />
        </TableRow>
      ))}
    </Card>
  );
}

export function SkeletonPrices({ rows = 6 }: SkeletonRowsProps) {
  return (
    <Card>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} last={i === rows - 1}>
          <Skeleton width={12} height={10} />
          <YStack flex={1} gap={5}>
            <Skeleton width="45%" height={12} />
            <Skeleton width="65%" height={9} />
          </YStack>
          <Skeleton flex={1} height={4} maxWidth={120} borderRadius={2} />
          <YStack alignItems="flex-end" gap={5} width={64}>
            <Skeleton width={44} height={12} />
            <Skeleton width={32} height={10} />
          </YStack>
        </TableRow>
      ))}
    </Card>
  );
}

export function SkeletonCohortTable() {
  const headerWidths = [20, 16, 28, 32, 24];
  const rowLabelWidths = [40, 72, 64, 56];
  return (
    <YStack borderTopWidth={1} borderBottomWidth={1} borderColor="$border">
      <XStack
        paddingHorizontal={12}
        paddingVertical={10}
        borderBottomWidth={1}
        borderBottomColor="$border"
        alignItems="center"
      >
        <YStack flex={1.4}>
          <Skeleton width={headerWidths[0]} height={8} />
        </YStack>
        {headerWidths.slice(1).map((w, i) => (
          <YStack key={i} flex={1} alignItems="flex-end">
            <Skeleton width={w} height={8} />
          </YStack>
        ))}
      </XStack>
      {rowLabelWidths.map((labelWidth, i) => (
        <XStack
          key={i}
          paddingHorizontal={12}
          paddingVertical={10}
          borderBottomWidth={i < rowLabelWidths.length - 1 ? 1 : 0}
          borderBottomColor="$border"
          alignItems="center"
        >
          <YStack flex={1.4}>
            <Skeleton width={labelWidth} height={10} />
          </YStack>
          {[24, 28, 28, 28].map((w, j) => (
            <YStack key={j} flex={1} alignItems="flex-end">
              <Skeleton width={w} height={10} />
            </YStack>
          ))}
        </XStack>
      ))}
    </YStack>
  );
}

export function SkeletonLiveRank() {
  return (
    <YStack gap={16}>
      <Card paddingHorizontal={22} paddingVertical={22} gap={12}>
        <Skeleton width={96} height={10} />
        <Skeleton width={180} height={44} borderRadius={6} />
        <Skeleton width={120} height={14} />
        <Skeleton width="100%" height={4} borderRadius={2} />
      </Card>
      <XStack flexWrap="wrap" gap={10}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            flexGrow={1}
            flexBasis={120}
            minWidth={120}
            paddingHorizontal={16}
            paddingVertical={14}
            gap={8}
          >
            <Skeleton width={64} height={9} />
            <Skeleton width={88} height={24} borderRadius={6} />
            <Skeleton width={48} height={9} />
          </Card>
        ))}
      </XStack>
    </YStack>
  );
}
