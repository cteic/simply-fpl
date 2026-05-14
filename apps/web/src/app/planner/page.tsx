import { redirect } from 'next/navigation';

import { PlannerView } from '@/components/views/planner-view';
import { FEATURE_PLANNER } from '@/lib/feature-flags';

export default function PlannerPage() {
  if (!FEATURE_PLANNER) redirect('/');
  return <PlannerView />;
}

export const metadata = {
  title: 'Transfer Planner — SimplyFPL',
  description: 'Plan transfers, chips and captain picks across upcoming gameweeks.',
};
