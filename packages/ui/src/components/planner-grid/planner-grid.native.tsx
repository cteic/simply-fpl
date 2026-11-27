import { styled, Text, XStack, YStack } from 'tamagui';

import { t } from '@simplyfpl/i18n';

import type { PlannerGwCell, PlannerPlayer } from './planner-grid.types';

/**
 * Native planner layout.
 *
 * The web grid is CSS Grid (`display: grid`), which React Native does not
 * support, so on native the five gameweek columns collapsed into a flex row
 * and squeezed every name down to a character or two. It also repeated the
 * same XI once per column.
 *
 * Native instead uses the familiar fixture-ticker shape: one row per player,
 * the name written once, and a difficulty chip per gameweek across the row.
 * That reads at phone width and leaves room for the opponent.
 */

const Frame = styled(YStack, {
  borderWidth: 1,
  borderColor: '$border',
  borderRadius: '$6',
  backgroundColor: '$surface',
  overflow: 'hidden',
});

const HeaderRow = styled(XStack, {
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  backgroundColor: '$background',
});

const HeaderLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  color: '$colorSubtle',
});

const Row = styled(XStack, {
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

const Dot = styled(YStack, {
  width: 6,
  height: 6,
  borderRadius: 999,
  flexShrink: 0,
  marginRight: 6,
  variants: {
    form: {
      good: { backgroundColor: '$positive' },
      avg: { backgroundColor: '$info' },
      warning: { backgroundColor: '$warning' },
      bad: { backgroundColor: '$negative' },
      none: { backgroundColor: '$borderStrong' },
    },
  } as const,
});

const Name = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  fontWeight: '500',
  color: '$color',
  numberOfLines: 1,
  ellipsizeMode: 'tail',
});

const Chip = styled(YStack, {
  flex: 1,
  marginLeft: 3,
  paddingVertical: 4,
  borderRadius: 4,
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    fdr: {
      1: { backgroundColor: '$fdr1' },
      2: { backgroundColor: '$fdr2' },
      3: { backgroundColor: '$fdr3' },
      4: { backgroundColor: '$fdr4' },
      5: { backgroundColor: '$fdr5' },
    },
    blank: { true: { backgroundColor: '$borderStrong' } },
  } as const,
});

const ChipText = styled(Text, {
  fontFamily: '$mono',
  fontSize: 9,
  fontWeight: '500',
  color: '$surface',
  numberOfLines: 1,
});

// Name column takes a fixed share so the chips line up into columns.
const NAME_WIDTH = 104;

interface PlannerGridProps {
  cells: PlannerGwCell[];
}

/** "BHA (H)" -> "BHA". Blank and double gameweeks get their own marker. */
function chipLabel(player: PlannerPlayer): string {
  if (player.blank === true) return '—';
  const opponent = player.opponent;
  if (opponent === undefined || opponent === '') return String(player.fdr);
  const first = opponent.split(' ')[0] ?? opponent;
  return player.doubleGameweek === true ? `${first}+` : first;
}

export function PlannerGrid({ cells }: PlannerGridProps) {
  const first = cells[0];
  if (!first) return null;

  // Every cell lists the same XI in the same order, so index i is one player
  // across all gameweeks.
  const rows = first.players.map((player, index) => ({
    player,
    perGameweek: cells.map((cell) => cell.players[index]),
  }));

  return (
    <Frame>
      <HeaderRow>
        <YStack width={NAME_WIDTH}>
          <HeaderLabel>{t('planner.col_player')}</HeaderLabel>
        </YStack>
        {cells.map((cell, index) => (
          <YStack key={`${cell.label}-${index}`} flex={1} marginLeft={3} alignItems="center">
            {/* "GW12 · DGW" would not fit a chip column, so show the number only. */}
            <HeaderLabel>{cell.label.split(' ')[0]}</HeaderLabel>
          </YStack>
        ))}
      </HeaderRow>

      {rows.map((row, rowIndex) => (
        <Row key={`${row.player.name}-${rowIndex}`} last={rowIndex === rows.length - 1}>
          <XStack width={NAME_WIDTH} alignItems="center">
            <Dot form={row.player.form} />
            <Name>{row.player.name}</Name>
          </XStack>
          {row.perGameweek.map((cellPlayer, gwIndex) => {
            if (!cellPlayer) {
              return <Chip key={gwIndex} blank />;
            }
            return (
              <Chip
                key={gwIndex}
                {...(cellPlayer.blank === true ? { blank: true } : { fdr: cellPlayer.fdr })}
              >
                <ChipText>{chipLabel(cellPlayer)}</ChipText>
              </Chip>
            );
          })}
        </Row>
      ))}
    </Frame>
  );
}
