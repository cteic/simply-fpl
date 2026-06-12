'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { t } from '@simplyfpl/i18n';
import { PageHeader, PageShell, Text } from '@simplyfpl/ui';

const HeadToHeadInner = dynamic(() => import('./head-to-head-inner'), {
  ssr: false,
  loading: () => (
    <PageShell>
      <PageHeader title="Head to Head" meta="Loading…" />
    </PageShell>
  ),
});

function parseId(value: string): number | null {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

interface H2hIds {
  yourEntryId: number;
  theirEntryId: number;
}

const H2H_PATH = /^\/h2h\/([^/]+)\/([^/]+)\/?$/;

function readIdsFromLocation(): H2hIds | null {
  if (typeof window === 'undefined') return null;
  const match = H2H_PATH.exec(window.location.pathname);
  if (!match) return null;
  const a = parseId(match[1] ?? '');
  const b = parseId(match[2] ?? '');
  if (a === null || b === null || a === b) return null;
  return { yourEntryId: a, theirEntryId: b };
}

export function HeadToHeadView() {
  const [ids, setIds] = useState<H2hIds | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setIds(readIdsFromLocation());
    setResolved(true);
  }, []);

  if (!resolved) {
    return (
      <PageShell>
        <PageHeader title="Head to Head" meta="Loading…" />
      </PageShell>
    );
  }

  if (ids === null) {
    return (
      <PageShell>
        <PageHeader title="Head to Head" meta="Invalid team IDs in URL" />
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {t('h2h.invalid_url')}
        </Text>
      </PageShell>
    );
  }

  return <HeadToHeadInner yourEntryId={ids.yourEntryId} theirEntryId={ids.theirEntryId} />;
}
