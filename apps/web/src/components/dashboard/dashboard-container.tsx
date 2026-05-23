'use client';

import type { ReactNode } from 'react';

import { YStack } from '@simplyfpl/ui';

interface DashboardContainerProps {
  children: ReactNode;
}

export function DashboardContainer({ children }: DashboardContainerProps) {
  return (
    <YStack data-testid="home-unified-dashboard-scroll" style={{ scrollSnapType: 'y proximity' }}>
      {children}
    </YStack>
  );
}

interface DashboardSectionProps {
  id: string;
  fillViewport?: boolean;
  index?: number;
  children: ReactNode;
}

const STAGGER_STEP_S = 0.06;
const MAX_STAGGER_STEPS = 4;

export function DashboardSection({ id, fillViewport, index = 0, children }: DashboardSectionProps) {
  const delay = Math.min(index, MAX_STAGGER_STEPS) * STAGGER_STEP_S;
  return (
    <YStack
      id={id}
      style={{
        scrollSnapAlign: 'start',
        minHeight: fillViewport ? '100svh' : undefined,
        animation: 'sfFadeUp 0.5s ease both',
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </YStack>
  );
}
