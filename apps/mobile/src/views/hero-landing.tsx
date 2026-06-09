import { useState } from 'react';

import { ScrollView } from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fplClient, parseEntryId } from '@simplyfpl/fpl-client';
import { Input, Logo, TeamIdHelp, Text, XStack, YStack } from '@simplyfpl/ui';

import { StadiumGradient } from '@/components/stadium-gradient';

const HERO_COPY = {
  eyebrow: 'Live FPL companion',
  headlineLead: 'Feel every ',
  headlineAccent: 'green arrow.',
  subhead:
    'Your live rank, mini-leagues and head-to-heads — updated the second a goal lands. No refreshing, no spinner.',
  ctaLabel: 'View live rank',
  ctaLabelChecking: 'Checking…',
  inputPlaceholder: 'Team ID or paste your FPL URL',
  searchError: 'Enter a numeric FPL team ID or paste an FPL team URL.',
  notFoundError: "We couldn't find a team with that ID. Double-check it and try again.",
  networkError: "Couldn't reach the server — please try again in a moment.",
  note: 'No sign-up needed — just paste your team ID.',
  disclaimer: 'SimplyFPL is not affiliated with the Premier League or Fantasy Premier League.',
};

const HERO_FEATURES = [
  {
    title: 'Real-time live rank',
    body: 'Your rank moves the instant a goal lands. Stop hitting refresh.',
  },
  {
    title: 'Never crashes under load',
    body: 'Served from the edge — fast and up when everyone rushes in.',
  },
  {
    title: 'Cohort & rivals insight',
    body: 'See where you stand vs the top 10k and the rivals in your leagues.',
  },
];

interface HeroLandingProps {
  onSave: (entryId: number) => void;
}

export function HeroLanding({ onSave }: HeroLandingProps) {
  const insets = useSafeAreaInsets();
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
    try {
      await fplClient.getEntry(id);
    } catch (err) {
      setChecking(false);
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('404') || message.toLowerCase().includes('not found')) {
        setError(HERO_COPY.notFoundError);
      } else {
        setError(HERO_COPY.networkError);
      }
      return;
    }
    setChecking(false);
    onSave(id);
  }

  return (
    <>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0B4F49' }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <StadiumGradient
          flexGrow={1}
          paddingTop={insets.top + 40}
          paddingBottom={48}
          paddingHorizontal={22}
          alignItems="center"
          justifyContent="center"
        >
          <YStack maxWidth={560} width="100%" alignItems="center" gap={18}>
            <Logo variant="lockup" tone="stadium" size="lg" />

            <Text
              fontFamily="$body"
              fontSize={11}
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={2.4}
              color="#34D399"
            >
              {HERO_COPY.eyebrow}
            </Text>

            <Text
              fontFamily="$body"
              fontWeight="700"
              fontSize={40}
              lineHeight={42}
              letterSpacing={-1.4}
              textAlign="center"
              color="#FFFFFF"
            >
              {HERO_COPY.headlineLead}
              <Text color="#34D399">{HERO_COPY.headlineAccent}</Text>
            </Text>

            <Text
              fontFamily="$body"
              fontSize={15}
              lineHeight={22}
              textAlign="center"
              color="rgba(255,255,255,0.78)"
            >
              {HERO_COPY.subhead}
            </Text>

            <YStack width="100%" gap={10} marginTop={6}>
              <Input
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSubmit}
                placeholder={HERO_COPY.inputPlaceholder}
                fontFamily="$mono"
                fontSize={15}
                minHeight={48}
                backgroundColor="rgba(255,255,255,0.1)"
                borderColor="rgba(255,255,255,0.28)"
                color="#FFFFFF"
                focusStyle={{ borderColor: '#34D399' }}
              />
              <Text
                onPress={handleSubmit}
                textAlign="center"
                fontFamily="$body"
                fontSize={15}
                fontWeight="700"
                color="#0B4F49"
                backgroundColor="#34D399"
                paddingHorizontal={24}
                paddingVertical={14}
                borderRadius={8}
                opacity={checking ? 0.7 : 1}
                pressStyle={{ opacity: 0.85 }}
              >
                {checking ? HERO_COPY.ctaLabelChecking : `${HERO_COPY.ctaLabel} →`}
              </Text>
              {error ? (
                <Text fontFamily="$body" fontSize={12} color="#FCA5A5" textAlign="center">
                  {error}
                </Text>
              ) : null}
            </YStack>

            <Text
              fontFamily="$body"
              fontSize={13}
              color="rgba(255,255,255,0.55)"
              textAlign="center"
            >
              {HERO_COPY.note}
            </Text>

            <TeamIdHelp tone="inverse" />

            <XStack
              width="100%"
              gap={10}
              flexWrap="wrap"
              justifyContent="center"
              marginTop={8}
              $sm={{ flexDirection: 'column' }}
            >
              {HERO_FEATURES.map((feature) => (
                <YStack
                  key={feature.title}
                  flexGrow={1}
                  flexBasis={180}
                  maxWidth={240}
                  backgroundColor="rgba(255,255,255,0.06)"
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.12)"
                  borderRadius={12}
                  paddingHorizontal={16}
                  paddingVertical={14}
                  gap={5}
                >
                  <Text fontFamily="$body" fontSize={13} fontWeight="600" color="#FFFFFF">
                    {feature.title}
                  </Text>
                  <Text
                    fontFamily="$body"
                    fontSize={12}
                    lineHeight={17}
                    color="rgba(255,255,255,0.6)"
                  >
                    {feature.body}
                  </Text>
                </YStack>
              ))}
            </XStack>

            <Text
              fontFamily="$body"
              fontSize={11}
              color="rgba(255,255,255,0.4)"
              textAlign="center"
              marginTop={12}
            >
              {HERO_COPY.disclaimer}
            </Text>
          </YStack>
        </StadiumGradient>
      </ScrollView>
    </>
  );
}
