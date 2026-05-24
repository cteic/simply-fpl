'use client';

import type { ReactNode } from 'react';

import { useServerInsertedHTML } from 'next/navigation';

import { TamaguiProvider } from 'tamagui';

import { config } from '@simplyfpl/ui/tamagui.config';

interface TamaguiClientProviderProps {
  children: ReactNode;
}

/**
 * Client boundary that wraps the app in Tamagui's provider AND injects the
 * Tamagui-generated CSS into the SSR'd <head>.
 *
 * `useServerInsertedHTML` is a Next.js App Router hook that runs only during
 * the server render pass — on the client it's a no-op. Whatever React node it
 * returns lands inside <head> in the initial HTML, before any client JS
 * executes. This kills the brief flash of unstyled content (theme tokens,
 * spacing, media queries, base resets) that we'd otherwise see while the
 * Tamagui runtime hydrates and injects styles via JS.
 *
 * What this does NOT do: extract per-component atomic CSS at build time. For
 * that we'd need `@tamagui/next-plugin` (Option B in docs/notes/tamagui-ssr.md)
 * which has a separate set of trade-offs and is a larger change.
 */
export function TamaguiClientProvider({ children }: TamaguiClientProviderProps) {
  useServerInsertedHTML(() => (
    <style
      key="tamagui-ssr"
      dangerouslySetInnerHTML={{
        __html: config.getCSS({ exclude: 'design-system' }),
      }}
    />
  ));

  return (
    <TamaguiProvider config={config} defaultTheme="light" disableInjectCSS>
      {children}
    </TamaguiProvider>
  );
}
