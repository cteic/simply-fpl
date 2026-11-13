import { ImageResponse } from 'next/og';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export const dynamic = 'force-dynamic';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SimplyFPL vs livefpl.net — weekly speed comparison';

const FONT_TIMEOUT_MS = 3000;

export default async function VsLivefplOgImage() {
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

  const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 500 | 700 }[] = [];
  if (dmMonoResult.ok)
    fonts.push({ name: 'DM Mono', data: dmMonoResult.data, style: 'normal', weight: 500 });
  if (dmSansResult.ok)
    fonts.push({ name: 'DM Sans', data: dmSansResult.data, style: 'normal', weight: 700 });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0B4F49',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontFamily: 'DM Sans',
          fontSize: 52,
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: -1.5,
          lineHeight: 1,
        }}
      >
        SimplyFPL vs livefpl.net
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: '100%',
          maxWidth: 900,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'DM Sans',
            fontSize: 20,
            color: 'rgba(255,255,255,0.72)',
            letterSpacing: -0.3,
          }}
        >
          Weekly speed comparison — time to first data, page weight, third-party requests
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'DM Sans',
            fontSize: 16,
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          Measured via headless Chrome every Monday at 06:00 UTC
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'DM Mono',
          fontSize: 18,
          fontWeight: 500,
          color: '#5EEAD4',
          letterSpacing: -0.2,
        }}
      >
        simplyfpl.com/vs-livefpl
      </div>
    </div>,
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
