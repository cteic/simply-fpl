'use client';

import { Stack, Text, XStack, YStack, styled } from 'tamagui';

const TableRoot = styled(YStack, {
  width: '100%',
});

const HeaderRow = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const HeaderCell = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
});

const Row = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  cursor: 'pointer',
  animation: 'fast',
  hoverStyle: { backgroundColor: '$background' },
  variants: {
    you: {
      true: {
        backgroundColor: '$youRow',
        hoverStyle: { backgroundColor: '$youRowHover' },
      },
    },
    last: {
      true: { borderBottomWidth: 0 },
    },
  } as const,
});

const Position = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11,
  color: '$colorSubtle',
});

const Manager = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  fontWeight: '500',
  letterSpacing: '$5',
  color: '$color',
});

const TeamName = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorSubtle',
  marginTop: 1,
});

const YouTag = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '$info',
  backgroundColor: '$infoBg',
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 3,
  marginLeft: 5,
});

const MonoCell = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12.5,
  color: '$color',
  textAlign: 'right',
  variants: {
    look: {
      muted: { color: '$colorMuted' },
      strong: { fontWeight: '500' },
      amber: { color: '$warning' },
      subtle: { color: '$colorSubtle' },
    },
  } as const,
});

export interface LeagueTableRow {
  position: number;
  managerName: string;
  teamName?: string;
  isYou?: boolean;
  entryId?: number;
  gwScore: number | string;
  totalPoints: number | string;
  overallRank?: number | string;
  remaining?: number;
}

interface LeagueTableProps {
  rows: LeagueTableRow[];
  showOverallRank?: boolean;
  onRowClick?: (entryId: number) => void;
}

export function LeagueTable({ rows, showOverallRank = false, onRowClick }: LeagueTableProps) {
  return (
    <TableRoot>
      <HeaderRow>
        <Stack width={28}>
          <HeaderCell>#</HeaderCell>
        </Stack>
        <Stack flex={1}>
          <HeaderCell>Manager</HeaderCell>
        </Stack>
        <Stack width={50} alignItems="flex-end">
          <HeaderCell>GW</HeaderCell>
        </Stack>
        <Stack width={70} alignItems="flex-end">
          <HeaderCell>Pts</HeaderCell>
        </Stack>
        {showOverallRank ? (
          <Stack width={60} alignItems="flex-end">
            <HeaderCell>OR</HeaderCell>
          </Stack>
        ) : null}
        <Stack width={50} alignItems="flex-end">
          <HeaderCell>Rem</HeaderCell>
        </Stack>
      </HeaderRow>
      {rows.map((row, idx) => {
        const isLast = idx === rows.length - 1;
        const remTone: 'amber' | 'subtle' = (row.remaining ?? 0) > 0 ? 'amber' : 'subtle';
        const canClick = onRowClick !== undefined && row.entryId !== undefined && !row.isYou;
        return (
          <Row
            key={`${row.position}-${row.managerName}`}
            you={row.isYou}
            last={isLast}
            onPress={
              canClick
                ? () => {
                    if (row.entryId !== undefined) onRowClick(row.entryId);
                  }
                : undefined
            }
          >
            <Stack width={28}>
              <Position>{row.position}</Position>
            </Stack>
            <Stack flex={1}>
              <XStack alignItems="center">
                <Manager>{row.managerName}</Manager>
                {row.isYou ? <YouTag>You</YouTag> : null}
              </XStack>
              {row.teamName ? <TeamName>{row.teamName}</TeamName> : null}
            </Stack>
            <Stack width={50} alignItems="flex-end">
              <MonoCell look="muted">{row.gwScore}</MonoCell>
            </Stack>
            <Stack width={70} alignItems="flex-end">
              <MonoCell look="strong">{row.totalPoints}</MonoCell>
            </Stack>
            {showOverallRank ? (
              <Stack width={60} alignItems="flex-end">
                <MonoCell look="muted">{row.overallRank ?? '—'}</MonoCell>
              </Stack>
            ) : null}
            <Stack width={50} alignItems="flex-end">
              <MonoCell look={remTone}>{row.remaining ?? 0}</MonoCell>
            </Stack>
          </Row>
        );
      })}
    </TableRoot>
  );
}
