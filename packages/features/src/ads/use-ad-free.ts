import { useTier } from '../subscriptions';

export function useAdFree(): boolean {
  const { isPro } = useTier();
  return isPro;
}
