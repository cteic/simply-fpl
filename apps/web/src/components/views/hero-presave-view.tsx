'use client';

import { useState } from 'react';

import { useThemeName } from 'tamagui';

import { fplClient } from '@simplyfpl/fpl-client';
import { t } from '@simplyfpl/i18n';
import {
  Input,
  Logo,
  PitchBackground,
  TeamIdHelp,
  Text,
  XStack,
  YStack,
  featureSurfaceStyle,
  resolveThemeName,
} from '@simplyfpl/ui';

import { setSavedEntryId } from '@/lib/saved-entry-id';

import { lookupEntry, parseEntryId } from '../team-id-search';

interface HeroFeature {
  title: string;
  body: string;
}

const HERO_FEATURES: HeroFeature[] = [
  {
    title: t('hero.feature_realtime_title'),
    body: t('hero.feature_realtime_body'),
  },
  {
    title: t('hero.feature_reliable_title'),
    body: t('hero.feature_reliable_body'),
  },
  {
    title: t('hero.feature_cohort_title'),
    body: t('hero.feature_cohort_body'),
  },
];

interface HeroPreSaveViewProps {
  onSave?: (entryId: number) => void;
}

export function HeroPreSaveView({ onSave }: HeroPreSaveViewProps = {}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const themeName = resolveThemeName(useThemeName());
  const surface = featureSurfaceStyle(themeName, 'hero');
  const logoTone = themeName === 'quiet' ? 'default' : 'inverse';

  async function handleSubmit() {
    if (checking) return;
    setError(null);
    const id = parseEntryId(input);
    if (!id) {
      setError(t('hero.search_error'));
      return;
    }

    setChecking(true);
    const result = await lookupEntry(id, fplClient.getEntry);
    setChecking(false);

    if (result.status === 'not-found') {
      setError(t('hero.not_found_error'));
      return;
    }
    if (result.status === 'error') {
      setError(t('hero.network_error'));
      return;
    }

    setSavedEntryId(id);
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
      position="relative"
      overflow="hidden"
      width="100%"
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={20}
      paddingVertical={56}
      backgroundColor="$featureSurface"
      borderWidth={surface.borderWidth}
      borderColor="$featureBorder"
      style={{
        minHeight: 'calc(100dvh - 54px)',
        backgroundImage: surface.backgroundImage,
      }}
    >
      <PitchBackground />

      <YStack
        maxWidth={640}
        width="100%"
        alignItems="center"
        gap={20}
        position="relative"
        zIndex={1}
      >
        <Logo variant="lockup" tone={logoTone} size="lg" href="/" />

        <Text
          fontFamily="$body"
          fontSize={11}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={2.4}
          color="#34D399"
        >
          {t('hero.eyebrow')}
        </Text>

        <Text
          render="h1"
          fontFamily="$body"
          fontWeight="700"
          fontSize={56}
          lineHeight={56}
          letterSpacing={-1.8}
          textAlign="center"
          color="#FFFFFF"
          $sm={{ fontSize: 36, lineHeight: 38 }}
        >
          {t('hero.headline_lead')}
          <Text color="#34D399">{t('hero.headline_accent')}</Text>
        </Text>

        <Text
          fontFamily="$body"
          fontSize={16}
          lineHeight={24}
          textAlign="center"
          color="rgba(255,255,255,0.8)"
          maxWidth={520}
        >
          {t('hero.subhead')}
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
              placeholder={t('hero.input_placeholder')}
              fontFamily="$mono"
              fontSize={15}
              backgroundColor="rgba(255,255,255,0.1)"
              borderColor="rgba(255,255,255,0.28)"
              color="#FFFFFF"
              hoverStyle={{ borderColor: 'rgba(255,255,255,0.45)' }}
              focusStyle={{ borderColor: '#34D399' }}
            />
            <Text
              render="button"
              role="button"
              aria-busy={checking}
              onPress={handleSubmit}
              fontFamily="$body"
              fontSize={15}
              fontWeight="700"
              color="#0B4F49"
              backgroundColor="#34D399"
              paddingHorizontal={24}
              paddingVertical={14}
              borderRadius={8}
              cursor={checking ? 'default' : 'pointer'}
              opacity={checking ? 0.7 : 1}
              whiteSpace="nowrap"
              hoverStyle={{ backgroundColor: '#38E4A5' }}
              pressStyle={{ opacity: 0.85 }}
            >
              {checking ? t('hero.cta_checking') : `${t('hero.cta')} →`}
            </Text>
          </XStack>
          {error ? (
            <Text fontFamily="$body" fontSize={12} color="#FCA5A5" textAlign="center">
              {error}
            </Text>
          ) : null}
        </YStack>

        <Text fontFamily="$body" fontSize={13} color="rgba(255,255,255,0.55)" textAlign="center">
          {t('hero.note')}
        </Text>

        <TeamIdHelp tone="inverse" />

        <XStack gap={10} flexWrap="wrap" justifyContent="center" marginTop={14}>
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
              <Text fontFamily="$body" fontSize={12} lineHeight={17} color="rgba(255,255,255,0.55)">
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
          marginTop={16}
        >
          {t('hero.disclaimer')}
        </Text>
      </YStack>
    </YStack>
  );
}
