import { DM_Mono, DM_Sans } from 'next/font/google';

import { AppFooter } from '@/components/app-footer';
import { NavBar } from '@/components/nav-bar';
import { Providers } from '@/components/providers';
import { ServiceWorkerInitializer } from '@/components/service-worker-initializer';
import { StaleDataBanner } from '@/components/stale-data-banner';
import { TamaguiClientProvider } from '@/components/tamagui-provider';
import { FEATURE_WEB_PUSH } from '@/lib/feature-flags';
import { detectServerLocale } from '@/lib/locale-detection';
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cfBeaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  const initialLocale = await detectServerLocale();

  return (
    <html
      lang={initialLocale}
      className={`${dmSans.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <TamaguiClientProvider>
          <Providers initialLocale={initialLocale}>
            <NavBar />
            <StaleDataBanner />
            {FEATURE_WEB_PUSH ? <ServiceWorkerInitializer /> : null}
            {children}
            <AppFooter />
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
