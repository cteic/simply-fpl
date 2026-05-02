'use client';

import { auth } from '@simplyfpl/features';
import {
  Button,
  Card,
  FNote,
  PageHeader,
  PageShell,
  ProBanner,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

const { useAuth } = auth;

export function PlannerView() {
  const { session, isPro, isLoading } = useAuth();

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Transfer Planner" meta="Loading…" />
      </PageShell>
    );
  }

  if (session && isPro) {
    return <ProSoonView />;
  }

  return <UpsellView />;
}

function UpsellView() {
  return (
    <PageShell>
      <PageHeader title="Transfer Planner" meta="Pro feature · €4/mo or €25/yr" />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Plan your transfers across the season" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            See fixture difficulty, captain picks and chip strategy in one grid — across the next
            five gameweeks. Available with SimplyFPL Pro.
          </Text>
          <XStack gap={10}>
            <Button tone="primary" size="md">
              Go Pro ✦
            </Button>
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                window.location.href = '/demo/planner';
              }}
            >
              See a demo
            </Button>
          </XStack>
        </YStack>
      </Card>

      <ProBanner
        title="Unlock Transfer Planner with Pro"
        body="Plan transfers, chips and captain picks across the full season. €4/mo or €25/yr."
      />

      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}

function ProSoonView() {
  return (
    <PageShell>
      <PageHeader title="Transfer Planner" meta="Pro · coming soon" />

      <Card paddingHorizontal={24} paddingVertical={24}>
        <SectionHeader title="Planner is in build" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            You're a Pro subscriber — thanks. The full planner is being wired to the FPL fixture API
            and will land in the next release.
          </Text>
          <XStack>
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                window.location.href = '/demo/planner';
              }}
            >
              Preview the demo
            </Button>
          </XStack>
        </YStack>
      </Card>

      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}
