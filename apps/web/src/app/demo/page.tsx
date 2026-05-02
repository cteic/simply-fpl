import Link from 'next/link';

import { Card, FNote, PageHeader, PageShell, Text, YStack } from '@simplyfpl/ui';

export const metadata = {
  title: 'Demo — SimplyFPL',
  description: 'Static demo views of SimplyFPL pages with example data.',
};

export default function DemoIndexPage() {
  return (
    <PageShell>
      <PageHeader title="Demo" meta="Static example data · for screenshots and previews only" />

      <YStack gap={10}>
        <Link href="/demo/live-rank" style={{ textDecoration: 'none' }}>
          <DemoCard
            title="Live Rank"
            body="Pitch view, GW points, live rank delta, mini-league."
          />
        </Link>
        <Link href="/demo/leagues" style={{ textDecoration: 'none' }}>
          <DemoCard
            title="Leagues"
            body="Live mini-league standings with captain and bench points."
          />
        </Link>
        <Link href="/demo/planner" style={{ textDecoration: 'none' }}>
          <DemoCard
            title="Transfer Planner (Pro)"
            body="Multi-week fixture difficulty grid with chip and captain planning."
          />
        </Link>
      </YStack>

      <FNote>
        These pages render seed data and never hit the FPL API. The real pages live at{' '}
        <Link href="/">/</Link>, <Link href="/leagues">/leagues</Link>, and{' '}
        <Link href="/planner">/planner</Link>.
      </FNote>
    </PageShell>
  );
}

function DemoCard({ title, body }: { title: string; body: string }) {
  return (
    <Card paddingHorizontal={20} paddingVertical={18}>
      <Text fontFamily="$body" fontSize={15} fontWeight="600" color="$color">
        {title}
      </Text>
      <Text fontFamily="$body" fontSize={13} color="$colorMuted" marginTop={4}>
        {body}
      </Text>
    </Card>
  );
}
