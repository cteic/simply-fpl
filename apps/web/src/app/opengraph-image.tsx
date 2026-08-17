import { ImageResponse } from 'next/og';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SimplyFPL — Fastest live-rank companion for Fantasy Premier League';

const FONT_TIMEOUT_MS = 3000;

export default async function OpenGraphImage() {
  const [dmMonoResult, dmSansResult] = await Promise.all([
    fetchWithTimeout(
      new URL('https://fonts.gstatic.com/s/dmmono/v16/aFTR7PB1QTsUX8KYvumzIYQ.ttf'),
      FONT_TIMEOUT_MS
    ),
    fetchWithTimeout(
      new URL(
        'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJxhTg.ttf'
      ),
      FONT_TIMEOUT_MS
    ),
  ]);

  const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 500 }[] = [];
  if (dmMonoResult.ok)
    fonts.push({ name: 'DM Mono', data: dmMonoResult.data, style: 'normal', weight: 500 });
  if (dmSansResult.ok)
    fonts.push({ name: 'DM Sans', data: dmSansResult.data, style: 'normal', weight: 500 });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F6F7F4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontFamily: 'DM Mono',
          fontSize: 120,
          fontWeight: 500,
          letterSpacing: -3,
          lineHeight: 1,
        }}
      >
        <span style={{ color: '#15201A' }}>simplyfpl</span>
        <span style={{ color: '#0F766E' }}>.</span>
        <span style={{ color: '#15201A' }}>com</span>
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'DM Sans',
          fontSize: 28,
          fontWeight: 500,
          color: '#566055',
          letterSpacing: -0.4,
        }}
      >
        Fastest live-rank companion for Fantasy Premier League
      </div>
    </div>,
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
