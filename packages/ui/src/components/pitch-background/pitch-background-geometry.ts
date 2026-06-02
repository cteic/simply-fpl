/**
 * Football-pitch geometry
 * ------------------------
 * Pure builder for the regulation pitch markings rendered by
 * `PitchBackground`. Keeping the geometry here (no React, no SVG) lets the
 * component stay a thin renderer and lets the layout be unit-tested:
 * mirroring, a centred kickoff and gap-free mowing stripes.
 *
 * Dimensions follow the IFAB regulation pitch in metres, scaled to SVG
 * units. The pitch is drawn landscape (goals left/right) with a small
 * run-off margin so corner arcs are not clipped.
 */
const SCALE = 9;
const MARGIN_M = 4;
const SPOT_R_M = 0.4;
const CORNER_R_M = 1;
const STRIPE_COUNT = 16;

const PITCH_SPEC = {
  lengthM: 105,
  widthM: 68,
  centreCircleM: 9.15,
  penaltyDepthM: 16.5,
  penaltyWidthM: 40.32,
  goalAreaDepthM: 5.5,
  goalAreaWidthM: 18.32,
  penaltySpotM: 11,
  penaltyArcM: 9.15,
  goalWidthM: 7.32,
  goalDepthM: 2,
} as const;

export interface PitchRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PitchCircle {
  cx: number;
  cy: number;
  r: number;
}

export interface PitchLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PitchArc {
  d: string;
}

export type PitchStripeShade = 'light' | 'dark';

export interface PitchStripe {
  x: number;
  width: number;
  shade: PitchStripeShade;
}

export interface PitchGeometry {
  viewBox: { width: number; height: number };
  field: PitchRect;
  centreLine: PitchLine;
  centreCircle: PitchCircle;
  centreSpot: PitchCircle;
  penaltyAreas: PitchRect[];
  goalAreas: PitchRect[];
  goals: PitchRect[];
  penaltySpots: PitchCircle[];
  penaltyArcs: PitchArc[];
  cornerArcs: PitchArc[];
  stripes: PitchStripe[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildPitchGeometry(): PitchGeometry {
  const margin = MARGIN_M * SCALE;
  const fieldWidth = PITCH_SPEC.lengthM * SCALE;
  const fieldHeight = PITCH_SPEC.widthM * SCALE;

  const viewWidth = fieldWidth + margin * 2;
  const viewHeight = fieldHeight + margin * 2;

  const left = margin;
  const top = margin;
  const right = left + fieldWidth;
  const bottom = top + fieldHeight;
  const cx = left + fieldWidth / 2;
  const cy = top + fieldHeight / 2;

  const field: PitchRect = { x: left, y: top, width: fieldWidth, height: fieldHeight };

  const centreLine: PitchLine = { x1: cx, y1: top, x2: cx, y2: bottom };
  const centreCircle: PitchCircle = { cx, cy, r: PITCH_SPEC.centreCircleM * SCALE };
  const centreSpot: PitchCircle = { cx, cy, r: SPOT_R_M * SCALE };

  const penaltyDepth = PITCH_SPEC.penaltyDepthM * SCALE;
  const penaltyHeight = PITCH_SPEC.penaltyWidthM * SCALE;
  const penaltyAreas: PitchRect[] = [
    { x: left, y: cy - penaltyHeight / 2, width: penaltyDepth, height: penaltyHeight },
    {
      x: right - penaltyDepth,
      y: cy - penaltyHeight / 2,
      width: penaltyDepth,
      height: penaltyHeight,
    },
  ];

  const goalAreaDepth = PITCH_SPEC.goalAreaDepthM * SCALE;
  const goalAreaHeight = PITCH_SPEC.goalAreaWidthM * SCALE;
  const goalAreas: PitchRect[] = [
    { x: left, y: cy - goalAreaHeight / 2, width: goalAreaDepth, height: goalAreaHeight },
    {
      x: right - goalAreaDepth,
      y: cy - goalAreaHeight / 2,
      width: goalAreaDepth,
      height: goalAreaHeight,
    },
  ];

  const goalDepth = PITCH_SPEC.goalDepthM * SCALE;
  const goalHeight = PITCH_SPEC.goalWidthM * SCALE;
  const goals: PitchRect[] = [
    { x: left - goalDepth, y: cy - goalHeight / 2, width: goalDepth, height: goalHeight },
    { x: right, y: cy - goalHeight / 2, width: goalDepth, height: goalHeight },
  ];

  const penaltySpotDist = PITCH_SPEC.penaltySpotM * SCALE;
  const penaltySpots: PitchCircle[] = [
    { cx: left + penaltySpotDist, cy, r: SPOT_R_M * SCALE },
    { cx: right - penaltySpotDist, cy, r: SPOT_R_M * SCALE },
  ];

  const arcR = PITCH_SPEC.penaltyArcM * SCALE;
  const arcDx = penaltyDepth - penaltySpotDist;
  const arcDy = Math.sqrt(Math.max(arcR * arcR - arcDx * arcDx, 0));
  const arcTopY = round(cy - arcDy);
  const arcBottomY = round(cy + arcDy);
  const leftArcX = round(left + penaltyDepth);
  const rightArcX = round(right - penaltyDepth);
  const penaltyArcs: PitchArc[] = [
    { d: `M ${leftArcX} ${arcTopY} A ${arcR} ${arcR} 0 0 1 ${leftArcX} ${arcBottomY}` },
    { d: `M ${rightArcX} ${arcTopY} A ${arcR} ${arcR} 0 0 0 ${rightArcX} ${arcBottomY}` },
  ];

  const cornerR = CORNER_R_M * SCALE;
  const cornerArcs: PitchArc[] = [
    { d: `M ${left + cornerR} ${top} A ${cornerR} ${cornerR} 0 0 1 ${left} ${top + cornerR}` },
    { d: `M ${right} ${top + cornerR} A ${cornerR} ${cornerR} 0 0 1 ${right - cornerR} ${top}` },
    {
      d: `M ${right - cornerR} ${bottom} A ${cornerR} ${cornerR} 0 0 1 ${right} ${bottom - cornerR}`,
    },
    {
      d: `M ${left} ${bottom - cornerR} A ${cornerR} ${cornerR} 0 0 1 ${left + cornerR} ${bottom}`,
    },
  ];

  const stripeWidth = viewWidth / STRIPE_COUNT;
  const stripes: PitchStripe[] = Array.from({ length: STRIPE_COUNT }, (_, index) => ({
    x: round(index * stripeWidth),
    width: round(stripeWidth),
    shade: index % 2 === 0 ? 'light' : 'dark',
  }));

  return {
    viewBox: { width: viewWidth, height: viewHeight },
    field,
    centreLine,
    centreCircle,
    centreSpot,
    penaltyAreas,
    goalAreas,
    goals,
    penaltySpots,
    penaltyArcs,
    cornerArcs,
    stripes,
  };
}
