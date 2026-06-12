'use client';

import { useCallback, useState } from 'react';

import { Card, SectionHeader, SpeedMetricBar, Text, XStack, YStack } from '@simplyfpl/ui';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';
const RUNS_PER_TARGET = 5;

type WidgetState =
  | { status: 'idle' }
  | { status: 'running'; completed: number; total: number }
  | { status: 'done'; simplyfplMs: number; livefplMs: number }
  | { status: 'rate_limited'; retryAfterSeconds: number }
  | { status: 'error' };

interface FetchTimingResponse {
  durationMs: number;
}

interface RateLimitBody {
  error: string;
  retryAfterSeconds: number;
}

function isRateLimitBody(value: unknown): value is RateLimitBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).error === 'rate_limited' &&
    typeof (value as Record<string, unknown>).retryAfterSeconds === 'number'
  );
}

function isFetchTimingResponse(value: unknown): value is FetchTimingResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).durationMs === 'number'
  );
}

type SingleRunResult =
  | { ok: true; durationMs: number }
  | { ok: false; rateLimited: true; retryAfterSeconds: number }
  | { ok: false; rateLimited?: false };

async function runOnce(target: 'simplyfpl' | 'livefpl'): Promise<SingleRunResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/vs/timed-fetch?target=${target}`);
    if (res.status === 429) {
      const body: unknown = await res.json();
      return {
        ok: false,
        rateLimited: true,
        retryAfterSeconds: isRateLimitBody(body) ? body.retryAfterSeconds : 60,
      };
    }
    if (!res.ok) return { ok: false };
    const body: unknown = await res.json();
    if (!isFetchTimingResponse(body)) return { ok: false };
    return { ok: true, durationMs: body.durationMs };
  } catch {
    return { ok: false };
  }
}

async function runAverage(
  target: 'simplyfpl' | 'livefpl',
  runs: number,
  onProgress: () => void
): Promise<{ avgMs: number } | { rateLimited: true; retryAfterSeconds: number } | null> {
  const timings: number[] = [];
  for (let i = 0; i < runs; i++) {
    const result = await runOnce(target);
    onProgress();
    if (!result.ok) {
      if (result.rateLimited) {
        return { rateLimited: true, retryAfterSeconds: result.retryAfterSeconds };
      }
      return null;
    }
    timings.push(result.durationMs);
  }
  const avg = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
  return { avgMs: avg };
}

export function VsTimedFetchWidget() {
  const [state, setState] = useState<WidgetState>({ status: 'idle' });

  const runTest = useCallback(async () => {
    setState({ status: 'running', completed: 0, total: RUNS_PER_TARGET * 2 });

    let completed = 0;
    const onProgress = () => {
      completed += 1;
      setState({ status: 'running', completed, total: RUNS_PER_TARGET * 2 });
    };

    const [simplyfplResult, livefplResult] = await Promise.all([
      runAverage('simplyfpl', RUNS_PER_TARGET, onProgress),
      runAverage('livefpl', RUNS_PER_TARGET, onProgress),
    ]);

    if (!simplyfplResult || !livefplResult) {
      setState({ status: 'error' });
      return;
    }

    if ('rateLimited' in simplyfplResult) {
      setState({
        status: 'rate_limited',
        retryAfterSeconds: simplyfplResult.retryAfterSeconds,
      });
      return;
    }

    if ('rateLimited' in livefplResult) {
      setState({
        status: 'rate_limited',
        retryAfterSeconds: livefplResult.retryAfterSeconds,
      });
      return;
    }

    setState({
      status: 'done',
      simplyfplMs: simplyfplResult.avgMs,
      livefplMs: livefplResult.avgMs,
    });
  }, []);

  return (
    <YStack gap={12}>
      <SectionHeader title="Test it yourself" />
      <Card padding={20}>
        <YStack gap={16}>
          {state.status === 'idle' && (
            <YStack gap={12}>
              <Text fontFamily="$body" fontSize={13} lineHeight={20} color="$colorMuted">
                Run a live network timing test from your browser against both sites.
              </Text>
              <XStack>
                <Text
                  render="button"
                  role="button"
                  onPress={runTest}
                  fontFamily="$body"
                  fontSize={13}
                  fontWeight="600"
                  color="$surface"
                  backgroundColor="$brand"
                  paddingHorizontal={18}
                  paddingVertical={10}
                  borderRadius="$3"
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '$brandHover' }}
                  pressStyle={{ opacity: 0.85 }}
                >
                  Run live test →
                </Text>
              </XStack>
            </YStack>
          )}

          {state.status === 'running' && (
            <Text fontFamily="$mono" fontSize={12} color="$colorMuted">
              Running… {state.completed}/{state.total} requests complete
            </Text>
          )}

          {state.status === 'done' && (
            <YStack gap={16}>
              <SpeedMetricBar
                label="Network response time (5-run average from your location)"
                a={{
                  label: 'SimplyFPL',
                  value: state.simplyfplMs,
                  formattedValue: `${state.simplyfplMs}ms`,
                }}
                b={{
                  label: 'livefpl.net',
                  value: state.livefplMs,
                  formattedValue: `${state.livefplMs}ms`,
                }}
              />
              <XStack gap={16} alignItems="center" flexWrap="wrap">
                <Text
                  render="button"
                  role="button"
                  onPress={runTest}
                  fontFamily="$body"
                  fontSize={12}
                  color="$colorMuted"
                  cursor="pointer"
                  hoverStyle={{ color: '$color' }}
                >
                  Run again
                </Text>
                <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
                  Byte-timing only — measures network response, not page render.
                </Text>
              </XStack>
            </YStack>
          )}

          {state.status === 'rate_limited' && (
            <YStack gap={8}>
              <Text fontFamily="$body" fontSize={13} color="$colorMuted">
                Too many requests. Try again in {state.retryAfterSeconds}s.
              </Text>
              <Text
                render="button"
                role="button"
                onPress={() => setState({ status: 'idle' })}
                fontFamily="$body"
                fontSize={12}
                color="$colorSubtle"
                cursor="pointer"
                hoverStyle={{ color: '$color' }}
              >
                Reset
              </Text>
            </YStack>
          )}

          {state.status === 'error' && (
            <YStack gap={8}>
              <Text fontFamily="$body" fontSize={13} color="$negative">
                Could not reach the timing endpoint. Check your connection and try again.
              </Text>
              <Text
                render="button"
                role="button"
                onPress={() => setState({ status: 'idle' })}
                fontFamily="$body"
                fontSize={12}
                color="$colorSubtle"
                cursor="pointer"
                hoverStyle={{ color: '$color' }}
              >
                Try again
              </Text>
            </YStack>
          )}
        </YStack>
      </Card>
    </YStack>
  );
}
