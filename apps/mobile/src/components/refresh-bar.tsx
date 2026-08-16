import { useEffect, useRef } from 'react';

import { Animated, Easing } from 'react-native';

import { YStack } from '@simplyfpl/ui';

const CYCLE_MS = 60_000;

interface RefreshBarProps {
  paused?: boolean;
}

export function RefreshBar({ paused = false }: RefreshBarProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) return undefined;
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [paused, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <YStack
      flex={1}
      height={4}
      borderRadius={2}
      backgroundColor="rgba(255,255,255,0.18)"
      overflow="hidden"
    >
      <Animated.View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: '#34D399',
          width,
        }}
      />
    </YStack>
  );
}
