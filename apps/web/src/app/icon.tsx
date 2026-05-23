import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  const dmMono = await fetch(
    new URL('https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYthSQBK6POlIuxg.woff2')
  ).then((res) => res.arrayBuffer());

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
        fontSize: 26,
        fontWeight: 500,
        letterSpacing: -1,
        lineHeight: 1,
      }}
    >
      <span style={{ color: '#15201A' }}>s</span>
      <span style={{ color: '#0F766E' }}>.</span>
    </div>,
    {
      ...size,
      fonts: [{ name: 'DM Mono', data: dmMono, style: 'normal', weight: 500 }],
    }
  );
}
