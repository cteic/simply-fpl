import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { resolveAdSlotState } from './ad-slot-state';
import type { AdSlotState } from './ad-slot-state';

const feature = await loadFeature('./src/components/ad-slot/ad-slot-state.feature');

describeFeature(feature, (f) => {
  f.Scenario('Both flags off — slot is hidden', ({ Given, When, Then }) => {
    let result: AdSlotState;

    Given('both NEXT_PUBLIC_FEATURE_ADS and NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS are unset', () => {
      delete process.env['NEXT_PUBLIC_FEATURE_ADS'];
      delete process.env['NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS'];
    });
    When('resolveAdSlotState is called', () => {
      result = resolveAdSlotState();
    });
    Then('the state is "hidden"', () => {
      expect(result).toBe('hidden');
    });
  });

  f.Scenario('Placeholder flag on, ads flag off — spacer shown', ({ Given, When, Then }) => {
    let result: AdSlotState;

    Given('NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS is "true" and NEXT_PUBLIC_FEATURE_ADS is unset', () => {
      delete process.env['NEXT_PUBLIC_FEATURE_ADS'];
      process.env['NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS'] = 'true';
    });
    When('resolveAdSlotState is called', () => {
      result = resolveAdSlotState();
    });
    Then('the state is "placeholder"', () => {
      expect(result).toBe('placeholder');
    });
  });

  f.Scenario('Ads flag on — slot is active', ({ Given, When, Then }) => {
    let result: AdSlotState;

    Given('NEXT_PUBLIC_FEATURE_ADS is "true"', () => {
      process.env['NEXT_PUBLIC_FEATURE_ADS'] = 'true';
    });
    When('resolveAdSlotState is called', () => {
      result = resolveAdSlotState();
    });
    Then('the state is "active"', () => {
      expect(result).toBe('active');
    });
  });
});
