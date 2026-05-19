import { ThreatsView } from '@/components/views/threats-view';

export const runtime = 'edge';
export const dynamic = 'force-static';

export default function ThreatsPage() {
  return <ThreatsView />;
}

export function generateMetadata() {
  return {
    title: 'Threats — SimplyFPL',
    description: 'Players nearby managers own that you don’t — with projected rank impact.',
  };
}
