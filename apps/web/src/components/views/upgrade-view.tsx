'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { auth } from '@simplyfpl/features';
import {
  Button,
  Card,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

const { useAuth } = auth;

type BillingCycle = 'monthly' | 'yearly' | 'lifetime';
type PlanTier = 'pro' | 'ultimate';
type PlanId = `${PlanTier}-${BillingCycle}`;

interface PlanOption {
  cycle: BillingCycle;
  label: string;
  price: string;
  note?: string;
}

const PRO_OPTIONS: PlanOption[] = [
  { cycle: 'monthly', label: 'Monthly', price: '€4/mo' },
  { cycle: 'yearly', label: 'Yearly', price: '€25/yr', note: 'Save €23' },
  { cycle: 'lifetime', label: 'Lifetime', price: '€100', note: 'One-time' },
];

const ULTIMATE_OPTIONS: PlanOption[] = [
  { cycle: 'monthly', label: 'Monthly', price: '€10/mo' },
  { cycle: 'yearly', label: 'Yearly', price: '€75/yr', note: 'Save €45' },
  { cycle: 'lifetime', label: 'Lifetime', price: '€250', note: 'One-time' },
];

const PRO_FEATURES = [
  'All live rank tools',
  'Notification alerts (when shipped)',
  'Price predictor',
  'Full season replay',
];

const ULTIMATE_FEATURES = [
  'Everything in Pro',
  'Frank on-demand AI questions',
  'Priority feature access',
];

interface BillingToggleProps {
  options: PlanOption[];
  selected: BillingCycle;
  onSelect: (cycle: BillingCycle) => void;
}

function BillingToggle({ options, selected, onSelect }: BillingToggleProps) {
  return (
    <XStack gap={6} marginVertical={16}>
      {options.map((opt) => (
        <XStack
          key={opt.cycle}
          onPress={() => onSelect(opt.cycle)}
          cursor="pointer"
          paddingHorizontal={10}
          paddingVertical={6}
          borderRadius="$7"
          borderWidth={1}
          borderStyle="solid"
          borderColor={selected === opt.cycle ? '$brand' : '$border'}
          backgroundColor={selected === opt.cycle ? '$brandBg' : '$surface'}
          alignItems="center"
        >
          <Text
            fontFamily="$body"
            fontSize={11}
            fontWeight={selected === opt.cycle ? '600' : '400'}
            color={selected === opt.cycle ? '$brand' : '$colorMuted'}
          >
            {opt.label}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}

interface PlanCardProps {
  tier: PlanTier;
  title: string;
  features: string[];
  options: PlanOption[];
  currentTier: string;
}

function PlanCard({ tier, title, features, options, currentTier }: PlanCardProps) {
  const [selected, setSelected] = useState<BillingCycle>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isUltimate = tier === 'ultimate';
  const isOwned = currentTier === tier || (tier === 'pro' && currentTier === 'ultimate');
  const selectedOption = options.find((o) => o.cycle === selected) ?? options[0];

  async function handleUpgrade() {
    setIsLoading(true);
    setError(null);

    const plan: PlanId = `${tier}-${selected}`;

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }

      const data = (await res.json()) as { url: string };
      router.push(data.url);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card
      flex={1}
      paddingHorizontal={20}
      paddingVertical={20}
      borderColor={isUltimate ? '$stadiumAccent' : '$brand'}
      borderWidth={isUltimate ? 2 : 1}
    >
      <XStack alignItems="center" gap={8} marginBottom={4}>
        <Text fontFamily="$body" fontSize={16} fontWeight="700" color="$color">
          {title}
        </Text>
        {isUltimate ? (
          <XStack
            backgroundColor="$brandBg"
            borderWidth={1}
            borderStyle="solid"
            borderColor="$brand"
            borderRadius={4}
            paddingHorizontal={6}
            paddingVertical={2}
          >
            <Text
              fontFamily="$body"
              fontSize={9}
              fontWeight="700"
              color="$brand"
              letterSpacing={0.8}
            >
              BEST VALUE
            </Text>
          </XStack>
        ) : null}
      </XStack>

      <YStack gap={6} marginTop={8} marginBottom={4}>
        {features.map((f) => (
          <XStack key={f} gap={6} alignItems="flex-start">
            <Text fontFamily="$body" fontSize={12} color="$brand" marginTop={1}>
              ✓
            </Text>
            <Text fontFamily="$body" fontSize={12} color="$colorMuted">
              {f}
            </Text>
          </XStack>
        ))}
      </YStack>

      <BillingToggle options={options} selected={selected} onSelect={setSelected} />

      <YStack gap={4} marginBottom={16}>
        <Text fontFamily="$mono" fontSize={21} fontWeight="600" color="$color">
          {selectedOption?.price}
        </Text>
        {selectedOption?.note ? (
          <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
            {selectedOption.note}
          </Text>
        ) : null}
      </YStack>

      {isOwned ? (
        <XStack
          backgroundColor="$positiveBg"
          borderRadius="$3"
          paddingHorizontal={12}
          paddingVertical={8}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontFamily="$body" fontSize={12} fontWeight="600" color="$positive">
            Current plan
          </Text>
        </XStack>
      ) : (
        <>
          <Button
            tone="primary"
            size="md"
            onPress={() => {
              if (!isLoading) void handleUpgrade();
            }}
          >
            {isLoading ? 'Redirecting…' : `Get ${title}`}
          </Button>
          {error ? (
            <Text fontFamily="$body" fontSize={12} color="$negative" marginTop={8}>
              {error}
            </Text>
          ) : null}
        </>
      )}
    </Card>
  );
}

export function UpgradeView() {
  const { tier, isLoading, session } = useAuth();
  const router = useRouter();

  if (!isLoading && !session) {
    router.replace('/login');
    return null;
  }

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader tone="stadium" title="Upgrade" meta="Choose a plan" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        tone="stadium"
        title="Upgrade"
        meta="Unlock Pro or Ultimate to get the most out of SimplyFPL"
      />

      <SectionHeader title="Choose your plan" />

      <XStack gap={16} marginTop={8} marginBottom={20} flexWrap="wrap">
        <PlanCard
          tier="pro"
          title="Pro"
          features={PRO_FEATURES}
          options={PRO_OPTIONS}
          currentTier={tier}
        />
        <PlanCard
          tier="ultimate"
          title="Ultimate"
          features={ULTIMATE_FEATURES}
          options={ULTIMATE_OPTIONS}
          currentTier={tier}
        />
      </XStack>

      <FNote>
        Payments are processed by Stripe. Cancel or change plan any time from your account settings.
      </FNote>
    </PageShell>
  );
}
