import {
  type CohortTier,
  type PartialAggregate,
  aggregateToPayload,
  payloadToPlayerStatRows,
} from './aggregate';

export interface FlushEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE?: string;
  FPL_CACHE: KVNamespace;
}

type RestHeaders = Record<string, string>;

function buildHeaders(env: FlushEnv, preferOnConflict?: string): RestHeaders | null {
  const key = env.SUPABASE_SERVICE_ROLE;
  if (!key) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: preferOnConflict ?? 'return=minimal',
  };
}

export async function flushToSupabase(
  env: FlushEnv,
  gw: number,
  tier: CohortTier,
  agg: PartialAggregate,
  isComplete: boolean
): Promise<{ ok: boolean; reason?: string }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
    return { ok: false, reason: 'supabase-credentials-missing' };
  }

  const payload = aggregateToPayload(agg);
  const rows = payloadToPlayerStatRows(payload, gw, tier);

  const snapshotHeaders = buildHeaders(env);
  if (!snapshotHeaders) return { ok: false, reason: 'supabase-credentials-missing' };
  const snapshotRes = await fetch(`${env.SUPABASE_URL}/rest/v1/cohort_snapshots`, {
    method: 'POST',
    headers: snapshotHeaders,
    body: JSON.stringify({
      gw,
      cohort_tier: tier,
      entries_sampled: payload.entries_sampled,
      is_complete: isComplete,
      payload,
    }),
  });
  if (!snapshotRes.ok) {
    return { ok: false, reason: `snapshot-insert-${snapshotRes.status}` };
  }

  if (rows.length > 0) {
    const upsertHeaders = buildHeaders(env, 'resolution=merge-duplicates,return=minimal');
    if (!upsertHeaders) return { ok: false, reason: 'supabase-credentials-missing' };
    const statsRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cohort_player_stats?on_conflict=gw,cohort_tier,player_id`,
      {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify(rows),
      }
    );
    if (!statsRes.ok) {
      return { ok: false, reason: `stats-upsert-${statsRes.status}` };
    }
  }

  await env.FPL_CACHE.put(`cohort:snapshot:${gw}:${tier}`, JSON.stringify(payload), {
    expirationTtl: 60 * 60 * 24,
  });

  return { ok: true };
}
