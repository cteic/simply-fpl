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

function AskFrankForm() {
  const { tier, client, user } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskFormResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        if (res.status >= 500) {
          setError('Frank is briefly unavailable; try again.');
        } else {
          setError(errBody.error ?? 'Something went wrong');
        }
        return;
      }
      const data = (await res.json()) as AskFormResponse;
      setAnswer(data);
      setQuestion('');
      void refetchQuota();
      void refetchHistory();
    } catch {
      setError('Frank is briefly unavailable; try again.');
    } finally {
      setIsLoading(false);
    }
  }

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
              disabled={isLoading}
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
            disabled={isLoading || !question.trim()}
            style={{
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: isLoading || !question.trim() ? '#A8A8A0' : '#0F766E',
              color: '#FFF',
              cursor: isLoading || !question.trim() ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            {isLoading ? 'Asking Frank…' : 'Ask Frank'}
          </button>
          {error ? (
            <Text fontFamily="$body" fontSize={12} color="$negative">
              {error}
            </Text>
          ) : null}
          {answer ? (
            <YStack
              backgroundColor="$brandBg"
              borderRadius={8}
              paddingHorizontal={14}
              paddingVertical={12}
              gap={8}
            >
              <XStack alignItems="center" gap={8}>
                <AiChip />
              </XStack>
              <Text fontFamily="$body" fontSize={12} color="$color" lineHeight={20}>
                {answer.advice}
              </Text>
              {answer.follow_up_question ? (
                <Text fontFamily="$body" fontSize={11} color="$colorSubtle" lineHeight={18}>
                  💡 {answer.follow_up_question}
                </Text>
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
