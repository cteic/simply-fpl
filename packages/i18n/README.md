# @simplyfpl/i18n

Single source of truth for all user-facing strings in the SimplyFPL web app, ready for future internationalisation.

## Usage

```ts
import { t, useTranslation } from '@simplyfpl/i18n';

// Direct call (works in non-React code too)
t('frank.loading');

// With interpolation
t('frank.captain_picks', { gameweek: 30 });

// React hook (same t function, convenient destructure)
const { t } = useTranslation();
```

## Adding strings

Add new keys to `src/locales/en.json`. Use flat dot-notation namespaced by feature:

```json
{
  "my_feature.some_label": "Hello world",
  "my_feature.with_var": "Hello {{name}}"
}
```

Key conventions: `feature.descriptive_name`, all lowercase snake_case.

## Upgrade path

This package uses a minimal hand-rolled implementation (~30 lines). When a second locale is needed, the upgrade path to `i18next` is straightforward:

1. Replace `src/index.ts` with an `i18next` initialisation that loads `en.json` and the new locale file.
2. `useTranslation()` becomes a thin wrapper around `i18next.useTranslation()`.
3. `TranslationProvider` wraps `I18nextProvider`.
4. All call-sites stay unchanged — `t('key', { var })` is compatible with `i18next`'s `t` signature.
