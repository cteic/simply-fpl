import type { ReactNode } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScrollView, YStack } from '@simplyfpl/ui';

interface ScreenProps {
  children?: ReactNode;
  gap?: number;
  topInset?: boolean;
}

// Native page scaffold: scrollable, warm-neutral background, tab-bar-safe
// bottom padding. Replaces the web <PageShell> (which centres a max-width
// column for desktop) with a phone-width column. Pass topInset on screens
// with no native header so content clears the status bar / notch.
export function Screen({ children, gap = 16, topInset = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack
        paddingHorizontal={16}
        paddingTop={topInset ? insets.top + 16 : 16}
        paddingBottom={48}
        gap={gap}
      >
        {children}
      </YStack>
    </ScrollView>
  );
}
