import { DM_Mono, DM_Sans } from 'next/font/google';

import { NavBar } from '@/components/nav-bar';
import { Providers } from '@/components/providers';
import { StaleDataBanner } from '@/components/stale-data-banner';
import { TamaguiClientProvider } from '@/components/tamagui-provider';
import { rootMetadata } from '@/lib/metadata';

import '../../public/tamagui.css';
import './globals.css';

export const metadata = rootMetadata;

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
  display: 'optional',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfBeaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body>
        <TamaguiClientProvider>
          <Providers>
            <NavBar />
            <StaleDataBanner />
            {children}
          </Providers>
        </TamaguiClientProvider>
        {cfBeaconToken ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cfBeaconToken })}
          />
        ) : null}
      </body>
    </html>
  );
}
