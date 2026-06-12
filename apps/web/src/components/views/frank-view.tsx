'use client';

import { useState } from 'react';

import { auth } from '@simplyfpl/features';
import { t } from '@simplyfpl/i18n';
import {
  Card,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { FEATURE_FRANK_ONDEMAND } from '@/lib/feature-flags';
import { useFrankWeekly } from '@/queries/frank';

const { useAuth } = auth;

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

function AskFrankForm() {
  const { tier } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (tier !== 'ultimate') {
    return (
      <Card paddingHorizontal={16} paddingVertical={20} alignItems="center" marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color" marginBottom={6}>
          {t('frank.ask_title')}
        </Text>
        <Text fontFamily="$body" fontSize={12} color="$colorMuted" textAlign="center">
          {t('frank.ask_upgrade_body')}
        </Text>
      </Card>
    );
  }

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
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? t('frank.ask_error_generic'));
        return;
      }
      const data = (await res.json()) as { answer: string };
      setAnswer(data.answer);
      setQuestion('');
    } catch {
      setError(t('frank.ask_error_network'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card marginBottom={20}>
      <YStack paddingHorizontal={16} paddingTop={16} paddingBottom={4}>
        <SectionHeader title="Ask Frank" />
      </YStack>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <YStack paddingHorizontal={16} paddingBottom={16} gap={10}>
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
            {isLoading ? t('frank.ask_loading') : t('frank.ask_submit')}
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
            >
              <Text fontFamily="$body" fontSize={12} color="$color" lineHeight={20}>
                {answer}
              </Text>
            </YStack>
          ) : null}
        </YStack>
      </form>
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
            {t('frank.loading')}
          </Text>
        </Card>
      ) : null}

      {!isLoading && isError ? (
        <Card paddingHorizontal={16} paddingVertical={28} alignItems="center" marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {t('frank.error_not_ready')}
          </Text>
        </Card>
      ) : null}

      {!isLoading && data ? (
        <>
          {data.chipNote ? (
            <>
              <SectionHeader title={t('frank.chip_watch')} />
              <Card marginBottom={20}>
                <YStack paddingHorizontal={16} paddingVertical={14}>
                  <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={18}>
                    {data.chipNote}
                  </Text>
                </YStack>
              </Card>
            </>
          ) : null}

          <SectionHeader title={t('frank.captain_picks', { gameweek: data.gameweek })} />
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

          <SectionHeader title={t('frank.transfer_targets')} />
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

      <FNote>{t('frank.disclaimer')}</FNote>
    </PageShell>
  );
}
