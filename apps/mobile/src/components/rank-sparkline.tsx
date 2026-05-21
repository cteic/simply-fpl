import Svg, { Circle, Polyline } from 'react-native-svg';

import { YStack } from '@simplyfpl/ui';

const DEFAULT_POINTS = '0,33 57,34 114,28 171,30 228,19 285,21 342,10 400,6';

interface RankSparklineProps {
  points?: string;
  height?: number;
}

// Native equivalent of the web rank-trajectory <svg>. Uses react-native-svg
// rather than a raw <svg> element (which only exists in the DOM).
export function RankSparkline({ points = DEFAULT_POINTS, height = 40 }: RankSparklineProps) {
  return (
    <YStack height={height} marginTop={14}>
      <Svg width="100%" height="100%" viewBox="0 0 400 40" preserveAspectRatio="none">
        <Polyline
          points={points}
          fill="none"
          stroke="#5EEAD4"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={400} cy={6} r={3.4} fill="#FFFFFF" stroke="#34D399" strokeWidth={2} />
      </Svg>
    </YStack>
  );
}
