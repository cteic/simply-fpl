'use client';

import { Text, XStack, YStack, useThemeName } from 'tamagui';

import { getThemeDesign, resolveThemeName } from '../../theme';
import { NumberTicker } from '../number-ticker';

export interface StatTileData {
  label: string;
  value: string;
  tick: number | null;
  sub: string;
  accent: string;
}

interface StatTilesProps {
  tiles: StatTileData[];
}

const TWO_COL = { display: 'grid' as const, gridTemplateColumns: '1fr 1fr' };
const SEAM_TWO_COL = {
  display: 'grid' as const,
  gridTemplateColumns: '1fr 1fr',
  gap: '1px',
};

function seamGrid(columns: number) {
  return {
    display: 'grid' as const,
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: '1px',
  };
}

const WASH: Record<string, string> = {
  $positive: '$positiveBg',
  $brand: '$brandBg',
  $warning: '$warningBg',
  $negative: '$negativeBg',
  $colorSubtle: '$background',
};

function washFor(accent: string): string {
  return WASH[accent] ?? '$background';
}

function valueColorFor(accent: string): string {
  return accent === '$colorSubtle' ? '$color' : accent;
}

interface TileBodyProps {
  tile: StatTileData;
  valueColor: string;
  valueWeight: '300' | '400' | '500';
  valueSize: number;
  labelColor?: string;
  dot?: boolean;
}

function TileBody({
  tile,
  valueColor,
  valueWeight,
  valueSize,
  labelColor = '$colorSubtle',
  dot = false,
}: TileBodyProps) {
  return (
    <>
      <XStack alignItems="center" gap={5} marginBottom={8}>
        {dot ? (
          <YStack width={6} height={6} borderRadius={99} backgroundColor={tile.accent} />
        ) : null}
        <Text
          fontFamily="$body"
          fontSize={9.5}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={0.6}
          color={labelColor}
        >
          {tile.label}
        </Text>
      </XStack>
      {tile.tick !== null ? (
        <NumberTicker
          value={tile.tick}
          format={(n) => n.toLocaleString()}
          fontFamily="$mono"
          fontSize={valueSize}
          lineHeight={valueSize + 2}
          fontWeight={valueWeight}
          color={valueColor}
        />
      ) : (
        <Text
          fontFamily="$mono"
          fontSize={valueSize}
          lineHeight={valueSize + 2}
          fontWeight={valueWeight}
          color={valueColor}
          numberOfLines={1}
        >
          {tile.value}
        </Text>
      )}
      <Text fontFamily="$body" fontSize={10.5} color="$colorMuted" marginTop={6}>
        {tile.sub}
      </Text>
    </>
  );
}

export function StatTiles({ tiles }: StatTilesProps) {
  const design = getThemeDesign(resolveThemeName(useThemeName()));

  if (design.statTiles === 'accent') {
    return (
      <XStack gap={10} style={TWO_COL}>
        {tiles.map((tile) => (
          <YStack
            key={tile.label}
            backgroundColor={washFor(tile.accent)}
            borderWidth={1}
            borderColor="$border"
            borderLeftWidth={4}
            borderLeftColor={tile.accent}
            borderRadius={10}
            paddingHorizontal={16}
            paddingVertical={14}
            shadowColor="#14281E"
            shadowOffset={{ width: 0, height: 1 }}
            shadowOpacity={0.05}
            shadowRadius={3}
          >
            <TileBody
              tile={tile}
              valueColor={valueColorFor(tile.accent)}
              valueWeight="400"
              valueSize={26}
            />
          </YStack>
        ))}
      </XStack>
    );
  }

  if (design.statTiles === 'grid') {
    return (
      <YStack
        borderWidth={1}
        borderColor="$border"
        borderRadius={design.cardRadius}
        overflow="hidden"
        backgroundColor="$border"
        style={SEAM_TWO_COL}
      >
        {tiles.map((tile) => (
          <YStack
            key={tile.label}
            backgroundColor="$surface"
            borderTopWidth={2}
            borderTopColor={tile.accent}
            paddingHorizontal={16}
            paddingVertical={14}
          >
            <TileBody
              tile={tile}
              valueColor={valueColorFor(tile.accent)}
              valueWeight="500"
              valueSize={26}
            />
          </YStack>
        ))}
      </YStack>
    );
  }

  const quietColumns = tiles.length % 3 === 0 ? 3 : 2;
  return (
    <YStack
      borderWidth={1}
      borderColor="$border"
      borderRadius={design.cardRadius}
      overflow="hidden"
      backgroundColor="$border"
      style={seamGrid(quietColumns)}
    >
      {tiles.map((tile) => (
        <YStack
          key={tile.label}
          backgroundColor="$surface"
          paddingHorizontal={14}
          paddingVertical={14}
        >
          <TileBody tile={tile} valueColor="$color" valueWeight="300" valueSize={22} dot />
        </YStack>
      ))}
    </YStack>
  );
}
