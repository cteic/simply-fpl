import type { LegalSection } from '@simplyfpl/ui';

import { OPERATOR_LOCATION, OPERATOR_NAME, SUPPORT_EMAIL } from './constants';

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: '1. Who we are',
    paragraphs: [
      `SimplyFPL is a companion app for Fantasy Premier League (FPL). It is operated by ${OPERATOR_NAME}, based in ${OPERATOR_LOCATION}. ${OPERATOR_NAME} is the data controller for the personal data described in this policy.`,
      `SimplyFPL is not affiliated with, endorsed by, or connected to the Premier League or the official Fantasy Premier League game.`,
      `Questions about this policy go to ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    heading: '2. What we collect',
    paragraphs: [
      'You can use the live rank, mini-league and head-to-head features without an account. What we hold depends on how you use the app.',
    ],
    bullets: [
      'Without an account: the FPL team ID you enter is saved in your browser so the app remembers your team. It is sent to our server to fetch your public FPL data. We do not link it to you as a person.',
      'With an account: your email address (used to send sign-in links), your FPL team ID, the mini-leagues you track, your subscription tier, and a reference to your Stripe customer record.',
      'Frank, the AI coach: the questions you ask and the answers you receive are stored against your account, so you can see your history and so we can apply fair-use limits.',
      'Notifications: if you turn on push notifications, we store the push subscription your browser gives us (an endpoint URL and encryption keys), your notification preferences, and a log of the notifications we sent you.',
      'Analytics: only after you accept the analytics banner, we collect anonymous product analytics (pages viewed, features used). We send a hashed identifier, never your email, team ID or league IDs.',
      'Technical logs: our hosting providers record requests (IP address, browser type, page requested) for security and debugging. These logs are kept for 30 days.',
    ],
  },
  {
    heading: '3. Where your FPL data comes from',
    paragraphs: [
      'Your squad, points, rank and league standings come from the public Fantasy Premier League API. We fetch that data through our own Cloudflare Worker, which caches responses briefly to reduce load on FPL and to make the app fast.',
      'The FPL API returns public data for any team ID. SimplyFPL never asks for, stores, or has access to your FPL account password.',
    ],
  },
  {
    heading: '4. Why we use it',
    paragraphs: ['We rely on the following legal bases under the GDPR.'],
    bullets: [
      'To provide the service you signed up for, including live rank, leagues, Frank and notifications (performance of a contract).',
      'To take payment and manage your subscription through Stripe (performance of a contract and our legal obligations to keep financial records).',
      'To measure how the product is used, only with your consent, which you can withdraw at any time from the analytics banner or by clearing site data.',
      'To send push notifications, only with your consent, which you can withdraw at any time in Settings or in your browser.',
      'To keep the service secure and prevent abuse, such as rate limiting and fraud checks (our legitimate interests).',
    ],
  },
  {
    heading: '5. Who we share it with',
    paragraphs: [
      'We do not sell personal data. We share it only with the providers below, each of which processes it on our instructions under a data processing agreement.',
    ],
    bullets: [
      'Supabase (EU region): sign-in, the database that stores your account, leagues, entitlements, Frank history and notification settings.',
      'Stripe: payment processing and subscription billing. Your card details go directly to Stripe and never touch SimplyFPL servers. Stripe also acts as an independent controller for payment records under its own privacy policy.',
      'PostHog (EU region): product analytics, only after you consent. No email, team ID or league ID is sent.',
      'Anthropic: powers Frank. When you ask Frank a question, we send your question together with an anonymised squad context (your current picks, upcoming fixtures and price-change data). We do not send your email, name or team ID.',
      'Cloudflare: hosts the website and the Worker that fetches FPL data, and provides edge caching and a cookieless page-view beacon.',
      'Push providers (Google, Apple, Mozilla): deliver push notifications. They receive an encrypted payload they cannot read, along with the endpoint URL your browser assigned.',
    ],
  },
  {
    heading: '6. Sponsored placements',
    paragraphs: [
      'The free tier may show clearly labelled sponsored placements. We do not currently use an advertising network, and we do not share personal data with advertisers. If that changes, we will update this policy and ask for consent where the law requires it.',
    ],
  },
  {
    heading: '7. International transfers',
    paragraphs: [
      'Your account data and analytics are stored in the European Union. Stripe, Anthropic and Cloudflare may process data outside the European Economic Area. Where that happens, the transfer relies on the safeguards in Article 46 GDPR, such as the standard contractual clauses in each provider’s data processing agreement.',
    ],
  },
  {
    heading: '8. How long we keep it',
    paragraphs: [],
    bullets: [
      'Account data, tracked leagues, Frank history and notification settings: for as long as your account exists. When you delete your account, all of it is deleted.',
      'Push subscriptions: until you turn notifications off, the subscription stops working, or you delete your account.',
      'Technical logs: 30 days.',
      'Payment records: Stripe keeps transaction records for as long as tax and accounting law requires.',
      'Team ID, theme, language and analytics choice saved in your browser: until you clear them or remove site data.',
    ],
  },
  {
    heading: '9. Your rights',
    paragraphs: [
      'Under the GDPR you can ask us to access, correct, delete or export your personal data, to restrict or object to how we process it, and to withdraw any consent you have given. Withdrawing consent does not affect processing that happened before you withdrew it.',
      `To exercise any of these rights, or to delete your account, email ${SUPPORT_EMAIL} from the address on your account. We respond within one month.`,
      'If you are unhappy with how we handle your data, you can complain to the Data Protection Commission in Ireland (dataprotection.ie) or to the supervisory authority in your own country.',
    ],
  },
  {
    heading: '10. Cookies and browser storage',
    paragraphs: [
      'SimplyFPL uses a session cookie to keep you signed in. It stores your team ID, theme, language and analytics choice in your browser’s local storage. Analytics cookies are set only after you accept the analytics banner. The Cloudflare page-view beacon does not use cookies or local storage.',
    ],
  },
  {
    heading: '11. Children',
    paragraphs: [
      'SimplyFPL is not directed at children under 16, and we do not knowingly collect their personal data. If you believe a child has created an account, contact us and we will delete it.',
    ],
  },
  {
    heading: '12. Changes to this policy',
    paragraphs: [
      'We will post any changes on this page and update the date at the top. If a change materially affects how we use your data, we will also email account holders before it takes effect.',
    ],
  },
  {
    heading: '13. Contact',
    paragraphs: [`${OPERATOR_NAME}, ${OPERATOR_LOCATION}. Email: ${SUPPORT_EMAIL}.`],
  },
];
