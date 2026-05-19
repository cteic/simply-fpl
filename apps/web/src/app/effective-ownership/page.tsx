import { EffectiveOwnershipView } from '@/components/views/effective-ownership-view';

export const runtime = 'edge';
export const dynamic = 'force-static';

export default function EffectiveOwnershipPage() {
  return <EffectiveOwnershipView />;
}

export function generateMetadata() {
  return {
    title: 'Effective Ownership — SimplyFPL',
    description: 'Effective ownership splits by rank tier — Top 1k / 10k / 100k / Overall.',
  };
}
