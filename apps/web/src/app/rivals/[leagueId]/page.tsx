import { RivalsView } from '@/components/views/rivals-view';

export const runtime = 'edge';
export const dynamic = 'force-static';
export const dynamicParams = true;

export default function RivalsPage() {
  return <RivalsView />;
}

export function generateMetadata() {
  return {
    title: 'Rivals — SimplyFPL',
    description: 'See the managers right next to you in your mini-league, live.',
  };
}
