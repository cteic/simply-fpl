import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

import { OG_SIZE } from './og-config';

export const runtime = 'edge';

const SIZE = OG_SIZE;

const COLORS = {
  bg: '#F6F7F4',
  surface: '#FFFFFF',
  border: '#E2E4DC',
  ink: '#15201A',
  mute: '#566055',
  accent: '#0F766E',
};

const DM_MONO_URL = 'https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYthSQBK6POlIuxg.woff2';
const DM_SANS_URL =
  'https://fonts.gstatic.com/s/dmsans/v14/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop0.woff2';
// TODO: bundle DM Mono + DM Sans as local woff2 assets to eliminate this runtime network dep
const FONT_TIMEOUT_MS = 3000;

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const team = clip((params.get('team') ?? '').trim(), 40);
  const rank = clip((params.get('rank') ?? '').trim(), 16);
  const gw = clip((params.get('gw') ?? '').trim(), 8);
  const tagline = team
    ? 'Live FPL rank · simplyfpl.com'
    : 'Fastest live-rank companion for Fantasy Premier League';

  const [dmMonoResult, dmSansResult] = await Promise.all([
    fetchWithTimeout(new URL(DM_MONO_URL), FONT_TIMEOUT_MS),
    fetchWithTimeout(new URL(DM_SANS_URL), FONT_TIMEOUT_MS),
  ]);

  const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 500 | 700 }[] = [];
  if (dmMonoResult.ok)
    fonts.push({ name: 'DM Mono', data: dmMonoResult.data, style: 'normal', weight: 500 });
  if (dmSansResult.ok) {
    fonts.push({ name: 'DM Sans', data: dmSansResult.data, style: 'normal', weight: 500 });
    fonts.push({ name: 'DM Sans', data: dmSansResult.data, style: 'normal', weight: 700 });
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        padding: '80px 96px',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontFamily: 'DM Mono',
          fontSize: 88,
          fontWeight: 500,
          letterSpacing: -2,
          lineHeight: 1,
        }}
      >
        <span style={{ color: COLORS.ink }}>simplyfpl</span>
        <span style={{ color: COLORS.accent }}>.</span>
        <span style={{ color: COLORS.ink }}>com</span>
      </div>

      {team ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'DM Sans',
              fontSize: 24,
              fontWeight: 500,
              color: COLORS.mute,
              textTransform: 'uppercase',
              letterSpacing: 3,
            }}
          >
            {gw ? `Gameweek ${gw}` : 'Live rank'}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'DM Sans',
              fontSize: 88,
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {team}
          </div>
          {rank ? (
            <div
              style={{
                display: 'flex',
                fontFamily: 'DM Mono',
                fontSize: 56,
                fontWeight: 500,
                color: COLORS.accent,
                lineHeight: 1,
                letterSpacing: -1,
              }}
            >
              {rank}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            fontFamily: 'DM Sans',
            fontSize: 56,
            fontWeight: 500,
            color: COLORS.ink,
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 900,
          }}
        >
          Fastest live-rank companion for Fantasy Premier League
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${COLORS.border}`,
          paddingTop: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'DM Sans',
            fontSize: 22,
            fontWeight: 500,
            color: COLORS.mute,
            letterSpacing: -0.2,
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'DM Mono',
            fontSize: 22,
            fontWeight: 500,
            color: COLORS.mute,
            letterSpacing: -0.4,
          }}
        >
          simplyfpl.com
        </div>
      </div>
    </div>,
    {
      ...SIZE,
      headers: { 'Cache-Control': 'public, max-age=600, s-maxage=3600' },
      fonts,
    }
  );
}
