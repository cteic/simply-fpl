'use client';

import Link from 'next/link';

import { Text, XStack, YStack } from '@simplyfpl/ui';

export function AppFooter() {
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
        </XStack>
      </XStack>
    </YStack>
  );
}
