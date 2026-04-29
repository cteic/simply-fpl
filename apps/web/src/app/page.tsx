import { LiveRankLookup } from '@/components/live-rank-lookup';

export default function HomePage() {
  return (
    <main>
      <section>
        <h1>SimplyFPL</h1>
        <p>Live FPL rank, mini-leagues, price changes — updated every 60 seconds.</p>
        <LiveRankLookup />
      </section>
    </main>
  );
}
