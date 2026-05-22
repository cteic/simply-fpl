'use client';

import { useState } from 'react';

import { Input, TeamIdHelp, Text, XStack, YStack, stadiumHeroGradient } from '@simplyfpl/ui';

const STORAGE_KEY = 'simplyfpl:lastEntryId';

const HERO_COPY = {
  eyebrow: 'Live FPL companion',
  headlineLead: 'Feel every ',
  headlineAccent: 'green arrow.',
  subhead:
    'Your live rank, mini-leagues and head-to-heads — pushed to your screen the second a goal lands. No refreshing, no spinner, no crashing when everyone piles in.',
  ctaLabel: 'View live rank',
  inputPlaceholder: 'Team ID or paste your FPL URL',
  searchError: 'Enter a numeric FPL team ID or paste an FPL team URL.',
  note: 'No sign-up needed — just paste your team ID.',
  disclaimer: 'SimplyFPL is not affiliated with the Premier League or Fantasy Premier League.',
};

interface HeroFeature {
  title: string;
  body: string;
}

const HERO_FEATURES: HeroFeature[] = [
  {
    title: 'Real-time live rank',
    body: 'A websocket pushes your rank the instant a goal lands. Stop hitting refresh.',
  },
  {
    title: 'Never crashes under load',
    body: 'Served from the edge — fast and up when everyone rushes in at once.',
  },
  {
    title: 'Cohort & rivals insight',
    body: 'See where you stand vs the top 10k and the rivals next to you in your leagues.',
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
    <YStack
      data-testid="home-unified-hero"
      render="main"
      width="100%"
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={20}
      paddingVertical={56}
      backgroundColor="$brand"
      style={{
        minHeight: 'calc(100dvh - 54px)',
        backgroundImage: stadiumHeroGradient,
      }}
    >
      <YStack maxWidth={640} width="100%" alignItems="center" gap={20}>
        <img src="/brand/simplyfpl-mark.svg" alt="SimplyFPL" width={52} height={52} />

        <Text
          fontFamily="$body"
          fontSize={11}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={2.4}
          color="$stadiumAccent"
        >
          {HERO_COPY.eyebrow}
        </Text>

        <Text
          fontFamily="$body"
          fontWeight="700"
          fontSize={56}
          lineHeight={56}
          letterSpacing={-1.8}
          textAlign="center"
          color="$inverse"
          $sm={{ fontSize: 36, lineHeight: 38 }}
        >
          {HERO_COPY.headlineLead}
          <Text color="$stadiumAccent">{HERO_COPY.headlineAccent}</Text>
        </Text>

        <Text
          fontFamily="$body"
          fontSize={16}
          lineHeight={24}
          textAlign="center"
          color="$inverseStrong"
          maxWidth={520}
        >
          {HERO_COPY.subhead}
        </Text>

        <YStack width="100%" maxWidth={520} gap={8} marginTop={8}>
          <XStack gap={10} flexWrap="wrap" justifyContent="center">
            <Input
              flexGrow={1}
              flexBasis={240}
              minWidth={200}
              minHeight={48}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder={HERO_COPY.inputPlaceholder}
              fontFamily="$mono"
              fontSize={15}
              backgroundColor="$overlay2"
              borderColor="$overlay5"
              color="$inverse"
              hoverStyle={{ borderColor: '$overlay6' }}
              focusStyle={{ borderColor: '$stadiumAccent' }}
            />
            <Text
              render="button"
              role="button"
              onPress={handleSubmit}
              fontFamily="$body"
              fontSize={15}
              fontWeight="700"
              color="$stadium3"
              backgroundColor="$stadiumAccent"
              paddingHorizontal={24}
              paddingVertical={14}
              borderRadius={8}
              cursor="pointer"
              whiteSpace="nowrap"
              hoverStyle={{ backgroundColor: '$stadiumAccentStrong' }}
              pressStyle={{ opacity: 0.85 }}
            >
              {HERO_COPY.ctaLabel} →
            </Text>
          </XStack>
          {error ? (
            <Text fontFamily="$body" fontSize={12} color="$stadiumDanger" textAlign="center">
              {error}
            </Text>
          ) : null}
        </YStack>

        <Text fontFamily="$body" fontSize={13} color="$inverseSoft" textAlign="center">
          {HERO_COPY.note}
        </Text>

        <TeamIdHelp tone="inverse" />

        <XStack gap={10} flexWrap="wrap" justifyContent="center" marginTop={14}>
          {HERO_FEATURES.map((feature) => (
            <YStack
              key={feature.title}
              flexGrow={1}
              flexBasis={180}
              maxWidth={240}
              backgroundColor="$overlay1"
              borderWidth={1}
              borderColor="$overlay3"
              borderRadius={12}
              paddingHorizontal={16}
              paddingVertical={14}
              gap={5}
            >
              <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$inverse">
                {feature.title}
              </Text>
              <Text fontFamily="$body" fontSize={12} lineHeight={17} color="$inverseSoft">
                {feature.body}
              </Text>
            </YStack>
          ))}
        </XStack>

        <Text
          fontFamily="$body"
          fontSize={11}
          color="$inverseFaint"
          textAlign="center"
          marginTop={16}
        >
          {HERO_COPY.disclaimer}
        </Text>
      </YStack>
    </YStack>
  );
}
