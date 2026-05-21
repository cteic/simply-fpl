import { YStack } from '@simplyfpl/ui';

import { useSavedEntryId } from '@/lib/saved-team';
import { HeroLanding } from '@/views/hero-landing';
import { LiveRankDashboard } from '@/views/live-rank-dashboard';

export default function HomeScreen() {
  const { entryId, hydrated, save, clear } = useSavedEntryId();

  if (!hydrated) {
    return <YStack flex={1} backgroundColor="$background" />;
  }

  if (entryId === null) {
    return <HeroLanding onSave={save} />;
  }

  return <LiveRankDashboard entryId={entryId} onChangeTeam={clear} />;
}
