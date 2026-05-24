'use client';

import { Text, XStack, YStack, useTheme, useThemeName } from 'tamagui';

import { featureSurfaceStyle, getThemeDesign, resolveThemeName } from '../../theme';
import { Logo } from '../logo';
import { NumberTicker } from '../number-ticker';

const DEFAULT_SPARKLINE = '0,33 57,34 114,28 171,30 228,19 285,21 342,10 400,6';

export interface RankHeroPostSubs {
  postSubsRank: number;
  oldRank: number;
  changePct: number;
}

interface RankHeroProps {
  rankValue: number | null;
  movementLabel: string | null;
  movementUp: boolean;
  sinceLabel: string;
  freshnessLabel: string;
  postSubs?: RankHeroPostSubs | null;
  sparklinePoints?: string;
}

function Sparkline({ stroke, dot, points }: { stroke: string; dot: string; points: string }) {
  return (
    <svg
      viewBox="0 0 400 40"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={400} cy={6} r={3.4} fill={dot} stroke={stroke} strokeWidth={2} />
    </svg>
  );
}

export function RankHero({
  rankValue,
  movementLabel,
  movementUp,
  sinceLabel,
  freshnessLabel,
  postSubs = null,
  sparklinePoints = DEFAULT_SPARKLINE,
}: RankHeroProps) {
  const themeName = resolveThemeName(useThemeName());
  const design = getThemeDesign(themeName);
  const theme = useTheme();
  const accent = theme.stadiumAccent?.val ?? '#34D399';
  const inverseColor = theme.inverse?.val ?? '#FFFFFF';
  const bare = design.hero === 'bare';

  const eyebrow = (
    <Text
      fontFamily="$body"
      fontSize={10}
      fontWeight="600"
      textTransform="uppercase"
      letterSpacing={1.4}
      color="$stadiumAccent"
    >
      est. live rank
    </Text>
  );

  const number = (
    <NumberTicker
      value={rankValue}
      format={(n) => n.toLocaleString()}
      fontFamily="$mono"
      fontSize={bare ? 72 : 56}
      lineHeight={bare ? 70 : 58}
      fontWeight={design.heroNumberWeight}
      letterSpacing={-2}
      color="$inverse"
      marginTop={bare ? 4 : 6}
      $sm={{ fontSize: bare ? 48 : 44, lineHeight: bare ? 48 : 46 }}
    />
  );

  let movementChip = (
    <XStack
      alignItems="center"
      borderWidth={1}
      borderColor="$overlay5"
      paddingHorizontal={10}
      paddingVertical={3}
      borderRadius={99}
    >
      <Text fontFamily="$body" fontSize={12} color="$inverseStrong">
        live
      </Text>
    </XStack>
  );
  if (movementLabel && bare) {
    movementChip = (
      <XStack
        alignItems="center"
        backgroundColor={movementUp ? '$positiveBg' : '$negativeBg'}
        paddingHorizontal={10}
        paddingVertical={3}
        borderRadius={99}
      >
        <Text
          fontFamily="$mono"
          fontSize={13}
          fontWeight="500"
          color={movementUp ? '$positive' : '$negative'}
        >
          {movementLabel}
        </Text>
      </XStack>
    );
  } else if (movementLabel) {
    movementChip = (
      <XStack
        alignItems="center"
        backgroundColor="$stadiumAccent"
        paddingHorizontal={10}
        paddingVertical={3}
        borderRadius={99}
      >
        <Text fontFamily="$mono" fontSize={13} fontWeight="500" color={design.heroChipText}>
          {movementLabel}
        </Text>
      </XStack>
    );
  }

  const movementRow = (
    <XStack alignItems="center" gap={10} marginTop={8} flexWrap="wrap">
      {movementChip}
      <Text fontFamily="$body" fontSize={12.5} color="$inverseStrong">
        {sinceLabel}
      </Text>
    </XStack>
  );

  const postSubsRow = postSubs ? (
    <XStack alignItems="center" gap={10} marginTop={6} flexWrap="wrap">
      <Text fontFamily="$mono" fontSize={12.5} color="$inverseStrong">
        Post-subs ~{postSubs.postSubsRank.toLocaleString()}
      </Text>
      <Text fontFamily="$body" fontSize={12.5} color="$inverseSoft">
        was {postSubs.oldRank.toLocaleString()}
      </Text>
      <Text
        fontFamily="$mono"
        fontSize={12.5}
        color={postSubs.changePct >= 0 ? '$stadiumAccent' : '$inverseStrong'}
      >
        {postSubs.changePct >= 0 ? '+' : ''}
        {postSubs.changePct.toFixed(1)}%
      </Text>
    </XStack>
  ) : null;

  const refreshBar = (
    <XStack alignItems="center" gap={10} flexWrap="wrap" flex={1} minWidth={160}>
      <YStack flex={1} height={4} borderRadius={2} backgroundColor="$overlay4" overflow="hidden">
        <YStack
          height={4}
          borderRadius={2}
          backgroundColor="$stadiumAccent"
          style={{ animation: 'sfRefresh 60s linear infinite' }}
        />
      </YStack>
      <Text fontFamily="$body" fontSize={11} color="$inverseMuted" aria-label="Live data freshness">
        {freshnessLabel}
      </Text>
    </XStack>
  );

  if (bare) {
    return (
      <YStack>
        {eyebrow}
        {number}
        {movementRow}
        {postSubsRow}
        <XStack
          alignItems="center"
          gap={14}
          marginTop={16}
          paddingVertical={12}
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor="$border"
          flexWrap="wrap"
        >
          <YStack flex={1} minWidth={140} height={34}>
            <Sparkline stroke={accent} dot={accent} points={sparklinePoints} />
          </YStack>
          {refreshBar}
        </XStack>
      </YStack>
    );
  }

  const surface = featureSurfaceStyle(themeName, 'hero');
  return (
    <YStack
      borderRadius={design.cardRadius}
      overflow="hidden"
      paddingHorizontal={22}
      paddingVertical={22}
      backgroundColor="$featureSurface"
      borderWidth={surface.borderWidth}
      borderColor="$featureBorder"
      shadowColor={design.cardShadow.shadowColor}
      shadowOffset={design.cardShadow.shadowOffset}
      shadowOpacity={design.cardShadow.shadowOpacity}
      shadowRadius={design.cardShadow.shadowRadius}
      style={{ backgroundImage: surface.backgroundImage }}
    >
      {design.heroLogo ? (
        <YStack marginBottom={12}>
          <Logo variant="lockup" tone="stadium" size="md" />
        </YStack>
      ) : null}
      {eyebrow}
      {number}
      {movementRow}
      {postSubsRow}
      <YStack height={40} marginTop={14}>
        <Sparkline stroke={accent} dot={inverseColor} points={sparklinePoints} />
      </YStack>
      <XStack marginTop={12}>{refreshBar}</XStack>
    </YStack>
  );
}
