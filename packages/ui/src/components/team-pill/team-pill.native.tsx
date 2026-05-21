import Svg, { Circle, Path } from 'react-native-svg';
import { Text, XStack, styled } from 'tamagui';

const ICON_COLOR = '#6B6B63';

const PillBase = styled(XStack, {
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 5,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '$borderStrong',
  backgroundColor: '$surface',
  pressStyle: { opacity: 0.7 },
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  fontWeight: '500',
  color: '$colorMuted',
});

interface TeamPillProps {
  teamId: string | number;
  onPress?: () => void;
}

export function TeamPill({ teamId, onPress }: TeamPillProps) {
  return (
    <PillBase onPress={onPress}>
      <Svg width={9} height={9} viewBox="0 0 9 9">
        <Circle cx={4.5} cy={4.5} r={3.5} stroke={ICON_COLOR} strokeWidth={1.1} fill="none" />
        <Path d="M4.5 2.5v2l1.2 1" stroke={ICON_COLOR} strokeWidth={1.1} strokeLinecap="round" />
      </Svg>
      <Label>Team ID: {teamId}</Label>
      <Svg width={9} height={9} viewBox="0 0 9 9">
        <Path d="M2.5 3.5l2 2 2-2" stroke={ICON_COLOR} strokeWidth={1.1} strokeLinecap="round" />
      </Svg>
    </PillBase>
  );
}
