import { Text, XStack, styled } from 'tamagui';

import { t } from '@simplyfpl/i18n';

const Pill = styled(XStack, {
  alignItems: 'center',
  gap: 6,
  backgroundColor: '$surface',
  borderColor: '$borderStrong',
  borderWidth: 1,
  paddingHorizontal: 10,
  paddingVertical: 3,
  borderRadius: '$7',
  pressStyle: { opacity: 0.8 },
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '500',
  letterSpacing: '$9',
  textTransform: 'uppercase',
  color: '$colorMuted',
});

const Value = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12,
  fontWeight: '500',
  color: '$color',
});

interface LiveRankPillProps {
  rank: number | null;
  href?: string;
  onPress?: () => void;
}

export function LiveRankPill({ rank, onPress }: LiveRankPillProps) {
  return (
    <Pill onPress={onPress}>
      <Label>{t('shared.rank')}</Label>
      <Value>{rank === null ? '—' : rank.toLocaleString()}</Value>
    </Pill>
  );
}
