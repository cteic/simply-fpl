import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export const dynamic = 'force-dynamic';

const FONT_URL = 'https://fonts.gstatic.com/s/dmmono/v16/aFTR7PB1QTsUX8KYvumzIYQ.ttf';
const FONT_TIMEOUT_MS = 3000;

const SUPPORTED_SIZES = new Set([192, 512]);

function fontSize(size: number): number {
  return Math.round(size * 0.68);
}

function letterSpacing(size: number): number {
  return Math.round(size * -0.016);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);

  if (!SUPPORTED_SIZES.has(size)) {
    return NextResponse.json({ error: 'unsupported size' }, { status: 404 });
  }

  const fontResult = await fetchWithTimeout(new URL(FONT_URL), FONT_TIMEOUT_MS);

  const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 500 }[] = [];
  if (fontResult.ok) {
    fonts.push({ name: 'DM Mono', data: fontResult.data, style: 'normal', weight: 500 });
  }

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
        fontSize: fontSize(size),
        fontWeight: 500,
        letterSpacing: letterSpacing(size),
        lineHeight: 1,
      }}
    >
      <span style={{ color: '#15201A' }}>s</span>
      <span style={{ color: '#0F766E' }}>.</span>
    </div>,
    {
      width: size,
      height: size,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
