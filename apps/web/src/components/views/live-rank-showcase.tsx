'use client';

import {
  BenchDivider,
  Card,
  DeltaChip,
  FNote,
  LeagueTable,
  PageHeader,
  PageShell,
  Pitch,
  PitchRow,
  Player,
  Postag,
  PriceRow,
  ProgressBar,
  PtsChip,
  SectionHeader,
  StatCard,
  StatRow,
  StatSubText,
  TeamPill,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { DEMO_BENCH, DEMO_FORMATION, DEMO_MINI_LEAGUE_ROWS, DEMO_PRICE_ROWS } from '../demo-data';

export function LiveRankShowcase() {
  return (
    <PageShell>
      <PageHeader
        title="Live Rank"
        meta="Gameweek 30 · 8 of 10 matches played"
        right={<TeamPill teamId="4821039" />}
      />

      <StatRow>
        <StatCard
          label="Overall Rank"
          value="184,203"
          sub={
            <>
              <DeltaChip tone="up">↑ 42,310</DeltaChip>
              <StatSubText>since GW start</StatSubText>
            </>
          }
          extra={<ProgressBar percent={63} labels={['Top 10k', 'Top 100k', 'Top 500k']} />}
        />
        <StatCard
          label="GW Points"
          value="67"
          extra={
            <YStack gap={8} marginTop={8}>
              <XStack gap={12} flexWrap="wrap">
                <PtsChip label="XI" value="58" />
                <PtsChip label="Bonus" value="+9" />
                <PtsChip label="Autosubs" value="0" />
              </XStack>
              <XStack gap={6} alignItems="center">
                <DeltaChip tone="up">+4 vs avg</DeltaChip>
                <StatSubText>GW avg: 63</StatSubText>
              </XStack>
            </YStack>
          }
        />
        <StatCard
          label="Yet to Play"
          value="2"
          extra={
            <YStack gap={4} marginTop={6}>
              <XStack gap={6} alignItems="center">
                <Postag>MID</Postag>
                <StatSubText>Salah · LIV vs MCI</StatSubText>
              </XStack>
              <XStack gap={6} alignItems="center">
                <Postag>FWD</Postag>
                <StatSubText>Isak · NEW vs CHE</StatSubText>
              </XStack>
              <XStack gap={6} marginTop={4}>
                <DeltaChip tone="neutral">KO 17:30 &amp; 20:00</DeltaChip>
              </XStack>
            </YStack>
          }
        />
      </StatRow>

      <YStack marginBottom={20}>
        <SectionHeader title="Your Team · GW30" />
        <Pitch teamName="Peter's United" formation="4–4–2">
          {DEMO_FORMATION.map((row, i) => (
            <PitchRow key={`row-${i}`}>
              {row.map((p) => (
                <Player
                  key={p.name}
                  name={p.name}
                  detail={p.detail}
                  position={p.position}
                  badge={p.badge ?? ''}
                  badgeTone={p.badgeTone ?? 'default'}
                />
              ))}
            </PitchRow>
          ))}
          <BenchDivider />
          <PitchRow>
            {DEMO_BENCH.map((p) => (
              <Player
                key={p.name}
                name={p.name}
                detail={p.detail}
                position={p.position}
                badge={p.badge ?? ''}
                badgeTone={p.badgeTone ?? 'bench'}
                bench
              />
            ))}
          </PitchRow>
        </Pitch>
      </YStack>

      <XStack gap={20} $sm={{ flexDirection: 'column' }} marginTop={20}>
        <YStack flex={1} minWidth={0}>
          <SectionHeader title="Mini League" />
          <Card>
            <LeagueTable rows={DEMO_MINI_LEAGUE_ROWS} showOverallRank={false} />
          </Card>
        </YStack>
        <YStack flex={1} minWidth={0}>
          <SectionHeader title="Price Changes · Tomorrow" />
          <Card>
            {DEMO_PRICE_ROWS.map((p, i) => (
              <PriceRow
                key={p.name}
                index={i + 1}
                name={p.name}
                club={p.club}
                flow={p.flow}
                value={p.value}
                probability={p.probability}
                last={i === DEMO_PRICE_ROWS.length - 1}
              />
            ))}
          </Card>
        </YStack>
      </XStack>

      <FNote>
        Data via Fantasy Premier League API · Updates every 60s during live gameweeks
        {'\n'}SimplyFPL is not affiliated with the Premier League or Fantasy Premier League
      </FNote>
    </PageShell>
  );
}
