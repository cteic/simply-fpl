'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { auth, frank } from '@simplyfpl/features';
import { t } from '@simplyfpl/i18n';
import {
  Card,
  FNote,
  PageHeader,
  PageShell,
  ProgressBar,
  SectionHeader,
  Skeleton,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { FEATURE_FRANK_ONDEMAND } from '@/lib/feature-flags';
import { SITE_URL } from '@/lib/site-url';
import { useFrankHistory, useFrankQuota, useFrankWeekly } from '@/queries/frank';

const { useAuth } = auth;
const { resolveFrankAccess } = frank;

const TIER_LABELS = { free: 'Free', pro: 'Pro', ultimate: 'Ultimate' } as const;

interface CandidateRowProps {
  name: string;
  team: string;
  reason: string;
  last: boolean;
}

function CandidateRow({ name, team, reason, last }: CandidateRowProps) {
  return (
    <YStack
      paddingHorizontal={16}
      paddingVertical={14}
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$border"
      borderStyle="solid"
    >
      <XStack alignItems="center" gap={8} marginBottom={4}>
        <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color">
          {name}
        </Text>
        <Text fontFamily="$mono" fontSize={10} color="$colorSubtle">
          {team}
        </Text>
      </XStack>
      <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={18}>
        {reason}
      </Text>
    </YStack>
  );
}

function AiChip() {
  return (
    <XStack
      backgroundColor="$brandBg"
      borderWidth={1}
      borderStyle="solid"
      borderColor="$brand"
      borderRadius={4}
      paddingHorizontal={6}
      paddingVertical={2}
      alignItems="center"
    >
      <Text fontFamily="$body" fontSize={9} fontWeight="700" color="$brand" letterSpacing={0.8}>
        AI-POWERED
      </Text>
    </XStack>
  );
}

interface AskFormResponse {
  advice: string;
  follow_up_question?: string | null;
  used?: number;
  softCap?: number;
  hardCap?: number;
}

function buildFrankShareUrl(advice: string): string {
  const verdict = advice.slice(0, 160);
  return `${SITE_URL}/og/frank?verdict=${encodeURIComponent(verdict)}`;
}

interface FollowUpChipProps {
  question: string;
  onSelect: (q: string) => void;
}

function FollowUpChip({ question, onSelect }: FollowUpChipProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(question)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-body, sans-serif)',
        fontSize: 12,
        color: 'var(--brand, #0F766E)',
        background: 'var(--brandBg, #F0FAF9)',
        border: '1px solid var(--brand, #0F766E)',
        borderRadius: 20,
        padding: '6px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        lineHeight: 1.4,
      }}
    >
      <span style={{ opacity: 0.7 }}>💡</span> {question}
    </button>
  );
}

function ShareButton({ advice }: { advice: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildFrankShareUrl(advice));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-body, sans-serif)',
        fontSize: 11,
        fontWeight: 600,
        color: copied ? 'var(--positive, #166534)' : 'var(--colorSubtle, #767672)',
        background: 'none',
        border: '1px solid var(--border, #E9E8E4)',
        borderRadius: 6,
        padding: '4px 10px',
        cursor: 'pointer',
      }}
    >
      {copied ? '✓ Copied' : '↗ Share'}
    </button>
  );
}

function parseSseBuffer(buffer: string): {
  events: Array<{ event: string; data: string }>;
  remaining: string;
} {
  const events: Array<{ event: string; data: string }> = [];
  let idx: number;
  let rest = buffer;

  while ((idx = rest.indexOf('\n\n')) !== -1) {
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);

    let eventName = '';
    let dataStr = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) eventName = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataStr = line.slice(6);
    }
    if (eventName && dataStr) events.push({ event: eventName, data: dataStr });
  }

  return { events, remaining: rest };
}

