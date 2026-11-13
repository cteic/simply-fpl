import type { LegalSection } from '@simplyfpl/ui';

import { SUPPORT_EMAIL } from './constants';

export const SUPPORT_CONTACT_BODY = `Email ${SUPPORT_EMAIL}. Include your FPL team ID and a description of what you saw. Never send us your FPL password: we do not need it and will never ask for it.`;

export const SUPPORT_FAQ_SECTIONS: LegalSection[] = [
  {
    heading: 'Why is my live rank different from the official FPL site?',
    paragraphs: [
      'During a gameweek the official site only updates your rank after matches finish and bonus points are confirmed. SimplyFPL estimates your rank while games are still being played, using live points and a sample of other managers. Provisional bonus is included before it is official, so the figure moves as the gameweek settles. Once FPL publishes final ranks, the official number is the one that counts.',
    ],
  },
  {
    heading: 'Where do I find my FPL team ID?',
    paragraphs: [
      'Sign in at fantasy.premierleague.com, open the Points tab, and look at the address bar. The URL looks like fantasy.premierleague.com/entry/1234567/event/5 and the number after "entry" is your team ID. You can paste the whole URL into SimplyFPL and it will pick the ID out for you.',
    ],
  },
  {
    heading: 'How do I see my mini-leagues?',
    paragraphs: [
      'Enter your team ID and open Leagues. SimplyFPL reads the classic mini-leagues your team belongs to from the public FPL API, including private leagues you have joined. It cannot join or leave a league for you; do that on the official site and the change shows up here on the next refresh.',
    ],
  },
  {
    heading: 'How do I cancel or change my subscription?',
    paragraphs: [
      'Open Settings and choose Manage subscription. That opens your Stripe billing portal, where you can switch plan, update your card or cancel. Cancelling stops the next renewal and you keep Pro access until the end of the period you have paid for.',
    ],
  },
  {
    heading: 'How do I delete my account and data?',
    paragraphs: [
      `Email ${SUPPORT_EMAIL} from the address on your account and ask us to delete it. We remove your account, tracked leagues, Frank history and notification settings, and confirm by email within one month.`,
    ],
  },
];
