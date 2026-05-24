'use client';

import { YStack } from 'tamagui';

import { colors } from '../../theme';
import { buildPitchGeometry } from './pitch-background-geometry';

const GEO = buildPitchGeometry();
const VIEW_BOX = `0 0 ${GEO.viewBox.width} ${GEO.viewBox.height}`;

const LINE_COLOR = colors.inverse;
const LINE_WIDTH = 3;
const LINE_OPACITY = 0.5;
const STRIPE_LIGHT = colors.overlay1;
const STRIPE_DARK = colors.transparent;

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
      aria-hidden
    >
      <svg
        width="100%"
        height="100%"
        viewBox={VIEW_BOX}
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
        focusable="false"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <radialGradient id="sfpl-pitch-flood" cx="0.85" cy="-0.1" r="1.25">
            <stop offset="0%" stopColor={colors.stadium1} />
            <stop offset="42%" stopColor={colors.stadium2} />
            <stop offset="78%" stopColor={colors.stadium3} />
            <stop offset="100%" stopColor={colors.stadium4} />
          </radialGradient>
          <radialGradient id="sfpl-pitch-darken" cx="0.5" cy="0.46" r="0.78">
            <stop offset="0%" stopColor={colors.stadium4} stopOpacity={0.62} />
            <stop offset="55%" stopColor={colors.stadium4} stopOpacity={0.32} />
            <stop offset="100%" stopColor={colors.stadium4} stopOpacity={0} />
          </radialGradient>
        </defs>

        <rect
          x={0}
          y={0}
          width={GEO.viewBox.width}
          height={GEO.viewBox.height}
          fill="url(#sfpl-pitch-flood)"
        />

        {GEO.stripes.map((stripe) => (
          <rect
            key={`stripe-${stripe.x}`}
            x={stripe.x}
            y={0}
            width={stripe.width}
            height={GEO.viewBox.height}
            fill={stripe.shade === 'light' ? STRIPE_LIGHT : STRIPE_DARK}
          />
        ))}

        <g fill="none" stroke={LINE_COLOR} strokeWidth={LINE_WIDTH} strokeOpacity={LINE_OPACITY}>
          <rect x={GEO.field.x} y={GEO.field.y} width={GEO.field.width} height={GEO.field.height} />
          <line
            x1={GEO.centreLine.x1}
            y1={GEO.centreLine.y1}
            x2={GEO.centreLine.x2}
            y2={GEO.centreLine.y2}
          />
          <circle cx={GEO.centreCircle.cx} cy={GEO.centreCircle.cy} r={GEO.centreCircle.r} />
          {GEO.penaltyAreas.map((rect) => (
            <rect
              key={`pen-area-${rect.x}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
            />
          ))}
          {GEO.goalAreas.map((rect) => (
            <rect
              key={`goal-area-${rect.x}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
            />
          ))}
          {GEO.goals.map((rect) => (
            <rect
              key={`goal-${rect.x}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
            />
          ))}
          {GEO.penaltyArcs.map((arc) => (
            <path key={`pen-arc-${arc.d}`} d={arc.d} />
          ))}
          {GEO.cornerArcs.map((arc) => (
            <path key={`corner-${arc.d}`} d={arc.d} />
          ))}
        </g>

        <g fill={LINE_COLOR} fillOpacity={LINE_OPACITY}>
          <circle cx={GEO.centreSpot.cx} cy={GEO.centreSpot.cy} r={GEO.centreSpot.r} />
          {GEO.penaltySpots.map((spot) => (
            <circle key={`pen-spot-${spot.cx}`} cx={spot.cx} cy={spot.cy} r={spot.r} />
          ))}
        </g>

        <rect
          x={0}
          y={0}
          width={GEO.viewBox.width}
          height={GEO.viewBox.height}
          fill="url(#sfpl-pitch-darken)"
        />
      </svg>
    </YStack>
  );
}
