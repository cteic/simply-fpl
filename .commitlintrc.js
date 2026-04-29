export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['web', 'mobile', 'worker', 'fpl-client', 'types', 'utils', 'ui', 'deps', 'ci', 'docs'],
    ],
  },
};
