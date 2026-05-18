import Link from 'next/link';

import { Button, FNote, PageHeader, PageShell, Text, XStack, YStack } from '@simplyfpl/ui';

export const runtime = 'edge';
export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <PageShell>
      <PageHeader title="Page not found" meta="404" />
      <YStack gap={12} marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          We couldn't find that page. It may have moved, or the link could be wrong.
        </Text>
        <XStack>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button tone="primary" size="md">
              Back to home
            </Button>
          </Link>
        </XStack>
      </YStack>
      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}
