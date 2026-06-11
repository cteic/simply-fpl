import { notFound } from 'next/navigation';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const FRANK_ADMIN_EMAILS = (process.env['FRANK_ADMIN_EMAILS'] ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

interface MonthlyRow {
  user_id: string;
  query_count: number;
  tokens_in_total: number;
  tokens_out_total: number;
}

async function getMonthlyStats(): Promise<MonthlyRow[]> {
  const admin = getSupabaseAdminClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data } = await admin
    .from('frank_queries')
    .select('user_id, tokens_in, tokens_out')
    .gte('created_at', startOfMonth.toISOString());

  if (!data) return [];

  const byUser = new Map<string, MonthlyRow>();
  for (const row of data) {
    const existing = byUser.get(row.user_id) ?? {
      user_id: row.user_id,
      query_count: 0,
      tokens_in_total: 0,
      tokens_out_total: 0,
    };
    existing.query_count += 1;
    existing.tokens_in_total += row.tokens_in ?? 0;
    existing.tokens_out_total += row.tokens_out ?? 0;
    byUser.set(row.user_id, existing);
  }

  return [...byUser.values()].sort((a, b) => b.query_count - a.query_count);
}

export default async function AdminFrankPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !FRANK_ADMIN_EMAILS.includes(user.email)) {
    notFound();
  }

  const stats = await getMonthlyStats();

  const totalQueries = stats.reduce((s, r) => s + r.query_count, 0);
  const totalTokensIn = stats.reduce((s, r) => s + r.tokens_in_total, 0);
  const totalTokensOut = stats.reduce((s, r) => s + r.tokens_out_total, 0);

  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 16px',
        fontFamily: 'var(--font-body, sans-serif)',
        fontSize: 13,
        color: 'var(--color, #1A1A18)',
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Frank admin</h1>
      <p style={{ fontSize: 12, color: 'var(--colorSubtle, #767672)', marginBottom: 24 }}>
        {monthLabel} · {stats.length} users · {totalQueries} queries
      </p>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border, #E9E8E4)', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', fontWeight: 600 }}>User ID</th>
            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Queries</th>
            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Tokens in</th>
            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Tokens out</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row) => (
            <tr key={row.user_id} style={{ borderBottom: '1px solid var(--border, #E9E8E4)' }}>
              <td
                style={{
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 11,
                  color: 'var(--colorSubtle, #767672)',
                }}
              >
                {row.user_id}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.query_count}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                {row.tokens_in_total.toLocaleString()}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                {row.tokens_out_total.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border, #E9E8E4)', fontWeight: 600 }}>
            <td style={{ padding: '6px 8px' }}>Total</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{totalQueries}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
              {totalTokensIn.toLocaleString()}
            </td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
              {totalTokensOut.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </main>
  );
}
