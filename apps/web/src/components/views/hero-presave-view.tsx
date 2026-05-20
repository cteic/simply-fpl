'use client';

import { useState } from 'react';

import {
  Button,
  Card,
  FNote,
  Input,
  Logo,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

const STORAGE_KEY = 'simplyfpl:lastEntryId';

const HERO_COPY = {
  eyebrow: 'LIVE FPL COMPANION',
  headline: 'Your live rank, the second it changes',
  subhead:
    'Real-time rank pushed straight to your screen — no refreshing, no spinner, no crashing when everyone piles in after a goal.',
  ctaLabel: 'View my live rank',
  inputPlaceholder: 'FPL team ID or team URL',
  searchError: 'Enter a numeric FPL team ID or paste an FPL team URL.',
  disclaimer: 'SimplyFPL is not affiliated with the Premier League or Fantasy Premier League.',
  screenshotAlt: 'SimplyFPL live dashboard preview',
};

interface HeroFeature {
  title: string;
  body: string;
}

const HERO_FEATURES: HeroFeature[] = [
  {
    title: 'Real-time live rank',
    body: 'A websocket to Cloudflare pushes your rank the instant a goal lands. Stop hitting refresh.',
  },
  {
    title: 'Never crashes under load',
    body: 'Served static from the edge, so it stays fast and up when everyone rushes in at once.',
  },
  {
    title: 'Cohort & rivals insight',
    body: 'See where you stand against the top 10k and the managers right next to you in your leagues.',
  },
];

function parseEntryId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const fromUrl = trimmed.match(/entry\/(\d+)/i)?.[1];
  if (fromUrl) {
    const parsed = Number(fromUrl);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

interface HeroPreSaveViewProps {
  onSave?: (entryId: number) => void;
}

export function HeroPreSaveView({ onSave }: HeroPreSaveViewProps = {}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const id = parseEntryId(input);
    if (!id) {
      setError(HERO_COPY.searchError);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, String(id));
    if (onSave) {
      onSave(id);
    } else {
      window.location.href = '/';
    }
  }

  return (
    <PageShell>
      <YStack data-testid="home-unified-hero" gap={28} paddingTop={12} paddingBottom={8}>
        <YStack gap={14} alignItems="flex-start">
          <Logo size="lg" />
          <Text
            fontFamily="$body"
            fontSize={11}
            fontWeight="600"
            color="$colorSubtle"
            letterSpacing={1.4}
          >
            {HERO_COPY.eyebrow}
          </Text>
          <Text fontFamily="$body" fontSize={34} fontWeight="700" color="$color" lineHeight={40}>
            {HERO_COPY.headline}
          </Text>
          <Text fontFamily="$body" fontSize={15} color="$colorMuted" maxWidth={560} lineHeight={22}>
            {HERO_COPY.subhead}
          </Text>

          <YStack gap={8} width="100%" maxWidth={560} marginTop={4}>
            <XStack gap={10} flexWrap="wrap">
              <Input
                flex={1}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSubmit}
                placeholder={HERO_COPY.inputPlaceholder}
                borderColor="$borderStrong"
                backgroundColor="$background"
              />
              <Button tone="primary" size="md" onPress={handleSubmit}>
                {HERO_COPY.ctaLabel}
              </Button>
            </XStack>
            {error ? (
              <Text fontFamily="$body" fontSize={12} color="$danger">
                {error}
              </Text>
            ) : null}
          </YStack>
        </YStack>

        <YStack
          borderWidth={1}
          borderColor="$border"
          borderRadius={12}
          overflow="hidden"
          backgroundColor="$surface"
        >
          <img
            src="/marketing/dashboard-frozen.png"
            alt={HERO_COPY.screenshotAlt}
            width={1280}
            height={880}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </YStack>

        <XStack gap={12} flexWrap="wrap">
          {HERO_FEATURES.map((feature) => (
            <Card
              key={feature.title}
              flex={1}
              minWidth={220}
              paddingHorizontal={18}
              paddingVertical={16}
            >
              <YStack gap={6}>
                <SectionHeader title={feature.title} />
                <Text fontFamily="$body" fontSize={13} color="$colorMuted" lineHeight={19}>
                  {feature.body}
                </Text>
              </YStack>
            </Card>
          ))}
        </XStack>

        <FNote>{HERO_COPY.disclaimer}</FNote>
      </YStack>
    </PageShell>
  );
}
