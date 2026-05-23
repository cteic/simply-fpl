import type { ComponentProps, ReactNode } from 'react';

import { StyleSheet } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { YStack } from '@simplyfpl/ui';

// Linear approximation of the web "Vibrant Stadium" radial teal gradient
// (radial-gradient(... #1A8A6E 0%, #0F766E 45%, #0B4F49 100%)). React Native
// has no radial gradient, so we run the same stops top-right -> bottom-left.
const STADIUM_COLORS = ['#1A8A6E', '#0F766E', '#0B4F49'] as const;
const STADIUM_LOCATIONS = [0, 0.45, 1] as const;

interface StadiumGradientProps extends ComponentProps<typeof YStack> {
  children: ReactNode;
}

export function StadiumGradient({ children, ...rest }: StadiumGradientProps) {
  return (
    <YStack overflow="hidden" backgroundColor="$brand" {...rest}>
      <LinearGradient
        colors={STADIUM_COLORS}
        locations={STADIUM_LOCATIONS}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </YStack>
  );
}
