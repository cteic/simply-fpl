'use client';

import { useState } from 'react';

import { fplClient } from '@simplyfpl/fpl-client';
import { Input, Logo, TeamIdHelp, Text, XStack, YStack, stadiumHeroGradient } from '@simplyfpl/ui';

import { lookupEntry, parseEntryId } from '../team-id-search';

const STORAGE_KEY = 'simplyfpl:lastEntryId';

const HERO_COPY = {
  eyebrow: 'Live FPL companion',
  headlineLead: 'Feel every ',
  headlineAccent: 'green arrow.',
  subhead:
    'Your live rank, mini-leagues and head-to-heads — pushed to your screen the second a goal lands. No refreshing, no spinner, no crashing when everyone piles in.',
  ctaLabel: 'View live rank',
  ctaLabelChecking: 'Checking…',
  inputPlaceholder: 'Team ID or paste your FPL URL',
  searchError: 'Enter a numeric FPL team ID or paste an FPL team URL.',
  notFoundError: "We couldn't find a team with that ID. Double-check it and try again.",
  networkError: "Couldn't reach the server — please try again in a moment.",
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

interface HeroPreSaveViewProps {
  onSave?: (entryId: number) => void;
}

export function HeroPreSaveView({ onSave }: HeroPreSaveViewProps = {}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit() {
    if (checking) return;
    setError(null);
    const id = parseEntryId(input);
    if (!id) {
      setError(HERO_COPY.searchError);
      return;
    }

    setChecking(true);
    const result = await lookupEntry(id, fplClient.getEntry);
    setChecking(false);

    if (result.status === 'not-found') {
      setError(HERO_COPY.notFoundError);
      return;
    }
    if (result.status === 'error') {
      setError(HERO_COPY.networkError);
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
        <Logo variant="lockup" tone="inverse" size="lg" href="/" />

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
              aria-busy={checking}
              onPress={handleSubmit}
              fontFamily="$body"
              fontSize={15}
              fontWeight="700"
              color="$stadium3"
              backgroundColor="$stadiumAccent"
              paddingHorizontal={24}
              paddingVertical={14}
              borderRadius={8}
              cursor={checking ? 'default' : 'pointer'}
              opacity={checking ? 0.7 : 1}
              whiteSpace="nowrap"
              hoverStyle={{ backgroundColor: '$stadiumAccentStrong' }}
              pressStyle={{ opacity: 0.85 }}
            >
              {checking ? HERO_COPY.ctaLabelChecking : `${HERO_COPY.ctaLabel} →`}
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
