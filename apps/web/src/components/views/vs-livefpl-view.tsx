'use client';

import { useState } from 'react';

import type { ComparisonSiteEntry, ComparisonSnapshot } from '@simplyfpl/types';
import {
  Card,
  PageHeader,
  PageShell,
  SectionHeader,
  SpeedMetricBar,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { VsTimedFetchWidget } from './vs-timed-fetch-widget';

const WORKER_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWeek(isoWeek: string): string {
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!match || !match[1] || !match[2]) return isoWeek;
  return `${isoWeek} (Monday morning, automated)`;
}

interface ScreenshotPairProps {
  week: string;
  sites: ComparisonSiteEntry[];
}

function ScreenshotPair({ week, sites }: ScreenshotPairProps) {
  const [hiddenSlugs, setHiddenSlugs] = useState<Set<string>>(new Set());

  const visible = sites.filter((s) => !hiddenSlugs.has(s.slug));
  if (visible.length === 0) return null;

  return (
    <YStack gap={12}>
      <SectionHeader title="Screenshots" />
      <XStack gap={16} flexWrap="wrap">
        {visible.map((site) => (
          <YStack key={site.slug} flexGrow={1} flexBasis={280} gap={8}>
            <Text fontFamily="$body" fontSize={12} fontWeight="600" color="$colorMuted">
              {site.label}
            </Text>
            <YStack
              borderRadius="$6"
              overflow="hidden"
              borderWidth={1}
              borderStyle="solid"
              borderColor="$border"
            >
              <img
                src={`${WORKER_URL}/vs/screenshot/${week}/${site.slug}`}
                alt={`${site.label} screenshot`}
                style={{ width: '100%', display: 'block' }}
                onError={() =>
                  setHiddenSlugs((prev) => {
                    const next = new Set(prev);
                    next.add(site.slug);
                    return next;
                  })
                }
              />
            </YStack>
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}

interface MetricCardsProps {
  a: ComparisonSiteEntry;
  b: ComparisonSiteEntry;
}

function MetricCards({ a, b }: MetricCardsProps) {
  const aTime = a.timeToFirstData ?? 0;
  const bTime = b.timeToFirstData ?? 0;

  return (
    <XStack gap={16} flexWrap="wrap">
      <Card flexGrow={1} flexBasis={240} padding={20}>
        <SpeedMetricBar
          label="Time to first data"
          a={{ label: a.label, value: aTime, formattedValue: formatMs(a.timeToFirstData) }}
          b={{ label: b.label, value: bTime, formattedValue: formatMs(b.timeToFirstData) }}
        />
      </Card>
      <Card flexGrow={1} flexBasis={240} padding={20}>
        <SpeedMetricBar
          label="Page weight (first load)"
          a={{ label: a.label, value: a.totalBytes, formattedValue: formatBytes(a.totalBytes) }}
          b={{ label: b.label, value: b.totalBytes, formattedValue: formatBytes(b.totalBytes) }}
        />
      </Card>
      <Card flexGrow={1} flexBasis={240} padding={20}>
        <SpeedMetricBar
          label="Third-party requests"
          a={{
            label: a.label,
            value: a.thirdPartyCount,
            formattedValue: String(a.thirdPartyCount),
          }}
          b={{
            label: b.label,
            value: b.thirdPartyCount,
            formattedValue: String(b.thirdPartyCount),
          }}
        />
      </Card>
    </XStack>
  );
}

function EmptyState() {
  return (
    <Card padding={32} alignItems="center">
      <Text fontFamily="$body" fontSize={13} color="$colorMuted" textAlign="center">
        Measurement runs weekly. Check back after the next Monday at 06:00 UTC.
      </Text>
    </Card>
  );
}

export interface VsLivefplViewProps {
  snapshot: ComparisonSnapshot | null;
  isFallback?: boolean;
}

export function VsLivefplView({ snapshot, isFallback = false }: VsLivefplViewProps) {
  const simplyfpl = snapshot?.sites.find((s) => s.slug === 'simplyfpl');
  const livefpl = snapshot?.sites.find((s) => s.slug === 'livefpl');

  const metaText = snapshot
    ? `Last measured: ${formatWeek(snapshot.week)}${isFallback ? ' — hand-curated data (automated measurement unavailable)' : ''}`
    : 'No measurement data yet';

  return (
    <PageShell>
      <PageHeader title="SimplyFPL vs livefpl.net" meta={metaText} />

      {snapshot !== null && simplyfpl !== undefined && livefpl !== undefined ? (
        <YStack gap={32}>
          <MetricCards a={simplyfpl} b={livefpl} />
          <ScreenshotPair week={snapshot.week} sites={snapshot.sites} />
          <VsTimedFetchWidget />
          <YStack gap={12}>
            <SectionHeader title="Methodology" />
            <Card padding={20}>
              <YStack gap={10}>
                <Text fontFamily="$body" fontSize={13} lineHeight={20} color="$colorMuted">
                  Measured weekly via headless Chrome (Cloudflare Browser Rendering). Both sites are
                  loaded from the same Cloudflare edge location at 06:00 UTC every Monday.
                </Text>
                <Text fontFamily="$body" fontSize={13} lineHeight={20} color="$colorMuted">
                  <Text fontFamily="$body" fontWeight="600" color="$color">
                    Time to first data:
                  </Text>{' '}
                  time from navigation start until the live-points element contains non-empty text.
                </Text>
                <Text fontFamily="$body" fontSize={13} lineHeight={20} color="$colorMuted">
                  <Text fontFamily="$body" fontWeight="600" color="$color">
                    Page weight:
                  </Text>{' '}
                  sum of all network transfer sizes within 10 seconds of navigation start.
                </Text>
                <Text fontFamily="$body" fontSize={13} lineHeight={20} color="$colorMuted">
                  <Text fontFamily="$body" fontWeight="600" color="$color">
                    Third-party requests:
                  </Text>{' '}
                  count of distinct hostnames loaded that are not the page&apos;s own origin.
                </Text>
                <Text fontFamily="$body" fontSize={12} lineHeight={18} color="$colorSubtle">
                  livefpl.net has been the community standard for years. These numbers are published
                  to inform — not to disparage. We will keep this page current even when our own
                  numbers worsen.
                </Text>
              </YStack>
            </Card>
          </YStack>
        </YStack>
      ) : (
        <EmptyState />
      )}
    </PageShell>
  );
}
