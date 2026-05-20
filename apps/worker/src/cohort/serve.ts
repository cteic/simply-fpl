import type { CohortTier } from './aggregate';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

const TIERS: CohortTier[] = ['top_10k', 'top_100k', 'overall', 'legendary'];

export interface CohortServeEnv {
  FPL_CACHE: KVNamespace;
}

function snapshotKey(gw: number, tier: CohortTier): string {
  return `cohort:snapshot:${gw}:${tier}`;
}

async function readTiers(env: CohortServeEnv, gw: number): Promise<Record<string, unknown>> {
  const tiers: Record<string, unknown> = {};
  for (const tier of TIERS) {
    const raw = await env.FPL_CACHE.get(snapshotKey(gw, tier), 'text');
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        tiers[tier] = parsed;
      }
    } catch {
      continue;
    }
  }
  return tiers;
}

export async function handleCohortAggregates(
  env: CohortServeEnv,
  gw: number,
  method: string
): Promise<Response> {
  const tiers = await readTiers(env, gw);
  const hasAny = Object.keys(tiers).length > 0;

  if (!hasAny) {
    return new Response(
      method === 'HEAD' ? null : JSON.stringify({ error: 'no cohort data yet' }),
      {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  if (method === 'HEAD') {
    return new Response(null, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_CONTROL,
      },
    });
  }

  return new Response(JSON.stringify({ gw, tiers }), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL,
    },
  });
}
