'use client';

import { Text, XStack, YStack } from 'tamagui';

interface MetricRowProps {
  siteLabel: string;
  fill: number;
  formattedValue: string;
  accent: 'brand' | 'muted';
}

function MetricRow({ siteLabel, fill, formattedValue, accent }: MetricRowProps) {
  const fillClamped = Math.max(0.04, Math.min(1, fill));
  const barColor = accent === 'brand' ? '$brand' : '$colorSubtle';

  return (
    <YStack gap={5}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$body" fontSize={11} color="$colorMuted">
          {siteLabel}
        </Text>
        <Text fontFamily="$mono" fontSize={12} color="$color">
          {formattedValue}
        </Text>
      </XStack>
      <XStack height={6} borderRadius={3} overflow="hidden">
        <YStack height={6} flexGrow={fillClamped} backgroundColor={barColor} />
        <YStack height={6} flexGrow={1 - fillClamped} backgroundColor="$border" />
      </XStack>
    </YStack>
  );
}

export interface SpeedMetricBarSite {
  label: string;
  value: number;
  formattedValue: string;
}

export interface SpeedMetricBarProps {
  label: string;
  a: SpeedMetricBarSite;
  b: SpeedMetricBarSite;
}

export function SpeedMetricBar({ label, a, b }: SpeedMetricBarProps) {
  const maxValue = Math.max(a.value, b.value, 1);
  const fillA = a.value / maxValue;
  const fillB = b.value / maxValue;

  return (
    <YStack gap={10}>
      <Text
        fontFamily="$body"
        fontSize={10}
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing={1.5}
        color="$colorSubtle"
      >
        {label}
      </Text>
      <MetricRow
        siteLabel={a.label}
        fill={fillA}
        formattedValue={a.formattedValue}
        accent="brand"
      />
      <MetricRow
        siteLabel={b.label}
        fill={fillB}
        formattedValue={b.formattedValue}
        accent="muted"
      />
    </YStack>
  );
}
