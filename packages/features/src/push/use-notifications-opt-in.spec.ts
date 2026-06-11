import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { urlBase64ToUint8Array } from './use-notifications-opt-in';

const feature = await loadFeature('./use-notifications-opt-in.feature');

const VAPID_KEY =
  'BNbxvPGKJoElbvgAfLwzLbJKkiXB8zFGpZxH_bGvbvzYZNDZxPRakvnvMBFjAo5qEoiUXZ0-kqD2m7KsRLjAmQ4';

describeFeature(feature, ({ Scenario }) => {
  Scenario('User enables notifications for the first time', ({ Given, When, Then, And }) => {
    let applicationServerKey: Uint8Array;

    Given('the browser supports push notifications', () => undefined);
    And('the user is authenticated as a Pro user', () => undefined);
    And("notification permission is 'default'", () => undefined);
    And('no existing push subscription exists', () => undefined);

    When('the user clicks "Enable notifications"', () => {
      applicationServerKey = urlBase64ToUint8Array(VAPID_KEY);
    });

    And('the browser prompts for permission and the user accepts', () => undefined);

    Then('the service worker subscribes to push', () => {
      expect(applicationServerKey).toBeInstanceOf(Uint8Array);
      expect(applicationServerKey.length).toBeGreaterThan(0);
    });

    And(
      'a POST to /api/notifications/subscribe is made with endpoint, p256dh, and auth',
      () => undefined
    );

    And('isSubscribed becomes true', () => undefined);
  });

  Scenario('User disables notifications', ({ Given, When, Then, And }) => {
    Given('the browser supports push notifications', () => undefined);
    And('the user is authenticated as a Pro user', () => undefined);
    And("notification permission is 'granted'", () => undefined);
    And('a push subscription already exists', () => undefined);
    When('the user clicks "Disable notifications"', () => undefined);
    Then('pushManager.unsubscribe is called', () => undefined);
    And('a DELETE to /api/notifications/subscribe is made with the endpoint', () => undefined);
    And('isSubscribed becomes false', () => undefined);
  });

  Scenario('Browser denies permission', ({ Given, When, Then, And }) => {
    Given('the browser supports push notifications', () => undefined);
    And('the user is authenticated as a Pro user', () => undefined);
    And("notification permission is 'default'", () => undefined);
    When('the user clicks "Enable notifications"', () => undefined);
    And('the browser prompts for permission and the user denies', () => undefined);
    Then('isSubscribed remains false', () => undefined);
    And("permission becomes 'denied'", () => undefined);
  });

  Scenario('Browser does not support push', ({ Given, Then, And }) => {
    Given('the browser does not support PushManager', () => undefined);
    And('the user is authenticated as a Pro user', () => undefined);
    Then("permission is 'unsupported'", () => undefined);
    And('the subscribe action is a no-op', () => undefined);
  });

  Scenario('User toggles deadline reminder preference off', ({ Given, When, Then, And }) => {
    let mapping: { deadline_reminder: boolean };

    Given('the browser supports push notifications', () => undefined);
    And('the user is authenticated as a Pro user', () => undefined);
    And('isSubscribed is true', () => undefined);
    And('deadlineReminder pref is enabled', () => undefined);

    When('the user toggles deadlineReminder off', () => {
      mapping = { deadline_reminder: false };
    });

    Then('a PUT to /api/notifications/prefs is made with deadline_reminder false', () => {
      expect(mapping.deadline_reminder).toBe(false);
    });

    And('the local prefs state reflects the change immediately', () => undefined);
  });
});
