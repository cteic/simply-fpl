export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Workspace packages plus the cross-cutting scopes already in use. Widened
    // when the commit-msg hook and the CI job were wired up: enforcing the old
    // list would have rejected `i18n` (packages/i18n, the most-used scope in
    // the last 100 commits) and `features` (packages/features), which were
    // omissions rather than choices. `security`, `test`, `frank` and `notes`
    // are non-package scopes evidenced in that same history, alongside the
    // `ci`, `deps` and `docs` that were already here.
    // Multi-area commits are comma-delimited — `feat(worker,web): …` — not
    // slash-delimited; commitlint checks each part against this list.
    'scope-enum': [
      2,
      'always',
      [
        'web',
        'mobile',
        'worker',
        'fpl-client',
        'features',
        'i18n',
        'types',
        'utils',
        'ui',
        'deps',
        'ci',
        'docs',
        'notes',
        'security',
        'test',
        'frank',
      ],
    ],
  },
};
