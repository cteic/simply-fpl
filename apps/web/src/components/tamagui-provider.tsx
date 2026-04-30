'use client';

import type { ReactNode } from 'react';

import { TamaguiProvider } from 'tamagui';

import { config } from '@simplyfpl/ui/tamagui.config';

interface TamaguiClientProviderProps {
  children: ReactNode;
}

export function TamaguiClientProvider({ children }: TamaguiClientProviderProps) {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}
