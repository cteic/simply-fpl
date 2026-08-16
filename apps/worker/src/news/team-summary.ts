import Anthropic from '@anthropic-ai/sdk';

import type { TeamNewsGroup } from '@simplyfpl/types';

export interface TeamSummaryEnv {
  FPL_CACHE: KVNamespace;
  ANTHROPIC_API_KEY?: string;
}

const SUMMARY_MODEL = 'claude-haiku-4-5-20251001';
const SUMMARY_TTL_SECONDS = 48 * 60 * 60;
const MIN_PLAYERS_FOR_SUMMARY = 3;
const DAILY_SPEND_CAP = 20;

export const SUMMARY_SPEND_KEY = 'news:summary-spend:daily';

export function summaryKey(teamId: number, fingerprint: string): string {
  return `news:team-summary:${teamId}:${fingerprint}`;
}

export function teamFingerprint(group: TeamNewsGroup): string {
  return group.players
    .map((p) => p.id)
    .sort((a, b) => a - b)
    .join(',');
}

async function checkAndIncrementDailySpend(cache: KVNamespace): Promise<boolean> {
  const raw = await cache.get(SUMMARY_SPEND_KEY, 'text');
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= DAILY_SPEND_CAP) return false;
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const ttl = Math.max(Math.ceil((tomorrow.getTime() - Date.now()) / 1000), 60);
  await cache
    .put(SUMMARY_SPEND_KEY, String(count + 1), { expirationTtl: ttl })
    .catch(() => undefined);
  return true;
}

function buildSummaryPrompt(group: TeamNewsGroup): string {
  const playerList = group.players
    .map((p) => `- ${p.web_name}: ${p.news || 'no details'}`)
    .join('\n');
  return (
    `Write a 2-sentence injury and availability summary for ${group.team_name}. ` +
    `Only reference the players listed below. Do not invent any facts.\n\n` +
    `Players:\n${playerList}`
  );
}

async function generateSummaryForTeam(
  env: TeamSummaryEnv,
  group: TeamNewsGroup
): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY) return null;

  const fingerprint = teamFingerprint(group);
  const key = summaryKey(group.team_id, fingerprint);

  const cached = await env.FPL_CACHE.get(key, 'text');
  if (cached !== null) return cached;

  const allowed = await checkAndIncrementDailySpend(env.FPL_CACHE);
  if (!allowed) return null;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 256,
      messages: [{ role: 'user', content: buildSummaryPrompt(group) }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    if (!text) return null;

    await env.FPL_CACHE.put(key, text, { expirationTtl: SUMMARY_TTL_SECONDS }).catch(
      () => undefined
    );
    return text;
  } catch {
    return null;
  }
}

export async function generateTeamSummaries(
  env: TeamSummaryEnv,
  groups: TeamNewsGroup[]
): Promise<void> {
  for (const group of groups) {
    if (group.players.length < MIN_PLAYERS_FOR_SUMMARY) continue;
    const summary = await generateSummaryForTeam(env, group);
    group.summary = summary ?? null;
  }
}
