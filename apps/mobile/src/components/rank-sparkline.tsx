import Svg, { Circle, Polyline } from 'react-native-svg';

import { YStack } from '@simplyfpl/ui';

export const SPARKLINE_WIDTH = 400;
export const SPARKLINE_HEIGHT = 28;

interface RankSparklineProps {
  /** SVG polyline points for the manager's real rank after each gameweek. */
  points: string;
  height?: number;
}

// Native equivalent of the web rank-trajectory <svg>. Uses react-native-svg
// rather than a raw <svg> element (which only exists in the DOM).
export function RankSparkline({ points, height = SPARKLINE_HEIGHT }: RankSparklineProps) {
  const last = points.split(' ').pop() ?? '';
  const [lastX, lastY] = last.split(',').map(Number);
  return (
    <YStack height={height} marginTop={8}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <Polyline
          points={points}
          fill="none"
          stroke="#5EEAD4"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {Number.isFinite(lastX) && Number.isFinite(lastY) ? (
          <Circle cx={lastX} cy={lastY} r={3} fill="#FFFFFF" stroke="#34D399" strokeWidth={2} />
        ) : null}
      </Svg>
    </YStack>
  );
}
