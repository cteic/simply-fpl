import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
