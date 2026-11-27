import base from '@cteic/prettier-config';

// Everything except the import order comes from the shared config. The order
// is local: foundry groups `@cteic/*`, and this repo's workspace scope is
// `@simplyfpl/*`. The groups below are the ones the repo already had, so
// adopting the shared config does not reorder every import in the tree.
/** @type {import('prettier').Config} */
export default {
  ...base,
  importOrder: [
    '^react$',
    '',
    '^react-native$',
    '',
    '^expo',
    '',
    '^next',
    '',
    '<BUILTIN_MODULES>',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@simplyfpl/(.*)$',
    '',
    '^@/(.*)$',
    '',
    '^[.]',
  ],
};
