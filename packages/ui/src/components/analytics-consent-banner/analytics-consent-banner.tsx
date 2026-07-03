'use client';

import { useEffect, useRef } from 'react';

import { Text, XStack, YStack } from 'tamagui';

import { t } from '@simplyfpl/i18n';

import { Button } from '../button';

interface AnalyticsConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function AnalyticsConsentBanner({ onAccept, onDecline }: AnalyticsConsentBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const buttons = Array.from(containerRef.current?.querySelectorAll('button') ?? []);
    buttons[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onDecline();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(containerRef.current?.querySelectorAll('button') ?? []);
      if (focusable.length === 0) return;

      const idx = focusable.indexOf(document.activeElement as HTMLButtonElement);
      if (event.shiftKey) {
        if (idx <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1]?.focus();
        }
      } else {
        if (idx === focusable.length - 1 || idx === -1) {
          event.preventDefault();
          focusable[0]?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDecline]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label={t('analytics_consent.aria_label')}
      aria-live="polite"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
    >
      <XStack
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$border"
        paddingHorizontal={28}
        paddingVertical={14}
        alignItems="center"
        justifyContent="space-between"
        gap={16}
        $sm={{ flexDirection: 'column', alignItems: 'flex-start', paddingHorizontal: 16 }}
      >
        <YStack flex={1} gap={2}>
          <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={18}>
            {t('analytics_consent.body')}
          </Text>
        </YStack>
        <XStack gap={8} flexShrink={0}>
          <Button tone="ghost" size="sm" onPress={onDecline}>
            {t('analytics_consent.cta_decline')}
          </Button>
          <Button tone="primary" size="sm" onPress={onAccept}>
            {t('analytics_consent.cta_accept')}
          </Button>
        </XStack>
      </XStack>
    </div>
  );
}
