'use client';

import Link from 'next/link';

import { useTranslation } from '@simplyfpl/i18n';
import { Text, XStack, YStack } from '@simplyfpl/ui';

interface LegalLink {
  href: '/privacy' | '/terms' | '/support';
  labelKey: 'footer.privacy' | 'footer.terms' | 'footer.support';
}

const LEGAL_LINKS: LegalLink[] = [
  { href: '/privacy', labelKey: 'footer.privacy' },
  { href: '/terms', labelKey: 'footer.terms' },
  { href: '/support', labelKey: 'footer.support' },
];

export function AppFooter() {
  const { t } = useTranslation();
  return (
    <YStack
      render="footer"
      borderTopWidth={1}
      borderTopColor="$border"
      borderStyle="solid"
      paddingVertical={24}
      paddingHorizontal={28}
      $sm={{ paddingHorizontal: 16 }}
    >
      <XStack
        maxWidth={960}
        width="100%"
        marginHorizontal="auto"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={12}
      >
        <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
          SimplyFPL is not affiliated with the Premier League or Fantasy Premier League.
        </Text>
        <XStack gap={16} alignItems="center" flexWrap="wrap">
          <Link href="/vs-livefpl">
            <Text
              fontFamily="$body"
              fontSize={11}
              color="$colorMuted"
              hoverStyle={{ color: '$color' }}
              cursor="pointer"
            >
              SimplyFPL vs livefpl.net
            </Text>
          </Link>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Text
                fontFamily="$body"
                fontSize={11}
                color="$colorMuted"
                hoverStyle={{ color: '$color' }}
                cursor="pointer"
              >
                {t(link.labelKey)}
              </Text>
            </Link>
          ))}
        </XStack>
      </XStack>
    </YStack>
  );
}