function AskFrankForm() {
  const { tier, client, user } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskFormResponse | null>(null);
  const [streamingAdvice, setStreamingAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const userId = user?.id ?? null;
  const { data: quota, refetch: refetchQuota } = useFrankQuota(client, userId);
  const { data: history, refetch: refetchHistory } = useFrankHistory(client, userId);

  const access = resolveFrankAccess(tier);

  if (!access.canAskOnDemand) {
    const upgradeLabel = TIER_LABELS[access.upgradeTo ?? 'ultimate'];
    return (
      <Card paddingHorizontal={16} paddingVertical={20} alignItems="center" marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color" marginBottom={6}>
          Ask Frank anything
        </Text>
        <Text
          fontFamily="$body"
          fontSize={12}
          color="$colorMuted"
          textAlign="center"
          marginBottom={10}
        >
          On-demand questions are an {upgradeLabel} feature. Your weekly advice above is included on
          every plan.
        </Text>
        <Text
          fontFamily="$body"
          fontSize={12}
          color="$brand"
          textDecorationLine="underline"
          cursor="pointer"
          onPress={() => router.push('/upgrade')}
        >
          Upgrade to {upgradeLabel} for on-demand AI queries
        </Text>
      </Card>
    );
  }

  const quotaUsed = answer?.used ?? quota?.used ?? 0;
  const softCap = answer?.softCap ?? quota?.softCap ?? 50;
  const hardCap = answer?.hardCap ?? quota?.hardCap ?? 80;
  const quotaPercent = hardCap > 0 ? Math.round((quotaUsed / hardCap) * 100) : 0;
  const atSoftCap = quotaUsed >= softCap;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setIsLoading(true);
    setIsStreaming(false);
    setStreamingAdvice(null);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch('/api/frank/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (res.status === 429) {
        setError("You've hit your monthly quota — resets on the 1st.");
        return;
      }
      if (!res.ok && !res.headers.get('content-type')?.includes('text/event-stream')) {
        const errBody = (await res.json()) as { error?: string };
        if (res.status >= 500) {
          setError('Frank is briefly unavailable; try again.');
        } else {
          setError(errBody.error ?? 'Something went wrong');
        }
        return;
      }

      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const data = (await res.json()) as AskFormResponse;
        setAnswer(data);
        setQuestion('');
        void refetchQuota();
        void refetchHistory();
        return;
      }

      if (!res.body) {
        setError('Frank is briefly unavailable; try again.');
        return;
      }

      setIsLoading(false);
      setIsStreaming(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSseBuffer(buffer);
        buffer = remaining;

        for (const { event, data } of events) {
          try {
            const payload = JSON.parse(data) as unknown;
            if (event === 'token') {
              const { text } = payload as { text: string };
              accumulated += text;
              setStreamingAdvice(accumulated);
            } else if (event === 'done') {
              setAnswer(payload as AskFormResponse);
              setStreamingAdvice(null);
              setIsStreaming(false);
              setQuestion('');
              void refetchQuota();
              void refetchHistory();
            } else if (event === 'error') {
              const { error: msg } = payload as { error: string };
              setError(msg ?? 'Frank is briefly unavailable; try again.');
              setStreamingAdvice(null);
              setIsStreaming(false);
            }
          } catch {
            // ignore malformed event
          }
        }
      }

      setIsStreaming(false);
    } catch {
      setError('Frank is briefly unavailable; try again.');
      setStreamingAdvice(null);
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  }

  const showingAdvice = answer !== null || streamingAdvice !== null;
  const displayAdvice = streamingAdvice ?? answer?.advice ?? '';

  return (
    <Card marginBottom={20}>
      <YStack paddingHorizontal={16} paddingTop={16} paddingBottom={4}>
        <SectionHeader title={t('frank.ask_section_title')} />
      </YStack>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <YStack paddingHorizontal={16} paddingBottom={16} gap={10}>
          {isLoading ? (
            <YStack gap={8}>
              <Skeleton height={12} width="80%" />
              <Skeleton height={12} width="60%" />
              <Skeleton height={12} width="70%" />
            </YStack>
          ) : null}
          {!isLoading ? (
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('frank.ask_placeholder')}
              rows={3}
              disabled={isLoading || isStreaming}
              style={{
                fontFamily: 'var(--font-body, sans-serif)',
                fontSize: 13,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border, #E9E8E4)',
                background: 'var(--surface, #FFF)',
                color: 'var(--color, #1A1A18)',
                resize: 'vertical',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          ) : null}
          <button
            type="submit"
            disabled={isLoading || isStreaming || !question.trim()}
            style={{
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: isLoading || isStreaming || !question.trim() ? '#A8A8A0' : '#0F766E',
              color: '#FFF',
              cursor: isLoading || isStreaming || !question.trim() ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            {isLoading && 'Asking Frank…'}
            {!isLoading && isStreaming && 'Frank is thinking…'}
            {!isLoading && !isStreaming && 'Ask Frank'}
          </button>
          {error ? (
            <Text fontFamily="$body" fontSize={12} color="$negative">
              {error}
            </Text>
          ) : null}
          {showingAdvice ? (
            <YStack
              backgroundColor="$brandBg"
              borderRadius={8}
              paddingHorizontal={14}
              paddingVertical={12}
              gap={8}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <AiChip />
                {answer && !isStreaming ? <ShareButton advice={answer.advice} /> : null}
              </XStack>
              <Text fontFamily="$body" fontSize={12} color="$color" lineHeight={20}>
                {displayAdvice}
                {isStreaming ? (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 14,
                      background: 'var(--color, #1A1A18)',
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      animation: 'frank-cursor-blink 1s step-end infinite',
                    }}
                  />
                ) : null}
              </Text>
              {answer?.follow_up_question && !isStreaming ? (
                <FollowUpChip
                  question={answer.follow_up_question}
                  onSelect={(q) => setQuestion(q)}
                />
              ) : null}
            </YStack>
          ) : null}
          {atSoftCap && !error ? (
            <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
              You've used {quotaUsed} of {hardCap} questions this month.
            </Text>
          ) : null}
          <ProgressBar
            percent={quotaPercent}
            labels={[`${quotaUsed} / ${hardCap} questions used this month`]}
          />
        </YStack>
      </form>

      {history && history.length > 0 ? (
        <YStack
          borderTopWidth={1}
          borderTopColor="$border"
          borderStyle="solid"
          paddingHorizontal={16}
          paddingVertical={12}
        >
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            style={{
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--colorSubtle, #767672)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            {historyOpen ? '▾' : '▸'} Past questions ({history.length})
          </button>
          {historyOpen ? (
            <YStack gap={12} marginTop={12}>
              {history.map((q) => {
                const resp = q.response as { advice?: string } | null;
                return (
                  <YStack key={q.id} gap={4}>
                    <Text fontFamily="$body" fontSize={12} fontWeight="600" color="$color">
                      {q.question}
                    </Text>
                    {resp?.advice ? (
                      <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={18}>
                        {resp.advice}
                      </Text>
                    ) : null}
                    <Text fontFamily="$mono" fontSize={10} color="$colorSubtle">
                      {new Date(q.created_at).toLocaleDateString()}
                    </Text>
                  </YStack>
                );
              })}
            </YStack>
          ) : null}
        </YStack>
      ) : null}
    </Card>
  );
}

export function FrankView() {
  const { data, isLoading, isError } = useFrankWeekly();

  const title = (
    <XStack alignItems="center" gap={10}>
      <Text fontFamily="$body" fontSize={21} fontWeight="600" color="#FFFFFF">
        Frank
      </Text>
      <AiChip />
    </XStack>
  );

  return (
    <PageShell>
      <style>{`
        @keyframes frank-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <PageHeader tone="stadium" title={title} meta={t('frank.page_meta')} />

      {isLoading ? (
        <Card paddingHorizontal={16} paddingVertical={28} alignItems="center" marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            Loading Frank's advice…
          </Text>
        </Card>
      ) : null}

      {!isLoading && isError ? (
        <Card paddingHorizontal={16} paddingVertical={28} alignItems="center" marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            Frank's advice isn't ready yet. Check back after the next deadline.
          </Text>
        </Card>
      ) : null}

      {!isLoading && data ? (
        <>
          {data.chipNote ? (
            <>
              <SectionHeader title={t('frank.chip_watch_title')} />
              <Card marginBottom={20}>
                <YStack paddingHorizontal={16} paddingVertical={14}>
                  <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={18}>
                    {data.chipNote}
                  </Text>
                </YStack>
              </Card>
            </>
          ) : null}

          <SectionHeader title={`Captain picks · GW${data.gameweek}`} />
          <Card marginBottom={20}>
            {data.captainCandidates.map((c, i) => (
              <CandidateRow
                key={`cap-${c.name}`}
                name={c.name}
                team={c.team}
                reason={c.reason}
                last={i === data.captainCandidates.length - 1}
              />
            ))}
          </Card>

          <SectionHeader title={t('frank.transfer_targets_title')} />
          <Card marginBottom={20}>
            {data.transferTargets.map((c, i) => (
              <CandidateRow
                key={`xfer-${c.name}`}
                name={c.name}
                team={c.team}
                reason={c.reason}
                last={i === data.transferTargets.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      {FEATURE_FRANK_ONDEMAND ? <AskFrankForm /> : null}

      <FNote>
        Frank is an AI coach powered by Claude. Advice is generated weekly and may not reflect
        late-breaking news. Always verify player availability before finalising your team.
      </FNote>
    </PageShell>
  );
}
