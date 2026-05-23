'use client';

import { Logo, Text, XStack, YStack } from '@simplyfpl/ui';

const SWATCHES = [
  { name: 'GK', hex: '#FEF3C7' },
  { name: 'DEF', hex: '#DBEAFE' },
  { name: 'MID', hex: '#DCFCE7' },
  { name: 'FWD', hex: '#FCE7F3' },
  { name: 'brand', hex: '#0F766E' },
];

export function BrandSmokeTestView() {
  return (
    <YStack padding={48} gap={48} backgroundColor="$background" minHeight="100vh">
      <YStack gap={8}>
        <Text fontFamily="$body" fontSize={28} fontWeight="600" color="$color">
          Brand smoke test
        </Text>
        <Text fontFamily="$body" fontSize={14} color="$colorMuted">
          Eyeball check: does the brand accent coexist with the position-shirt palette on the warm
          neutral bg?
        </Text>
      </YStack>

      <YStack gap={16}>
        <Text fontFamily="$body" fontSize={11} fontWeight="600" color="$colorMuted">
          WORDMARK
        </Text>
        <YStack gap={20}>
          <Logo size="sm" />
          <Logo size="md" />
          <Logo size="lg" />
        </YStack>
      </YStack>

      <YStack gap={16}>
        <Text fontFamily="$body" fontSize={11} fontWeight="600" color="$colorMuted">
          MARK
        </Text>
        <XStack gap={24} alignItems="center">
          <Logo variant="mark" size="sm" />
          <Logo variant="mark" size="md" />
          <Logo variant="mark" size="lg" />
        </XStack>
      </YStack>

      <YStack gap={16}>
        <Text fontFamily="$body" fontSize={11} fontWeight="600" color="$colorMuted">
          ILLUSTRATIVE MARK
        </Text>
        <XStack gap={28} alignItems="flex-end">
          <img src="/brand/simplyfpl-mark.svg" alt="SimplyFPL" width={40} height={40} />
          <img src="/brand/simplyfpl-mark.svg" alt="SimplyFPL" width={64} height={64} />
          <img src="/brand/simplyfpl-mark.svg" alt="SimplyFPL" width={96} height={96} />
        </XStack>
        <XStack gap={12} alignItems="center" marginTop={8}>
          <img src="/brand/simplyfpl-mark.svg" alt="SimplyFPL" width={44} height={44} />
          <Logo size="lg" />
        </XStack>
      </YStack>

      <YStack gap={16}>
        <Text fontFamily="$body" fontSize={11} fontWeight="600" color="$colorMuted">
          COEXISTENCE — POSITION SHIRTS + BRAND ACCENT
        </Text>
        <XStack gap={12}>
          {SWATCHES.map((s) => (
            <YStack key={s.name} gap={8} alignItems="center">
              <YStack
                width={80}
                height={80}
                backgroundColor={s.hex}
                borderRadius={8}
                borderWidth={1}
                borderColor="$border"
              />
              <Text fontFamily="$mono" fontSize={11} color="$colorMuted">
                {s.name}
              </Text>
              <Text fontFamily="$mono" fontSize={10} color="$colorSubtle">
                {s.hex}
              </Text>
            </YStack>
          ))}
        </XStack>
      </YStack>

      <YStack gap={16}>
        <Text fontFamily="$body" fontSize={11} fontWeight="600" color="$colorMuted">
          INVERSE TONE (DARK SURFACE)
        </Text>
        <YStack
          padding={32}
          backgroundColor="$color"
          borderRadius={12}
          gap={16}
          alignItems="flex-start"
        >
          <Logo size="md" tone="inverse" />
          <Logo variant="mark" size="lg" tone="inverse" />
          <img src="/brand/simplyfpl-mark.svg" alt="SimplyFPL" width={64} height={64} />
        </YStack>
      </YStack>
    </YStack>
  );
}
