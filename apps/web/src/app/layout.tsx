import type { Metadata } from 'next';
import { DM_Mono, DM_Sans } from 'next/font/google';

import { DemoBanner } from '@simplyfpl/ui';

import { NavBar } from '@/components/nav-bar';
import { Providers } from '@/components/providers';
import { TamaguiClientProvider } from '@/components/tamagui-provider';

import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SimplyFPL — Live FPL Companion',
  description: 'Live rank, mini-leagues, price changes and more for Fantasy Premier League.',
  openGraph: {
    title: 'SimplyFPL',
    description: 'Live FPL tools — rank tracker, price changes, mini-leagues',
    url: 'https://simplyfpl.com',
    siteName: 'SimplyFPL',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body>
        <TamaguiClientProvider>
          <Providers>
            <DemoBanner />
            <NavBar />
            {children}
          </Providers>
        </TamaguiClientProvider>
      </body>
    </html>
  );
}
