import { router } from 'expo-router';

import { auth } from '@simplyfpl/features';
import { Button, Card, SectionHeader, Text, XStack, YStack } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { useSavedEntryId } from '@/lib/saved-team';

const { useAuth } = auth;

const PRO_FEATURES = [
  'Push notifications for price changes',
  'Transfer planner',
  'Effective ownership tracker',
  'Ad-free experience',
];

export default function ProfileScreen() {
  const { entryId, clear } = useSavedEntryId();
  const { session, user, isPro, isLoading, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
  }

  function renderAccount() {
    if (isLoading) {
      return (
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          Loading…
        </Text>
      );
    }
    if (session) {
      return (
        <YStack gap={10}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
              Email
            </Text>
            <Text fontFamily="$body" fontSize={13} color="$color">
              {user?.email ?? '—'}
            </Text>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
              Plan
            </Text>
            <Text fontFamily="$body" fontSize={13} color="$color">
              {isPro ? 'Pro' : 'Free'}
            </Text>
          </XStack>
          <XStack marginTop={4}>
            <Button
              tone="ghost"
              size="sm"
              onPress={() => {
                handleSignOut();
              }}
            >
              Sign out
            </Button>
          </XStack>
        </YStack>
      );
    }
    return (
      <YStack gap={10}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          Sign in to sync your team and unlock Pro features.
        </Text>
        <XStack>
          <Button
            tone="primary"
            size="md"
            onPress={() => {
              router.navigate('/login');
            }}
          >
            Sign in
          </Button>
        </XStack>
      </YStack>
    );
  }

  return (
    <Screen>
      <Card paddingHorizontal={20} paddingVertical={18} gap={10}>
        <SectionHeader title="Your Team" />
        {entryId === null ? (
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            No team linked yet. Add your FPL team ID on the Home tab.
          </Text>
        ) : (
          <YStack gap={10}>
            <Text fontFamily="$mono" fontSize={20} color="$color">
              Team {entryId}
            </Text>
            <XStack>
              <Button tone="ghost" size="sm" onPress={clear}>
                Forget this team
              </Button>
            </XStack>
          </YStack>
        )}
      </Card>

      <Card paddingHorizontal={20} paddingVertical={18} gap={10}>
        <SectionHeader title="Account" />
        {renderAccount()}
      </Card>

      <Card paddingHorizontal={20} paddingVertical={18} gap={10}>
        <SectionHeader title="SimplyFPL Pro" />
        <YStack gap={8}>
          {PRO_FEATURES.map((feature) => (
            <XStack key={feature} gap={8} alignItems="center">
              <Text fontFamily="$body" fontWeight="700" color="$positive">
                ✓
              </Text>
              <Text fontFamily="$body" fontSize={14} color="$color" flex={1}>
                {feature}
              </Text>
            </XStack>
          ))}
        </YStack>
        <Text fontFamily="$body" fontSize={15} fontWeight="700" color="$brand">
          €4 / month · €25 / year
        </Text>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          Subscribe via simplyfpl.com
        </Text>
      </Card>

      <Card paddingHorizontal={20} paddingVertical={18} gap={6}>
        <SectionHeader title="About" />
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          SimplyFPL · Data refreshes every 60 seconds during live gameweeks.
        </Text>
      </Card>
    </Screen>
  );
}
