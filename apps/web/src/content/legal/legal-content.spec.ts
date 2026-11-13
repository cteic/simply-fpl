import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { LegalSection } from '@simplyfpl/ui';

import { SUPPORT_EMAIL } from './constants';
import { PRIVACY_POLICY_SECTIONS } from './privacy-policy';
import { SUPPORT_CONTACT_BODY, SUPPORT_FAQ_SECTIONS } from './support';
import { TERMS_OF_SERVICE_SECTIONS } from './terms-of-service';

const feature = await loadFeature('./legal-content.feature');

function flatten(sections: LegalSection[]): string {
  return sections
    .flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])])
    .join('\n');
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'The privacy policy names every data processor and a contact',
    ({ Given, Then, And }) => {
      let text = '';

      Given('the privacy policy content', () => {
        text = flatten(PRIVACY_POLICY_SECTIONS);
      });

      Then('it mentions each of {string}', (_ctx, names: string) => {
        for (const name of names.split(',').map((n) => n.trim())) {
          expect(text, `privacy policy should mention ${name}`).toContain(name);
        }
      });

      And('it gives the support email address', () => {
        expect(text).toContain(SUPPORT_EMAIL);
      });

      And('it explains how to delete an account', () => {
        expect(text).toMatch(/delete your account/i);
      });
    }
  );

  Scenario(
    'The terms name Irish law, the payment provider and the accuracy limit',
    ({ Given, Then, And }) => {
      let text = '';

      Given('the terms of service content', () => {
        text = flatten(TERMS_OF_SERVICE_SECTIONS);
      });

      Then('it mentions each of {string}', (_ctx, names: string) => {
        for (const name of names.split(',').map((n) => n.trim())) {
          expect(text, `terms should mention ${name}`).toContain(name);
        }
      });

      And('it says live rank figures are estimates', () => {
        expect(text).toMatch(/live rank[^.]*estimates/i);
      });

      And('it gives the support email address', () => {
        expect(text).toContain(SUPPORT_EMAIL);
      });
    }
  );

  Scenario('The support page gives a contact and a short FAQ', ({ Given, Then, And }) => {
    let faq: LegalSection[] = [];

    Given('the support FAQ content', () => {
      faq = SUPPORT_FAQ_SECTIONS;
    });

    Then('it has between 3 and 5 entries', () => {
      expect(faq.length).toBeGreaterThanOrEqual(3);
      expect(faq.length).toBeLessThanOrEqual(5);
    });

    And('every entry has a question and an answer', () => {
      for (const entry of faq) {
        expect(entry.heading).toMatch(/\?$/);
        expect(entry.paragraphs.join('').length).toBeGreaterThan(40);
      }
    });

    And('the contact instructions give the support email address', () => {
      expect(SUPPORT_CONTACT_BODY).toContain(SUPPORT_EMAIL);
    });
  });
});
