'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { Card } from '../card';
import { LeagueTable } from '../league-table';
import type { LeagueTableRow } from '../league-table';

const Head = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: 13,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const Name = styled(Text, {
  fontFamily: '$body',
  fontSize: 13,
  fontWeight: '600',
  letterSpacing: '$4',
  color: '$color',
});

const Meta = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
  marginTop: 1,
});

const Badge = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '$positive',
  backgroundColor: '$positiveBg',
  borderWidth: 1,
  borderColor: '$positiveBorder',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 20,
});

interface LeagueCardProps {
  name: string;
  meta: string;
  rows: LeagueTableRow[];
  /**
   * Status chip, e.g. "Live". Omitted by default: the chip used to default to
   * "Live", so every league claimed to be live on a gameweek that had finished.
   */
  badge?: string | undefined;
  /** One line on where the manager stands against the rest of the league. */
  summary?: string | undefined;
  onRowClick?: (entryId: number) => void;
}

const Summary = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  color: '$color',
  paddingHorizontal: 16,
  paddingVertical: 9,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  backgroundColor: '$brandBg',
});

export function LeagueCard({ name, meta, rows, badge, summary, onRowClick }: LeagueCardProps) {
  return (
    <Card>
      <Head>
        <YStack flexShrink={1}>
          <Name>{name}</Name>
          <Meta>{meta}</Meta>
        </YStack>
        {badge ? <Badge>{badge}</Badge> : null}
      </Head>
      {summary ? <Summary>{summary}</Summary> : null}
      <LeagueTable rows={rows} {...(onRowClick !== undefined ? { onRowClick } : {})} />
    </Card>
  );
}
