'use client';

import type { ReactNode } from 'react';

import { YStack, styled } from 'tamagui';

const Shell = styled(YStack, {
  width: '100%',
  maxWidth: 960,
  marginHorizontal: 'auto',
  paddingHorizontal: 28,
  paddingTop: 32,
  paddingBottom: 100,
  $sm: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 80 },
});

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return <Shell tag="main">{children}</Shell>;
}
