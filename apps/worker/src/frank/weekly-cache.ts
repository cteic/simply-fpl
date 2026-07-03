import Anthropic from '@anthropic-ai/sdk';

import type { FplBootstrapStatic, FrankWeeklyPayload } from '@simplyfpl/types';

export interface FrankEnv {
  FPL_CACHE: KVNamespace;
  FRANK_WEEKLY_CACHE: KVNamespace;
  FPL_BASE_URL: string;
  ANTHROPIC_API_KEY?: string;
}

export const FRANK_WEEKLY_CACHE_KEY = 'frank:weekly';
export const FRANK_WEEKLY_CRON = '0 6 * * 2';
// TTL exceeds the weekly cron interval so a missed run or a double/blank
// gameweek can't open a gap: the previous week's advice stays served across the
// boundary until the next run overwrites it.
const FRANK_WEEKLY_TTL_SECONDS = 10 * 24 * 60 * 60;
const FRANK_MODEL = 'claude-haiku-4-5-20251001';

// Gameweek-scoped key so each week's advice is addressable independently; the
// stable FRANK_WEEKLY_CACHE_KEY is the "latest" pointer the reader serves.
export function frankWeeklyCacheKey(gameweek: number): string {
  return `${FRANK_WEEKLY_CACHE_KEY}:gw${gameweek}`;
}

const BOOTSTRAP_CACHE_KEY = 'fpl:/bootstrap-static/';

function buildContextBlock(bootstrap: FplBootstrapStatic): string {
  const currentGw =
    bootstrap.events.find((e) => e.is_current) ?? bootstrap.events.find((e) => e.is_next);
  const gwId = currentGw?.id ?? 0;

  const topPlayers = bootstrap.elements
    .filter((p) => p.chance_of_playing_next_round !== 0)
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 60)
    .map((p) => {
      const team = bootstrap.teams.find((t) => t.id === p.team);
      return {
        id: p.id,
        name: p.web_name,
        team: team?.short_name ?? '',
        position: p.element_type,
        cost: p.now_cost / 10,
        total_points: p.total_points,
        selected_by: p.selected_by_percent,
        transfers_in: p.transfers_in_event,
        transfers_out: p.transfers_out_event,
        news: p.news || null,
      };
    });

  return JSON.stringify({ gameweek: gwId, top_players: topPlayers }, null, 0);
}

function buildPrompt(gwId: number): string {
  return (
    `You are Frank, an AI FPL (Fantasy Premier League) coach. ` +
    `It is Gameweek ${gwId}. Based on the FPL data above, provide concise weekly advice.\n\n` +
    `Return ONLY valid JSON matching this exact schema (no markdown, no prose outside JSON):\n` +
    `{\n` +
    `  "gameweek": ${gwId},\n` +
    `  "captainCandidates": [{"name":"...","team":"...","reason":"..."}],\n` +
    `  "transferTargets": [{"name":"...","team":"...","reason":"..."}],\n` +
    `  "chipNote": "..." | null\n` +
    `}\n\n` +
    `Rules:\n` +
    `- captainCandidates: 2-3 players with best home fixture or form. One sentence per reason.\n` +
    `- transferTargets: 2-3 budget-friendly targets with good upcoming fixtures. One sentence per reason.\n` +
    `- chipNote: one sentence if a chip (TC, FH, BB, WC) looks well-timed this week; null otherwise.\n` +
    `- Be specific: name opponents, mention form, price, ownership where relevant.\n` +
    `- Do not include injured or suspended players.`
  );
}

async function fetchBootstrap(env: FrankEnv): Promise<FplBootstrapStatic | null> {
  const cached = await env.FPL_CACHE.get(BOOTSTRAP_CACHE_KEY, 'text');
  if (cached) {
    try {
      return JSON.parse(cached) as FplBootstrapStatic;
    } catch {
      // fall through to live fetch
    }
  }

  const res = await fetch(`${env.FPL_BASE_URL}/bootstrap-static/`, {
    headers: { 'User-Agent': 'SimplyFPL/1.0', Accept: 'application/json' },
  });
  if (!res.ok) return null;

  try {
    const text = await res.text();
    return JSON.parse(text) as FplBootstrapStatic;
  } catch {
    return null;
  }
}

export async function runFrankWeekly(env: FrankEnv): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) return;

  const bootstrap = await fetchBootstrap(env);
  if (!bootstrap) return;

  const currentGw =
    bootstrap.events.find((e) => e.is_current) ?? bootstrap.events.find((e) => e.is_next);
  const gwId = currentGw?.id ?? 0;

  const contextJson = buildContextBlock(bootstrap);
  const prompt = buildPrompt(gwId);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: FRANK_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: contextJson,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return;
  }

  const payload: FrankWeeklyPayload = {
    gameweek: gwId,
    generatedAt: new Date().toISOString(),
    captainCandidates: (parsed as FrankWeeklyPayload).captainCandidates ?? [],
    transferTargets: (parsed as FrankWeeklyPayload).transferTargets ?? [],
    chipNote: (parsed as FrankWeeklyPayload).chipNote ?? null,
  };

  const serialized = JSON.stringify(payload);
  const putOptions = { expirationTtl: FRANK_WEEKLY_TTL_SECONDS };

  await env.FRANK_WEEKLY_CACHE.put(frankWeeklyCacheKey(gwId), serialized, putOptions);
  await env.FRANK_WEEKLY_CACHE.put(FRANK_WEEKLY_CACHE_KEY, serialized, putOptions);
}

export async function handleFrankWeekly(env: FrankEnv): Promise<Response> {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const cached = await env.FRANK_WEEKLY_CACHE.get(FRANK_WEEKLY_CACHE_KEY, 'text');
  if (cached) {
    return new Response(cached, {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  return new Response(JSON.stringify({ error: 'Frank advice not yet generated for this week' }), {
    status: 404,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
}
