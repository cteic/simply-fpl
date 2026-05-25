import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { buildPitchGeometry } from './pitch-background-geometry';
import type { PitchGeometry } from './pitch-background-geometry';

const feature = await loadFeature('./src/components/pitch-background/pitch-background.feature');

const EPSILON = 0.5;

function fieldCentre(geo: PitchGeometry): { cx: number; cy: number } {
  return { cx: geo.field.x + geo.field.width / 2, cy: geo.field.y + geo.field.height / 2 };
}

function requirePair<T>(items: T[]): [T, T] {
  const [first, second] = items;
  if (first === undefined || second === undefined) {
    throw new Error('expected exactly two markings (left and right ends)');
  }
  return [first, second];
}

describeFeature(feature, (f) => {
  f.Scenario('The builder produces a full set of regulation markings', ({ When, Then, And }) => {
    let geo: PitchGeometry;

    When('the pitch geometry is built', () => {
      geo = buildPitchGeometry();
    });
    Then('it has an outer boundary, halfway line, centre circle and centre spot', () => {
      expect(geo.field.width).toBeGreaterThan(0);
      expect(geo.field.height).toBeGreaterThan(0);
      expect(geo.centreLine.x1).toBe(geo.centreLine.x2);
      expect(geo.centreCircle.r).toBeGreaterThan(0);
      expect(geo.centreSpot.r).toBeGreaterThan(0);
    });
    And('it has a penalty area, goal area, penalty spot and penalty arc at each end', () => {
      expect(geo.penaltyAreas).toHaveLength(2);
      expect(geo.goalAreas).toHaveLength(2);
      expect(geo.penaltySpots).toHaveLength(2);
      expect(geo.penaltyArcs).toHaveLength(2);
    });
    And('it has an arc in all four corners', () => {
      expect(geo.cornerArcs).toHaveLength(4);
    });
  });

  f.Scenario('Both ends of the pitch mirror each other', ({ When, Then, And }) => {
    let geo: PitchGeometry;

    When('the pitch geometry is built', () => {
      geo = buildPitchGeometry();
    });
    Then('the penalty areas are mirrored across the halfway line', () => {
      const [left, right] = requirePair(geo.penaltyAreas);
      expect(left.width).toBeCloseTo(right.width);
      expect(left.height).toBeCloseTo(right.height);
      expect(left.y).toBeCloseTo(right.y);
      expect(left.x).toBeCloseTo(geo.field.x);
      expect(right.x + right.width).toBeCloseTo(geo.field.x + geo.field.width);
    });
    And('the goal areas are mirrored across the halfway line', () => {
      const [left, right] = requirePair(geo.goalAreas);
      expect(left.width).toBeCloseTo(right.width);
      expect(left.height).toBeCloseTo(right.height);
      expect(left.y).toBeCloseTo(right.y);
      expect(left.x).toBeCloseTo(geo.field.x);
      expect(right.x + right.width).toBeCloseTo(geo.field.x + geo.field.width);
    });
    And('the penalty spots are mirrored across the halfway line', () => {
      const { cx, cy } = fieldCentre(geo);
      const [left, right] = requirePair(geo.penaltySpots);
      expect(left.cy).toBeCloseTo(cy);
      expect(right.cy).toBeCloseTo(cy);
      expect(cx - left.cx).toBeCloseTo(right.cx - cx);
    });
  });

  f.Scenario('The kickoff markings sit on the centre of the pitch', ({ When, Then }) => {
    let geo: PitchGeometry;

    When('the pitch geometry is built', () => {
      geo = buildPitchGeometry();
    });
    Then('the centre circle, centre spot and halfway line share the pitch centre', () => {
      const { cx, cy } = fieldCentre(geo);
      expect(geo.centreCircle.cx).toBeCloseTo(cx);
      expect(geo.centreCircle.cy).toBeCloseTo(cy);
      expect(geo.centreSpot.cx).toBeCloseTo(cx);
      expect(geo.centreSpot.cy).toBeCloseTo(cy);
      expect(geo.centreLine.x1).toBeCloseTo(cx);
      expect(geo.centreLine.x2).toBeCloseTo(cx);
    });
  });

  f.Scenario('Mowing stripes tile the full width without gaps', ({ When, Then, And }) => {
    let geo: PitchGeometry;

    When('the pitch geometry is built', () => {
      geo = buildPitchGeometry();
    });
    Then('the stripes cover the whole width edge to edge with no gaps', () => {
      expect(geo.stripes.length).toBeGreaterThan(1);
      expect(geo.stripes.at(0)?.x).toBe(0);
      let cursor = 0;
      for (const stripe of geo.stripes) {
        expect(Math.abs(stripe.x - cursor)).toBeLessThanOrEqual(EPSILON);
        cursor = stripe.x + stripe.width;
      }
      expect(Math.abs(cursor - geo.viewBox.width)).toBeLessThanOrEqual(EPSILON);
    });
    And('the stripes alternate between two shades', () => {
      geo.stripes.forEach((stripe, index) => {
        if (index > 0) {
          expect(stripe.shade).not.toBe(geo.stripes.at(index - 1)?.shade);
        }
      });
    });
  });
});
