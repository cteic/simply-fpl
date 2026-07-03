import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { statTileToneStyle } from './stat-tile-tone';
import type { StatTileTone, StatTileToneStyle } from './stat-tile-tone';

const feature = await loadFeature('./src/components/stat-tile/stat-tile.feature');

const ALL_TONES: StatTileTone[] = ['positive', 'brand', 'warning', 'neutral', 'negative'];

describeFeature(feature, (f) => {
  function toneScenario(
    name: string,
    tone: StatTileTone,
    expectedSurface: string,
    expectedBorder: string
  ) {
    f.Scenario(name, ({ When, Then, And }) => {
      let style: StatTileToneStyle;
      When(`the tile tone is "${tone}"`, () => {
        style = statTileToneStyle(tone);
      });
      Then(`the tile surface is "${expectedSurface}"`, () => {
        expect(style.backgroundColor).toBe(expectedSurface);
      });
      And(`the tile accent border is "${expectedBorder}"`, () => {
        expect(style.borderLeftColor).toBe(expectedBorder);
      });
    });
  }

  toneScenario(
    'Positive tiles get the positive tint and accent',
    'positive',
    '$positiveBg',
    '$positive'
  );
  toneScenario('Brand tiles get the brand tint and accent', 'brand', '$brandBg', '$brand');
  toneScenario(
    'Warning tiles get the warning tint and accent',
    'warning',
    '$warningBg',
    '$warning'
  );
  toneScenario(
    'Neutral tiles stay on surface with a strong border',
    'neutral',
    '$surface',
    '$borderStrong'
  );
  toneScenario(
    'Negative tiles stay on surface to avoid reading as an error',
    'negative',
    '$surface',
    '$negative'
  );

  f.Scenario('Every tile uses tokenised colours only', ({ When, Then }) => {
    let styles: StatTileToneStyle[];
    When('every tile tone is mapped', () => {
      styles = ALL_TONES.map(statTileToneStyle);
    });
    Then('no mapped colour is a bespoke hex value', () => {
      for (const style of styles) {
        expect(style.backgroundColor.startsWith('$')).toBe(true);
        expect(style.borderLeftColor.startsWith('$')).toBe(true);
      }
    });
  });
});
