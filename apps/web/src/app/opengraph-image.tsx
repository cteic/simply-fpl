import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SimplyFPL — Fastest live-rank companion for Fantasy Premier League';

export default async function OpenGraphImage() {
  const [dmMono, dmSans] = await Promise.all([
    fetch(
      new URL('https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYthSQBK6POlIuxg.woff2')
    ).then((res) => res.arrayBuffer()),
    fetch(
      new URL(
        'https://fonts.gstatic.com/s/dmsans/v14/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop0.woff2'
      )
    ).then((res) => res.arrayBuffer()),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F7F7F5',
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
        <span style={{ color: '#1A1A18' }}>simplyfpl</span>
        <span style={{ color: '#0F766E' }}>.</span>
        <span style={{ color: '#1A1A18' }}>com</span>
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'DM Sans',
          fontSize: 28,
          fontWeight: 500,
          color: '#6B6B63',
          letterSpacing: -0.4,
        }}
      >
        Fastest live-rank companion for Fantasy Premier League
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'DM Mono', data: dmMono, style: 'normal', weight: 500 },
        { name: 'DM Sans', data: dmSans, style: 'normal', weight: 500 },
      ],
    }
  );
}
