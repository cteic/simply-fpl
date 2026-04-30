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
  badge?: string;
  showOverallRank?: boolean;
}

export function LeagueCard({
  name,
  meta,
  rows,
  badge = 'Live',
  showOverallRank = true,
}: LeagueCardProps) {
  return (
    <Card>
      <Head>
        <YStack>
          <Name>{name}</Name>
          <Meta>{meta}</Meta>
        </YStack>
        <Badge>{badge}</Badge>
      </Head>
      <LeagueTable rows={rows} showOverallRank={showOverallRank} />
    </Card>
  );
}
