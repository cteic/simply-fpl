'use client';

import { useEffect, useState } from 'react';

import { useThemeName } from 'tamagui';

import { t } from '@simplyfpl/i18n';
import {
  Button,
  Card,
  FNote,
  Input,
  Logo,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
  resolveThemeName,
} from '@simplyfpl/ui';

import { readSavedEntryId, setSavedEntryId } from '@/lib/saved-entry-id';

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

interface HomeSearchViewProps {
  onSave?: (entryId: number) => void;
}

export function HomeSearchView({ onSave }: HomeSearchViewProps = {}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const logoTone = resolveThemeName(useThemeName()) === 'quiet' ? 'default' : 'stadium';

  useEffect(() => {
    const id = readSavedEntryId();
    if (id !== null) setInput(String(id));
  }, []);

  function handleSubmit() {
    setError(null);
    const id = parseEntryId(input);
    if (!id) {
      setError(t('home_search.input_error'));
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
    <PageShell>
      <PageHeader
        tone="stadium"
        title={<Logo size="lg" tone={logoTone} />}
        meta={t('home_search.meta')}
      />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title={t('home_search.section_find')} />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('home_search.description')}
          </Text>
          <XStack gap={10}>
            <Input
              flex={1}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder={t('home_search.input_placeholder')}
              borderColor="$borderStrong"
              backgroundColor="$background"
            />
            <Button tone="primary" size="md" onPress={handleSubmit}>
              {t('home_search.cta')}
            </Button>
          </XStack>
          {error ? (
            <Text fontFamily="$body" fontSize={12} color="$danger">
              {error}
            </Text>
          ) : null}
        </YStack>
      </Card>

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={20}>
        <SectionHeader title={t('home_search.section_features')} />
        <YStack gap={6} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('home_search.feature_live_rank')}
          </Text>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('home_search.feature_leagues')}
          </Text>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('home_search.feature_h2h')}
          </Text>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('home_search.feature_free')}
          </Text>
        </YStack>
      </Card>

      <FNote>{t('common.disclaimer')}</FNote>
    </PageShell>
  );
}
