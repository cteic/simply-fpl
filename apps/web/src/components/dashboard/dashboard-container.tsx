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
  children: ReactNode;
}

export function DashboardSection({ id, fillViewport, children }: DashboardSectionProps) {
  return (
    <YStack
      id={id}
      style={{
        scrollSnapAlign: 'start',
        minHeight: fillViewport ? '100svh' : undefined,
      }}
    >
      {children}
    </YStack>
  );
}
