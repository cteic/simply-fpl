import { ImageResponse } from 'next/og';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export const dynamic = 'force-dynamic';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const FONT_TIMEOUT_MS = 3000;

export default async function AppleIcon() {
  const dmMonoResult = await fetchWithTimeout(
    new URL('https://fonts.gstatic.com/s/dmmono/v16/aFTR7PB1QTsUX8KYvumzIYQ.ttf'),
    FONT_TIMEOUT_MS
  );

  const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 500 }[] = [];
  if (dmMonoResult.ok)
    fonts.push({ name: 'DM Mono', data: dmMonoResult.data, style: 'normal', weight: 500 });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F6F7F4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Mono',
        fontSize: 124,
        fontWeight: 500,
        letterSpacing: -3,
      }}
    >
      <span style={{ color: '#15201A' }}>s</span>
      <span style={{ color: '#0F766E' }}>.</span>
    </div>,
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
