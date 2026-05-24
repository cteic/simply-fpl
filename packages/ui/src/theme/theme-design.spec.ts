import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { getThemeDesign } from './theme-design';
import type { ThemeDesign } from './theme-design';

const feature = await loadFeature('./src/theme/theme-design.feature');

describeFeature(feature, (f) => {
  f.Scenario('Stadium is a floodlit, vibrant design', ({ When, Then, And }) => {
    let design: ThemeDesign;
    When('the design for the "stadium" theme is resolved', () => {
      design = getThemeDesign('stadium');
    });
    Then('the hero variant is "floodlit"', () => {
      expect(design.hero).toBe('floodlit');
    });
    And('the stat-tile variant is "accent"', () => {
      expect(design.statTiles).toBe('accent');
    });
    And('the pitch header variant is "gradient"', () => {
      expect(design.pitchHeader).toBe('gradient');
    });
    And('the pitch uses a grass surface', () => {
      expect(design.pitchGrass).toBe(true);
    });
  });

  f.Scenario('Bold is a dark broadcast, high-contrast design', ({ When, Then, And }) => {
    let design: ThemeDesign;
    When('the design for the "bold" theme is resolved', () => {
      design = getThemeDesign('bold');
    });
    Then('the hero variant is "broadcast"', () => {
      expect(design.hero).toBe('broadcast');
    });
    And('the stat-tile variant is "grid"', () => {
      expect(design.statTiles).toBe('grid');
    });
    And('the pitch header variant is "border"', () => {
      expect(design.pitchHeader).toBe('border');
    });
    And('the pitch does not use a grass surface', () => {
      expect(design.pitchGrass).toBe(false);
    });
  });

  f.Scenario('Quiet is a Swiss-minimal design with a bare hero', ({ When, Then, And }) => {
    let design: ThemeDesign;
    When('the design for the "quiet" theme is resolved', () => {
      design = getThemeDesign('quiet');
    });
    Then('the hero variant is "bare"', () => {
      expect(design.hero).toBe('bare');
    });
    And('the stat-tile variant is "hairline"', () => {
      expect(design.statTiles).toBe('hairline');
    });
    And('the hero number is the lightest weight', () => {
      expect(design.heroNumberWeight).toBe('300');
    });
    And('the pitch header variant is "border"', () => {
      expect(design.pitchHeader).toBe('border');
    });
  });

  f.Scenario('The three themes are mutually distinct', ({ When, Then, And }) => {
    let designs: ThemeDesign[];
    When('all three theme designs are resolved', () => {
      designs = [getThemeDesign('stadium'), getThemeDesign('bold'), getThemeDesign('quiet')];
    });
    Then('no two themes share the same hero variant', () => {
      const heroes = designs.map((d) => d.hero);
      expect(new Set(heroes).size).toBe(heroes.length);
    });
    And('no two themes share the same stat-tile variant', () => {
      const tiles = designs.map((d) => d.statTiles);
      expect(new Set(tiles).size).toBe(tiles.length);
    });
  });
});
