import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { YStack } from 'tamagui';

import { colors } from '../../theme';
import { buildPitchGeometry } from './pitch-background-geometry';

const GEO = buildPitchGeometry();
const VIEW_BOX = `0 0 ${GEO.viewBox.width} ${GEO.viewBox.height}`;

const LINE_COLOR = colors.inverse;
const LINE_WIDTH = 3;
const LINE_OPACITY = 0.5;
const STRIPE_LIGHT = colors.overlay1;

export function PitchBackground() {
  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      overflow="hidden"
      zIndex={0}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="sfpl-pitch-flood" cx="0.85" cy="-0.1" r="1.25">
            <Stop offset="0%" stopColor={colors.stadium1} />
            <Stop offset="42%" stopColor={colors.stadium2} />
            <Stop offset="78%" stopColor={colors.stadium3} />
            <Stop offset="100%" stopColor={colors.stadium4} />
          </RadialGradient>
          <RadialGradient id="sfpl-pitch-darken" cx="0.5" cy="0.46" r="0.78">
            <Stop offset="0%" stopColor={colors.stadium4} stopOpacity={0.62} />
            <Stop offset="55%" stopColor={colors.stadium4} stopOpacity={0.32} />
            <Stop offset="100%" stopColor={colors.stadium4} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Rect
          x={0}
          y={0}
          width={GEO.viewBox.width}
          height={GEO.viewBox.height}
          fill="url(#sfpl-pitch-flood)"
        />

        {GEO.stripes.map((stripe) =>
          stripe.shade === 'light' ? (
            <Rect
              key={`stripe-${stripe.x}`}
              x={stripe.x}
              y={0}
              width={stripe.width}
              height={GEO.viewBox.height}
              fill={STRIPE_LIGHT}
            />
          ) : null
        )}

        <G fill="none" stroke={LINE_COLOR} strokeWidth={LINE_WIDTH} strokeOpacity={LINE_OPACITY}>
          <Rect x={GEO.field.x} y={GEO.field.y} width={GEO.field.width} height={GEO.field.height} />
          <Path
            d={`M ${GEO.centreLine.x1} ${GEO.centreLine.y1} L ${GEO.centreLine.x2} ${GEO.centreLine.y2}`}
          />
          <Circle cx={GEO.centreCircle.cx} cy={GEO.centreCircle.cy} r={GEO.centreCircle.r} />
          {GEO.penaltyAreas.map((rect) => (
            <Rect
              key={`pen-area-${rect.x}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
            />
          ))}
          {GEO.goalAreas.map((rect) => (
            <Rect
              key={`goal-area-${rect.x}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
            />
          ))}
          {GEO.goals.map((rect) => (
            <Rect
              key={`goal-${rect.x}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
            />
          ))}
          {GEO.penaltyArcs.map((arc) => (
            <Path key={`pen-arc-${arc.d}`} d={arc.d} />
          ))}
          {GEO.cornerArcs.map((arc) => (
            <Path key={`corner-${arc.d}`} d={arc.d} />
          ))}
        </G>

        <G fill={LINE_COLOR} fillOpacity={LINE_OPACITY}>
          <Circle cx={GEO.centreSpot.cx} cy={GEO.centreSpot.cy} r={GEO.centreSpot.r} />
          {GEO.penaltySpots.map((spot) => (
            <Circle key={`pen-spot-${spot.cx}`} cx={spot.cx} cy={spot.cy} r={spot.r} />
          ))}
        </G>

        <Rect
          x={0}
          y={0}
          width={GEO.viewBox.width}
          height={GEO.viewBox.height}
          fill="url(#sfpl-pitch-darken)"
        />
      </Svg>
    </YStack>
  );
}
