import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SimplyFPL vs livefpl.net — weekly speed comparison';

export default async function VsLivefplOgImage() {
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
      fonts: [
        { name: 'DM Mono', data: dmMono, style: 'normal', weight: 500 },
        { name: 'DM Sans', data: dmSans, style: 'normal', weight: 700 },
      ],
    }
  );
}
