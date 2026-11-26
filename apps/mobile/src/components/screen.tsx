import type { ReactNode } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScrollView, YStack } from '@simplyfpl/ui';

interface ScreenProps {
  children?: ReactNode;
  gap?: number;
  topInset?: boolean;
  /**
   * Stable handle for E2E flows, e.g. "screen-planner". Asserting on this
   * instead of visible copy keeps a smoke test working when wording changes,
   * while still failing when a screen throws and renders nothing.
   */
  testID?: string;
}

// Native page scaffold: scrollable, warm-neutral background, tab-bar-safe
// bottom padding. Replaces the web <PageShell> (which centres a max-width
// column for desktop) with a phone-width column. Pass topInset on screens
// with no native header so content clears the status bar / notch.
export function Screen({ children, gap = 12, topInset = false, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView flex={1} backgroundColor="$background" testID={testID}>
      <YStack
        paddingHorizontal={12}
        paddingTop={topInset ? insets.top + 6 : 12}
        paddingBottom={48}
        gap={gap}
      >
        {children}
      </YStack>
    </ScrollView>
  );
}
