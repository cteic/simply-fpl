'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

const TableRoot = styled(YStack, {
  width: '100%',
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: '$border',
});

const HeaderRow = styled(XStack, {
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  alignItems: 'center',
});

const Row = styled(XStack, {
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  alignItems: 'center',
  variants: {
    last: {
      true: { borderBottomWidth: 0 },
    },
  } as const,
});

const HeaderCell = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
});

const RowLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 11.5,
  fontWeight: '500',
  color: '$color',
});

const NumberCell = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12.5,
  color: '$color',
  textAlign: 'right',
  variants: {
    look: {
      you: { fontWeight: '600' },
      muted: { color: '$colorMuted' },
    },
  } as const,
});

const Footer = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorSubtle',
  marginTop: 8,
  paddingHorizontal: 12,
});

export interface CohortTableRow {
  label: string;
  you: string | number;
  top10k: string | number;
  overall: string | number;
  legendary: string | number;
}

interface CohortTableProps {
  rows: CohortTableRow[];
  footer?: string;
}

export function CohortTable({ rows, footer }: CohortTableProps) {
  return (
    <YStack>
      <TableRoot>
        <HeaderRow>
          <YStack flex={1.4}>
            <HeaderCell> </HeaderCell>
          </YStack>
          <YStack flex={1} alignItems="flex-end">
            <HeaderCell>You</HeaderCell>
          </YStack>
          <YStack flex={1} alignItems="flex-end">
            <HeaderCell>Top 10k</HeaderCell>
          </YStack>
          <YStack flex={1} alignItems="flex-end">
            <HeaderCell>Overall</HeaderCell>
          </YStack>
          <YStack flex={1} alignItems="flex-end">
            <HeaderCell>Top 1k</HeaderCell>
          </YStack>
        </HeaderRow>
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          return (
            <Row key={row.label} last={isLast}>
              <YStack flex={1.4}>
                <RowLabel>{row.label}</RowLabel>
              </YStack>
              <YStack flex={1} alignItems="flex-end">
                <NumberCell look="you">{row.you}</NumberCell>
              </YStack>
              <YStack flex={1} alignItems="flex-end">
                <NumberCell>{row.top10k}</NumberCell>
              </YStack>
              <YStack flex={1} alignItems="flex-end">
                <NumberCell look="muted">{row.overall}</NumberCell>
              </YStack>
              <YStack flex={1} alignItems="flex-end">
                <NumberCell>{row.legendary}</NumberCell>
              </YStack>
            </Row>
          );
        })}
      </TableRoot>
      {footer ? <Footer>{footer}</Footer> : null}
    </YStack>
  );
}
