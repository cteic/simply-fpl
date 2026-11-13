import type { LeaguePress } from '@simplyfpl/fpl-client';
import type { SupportedLocale, TranslationKey } from '@simplyfpl/i18n';
import { DEFAULT_LOCALE, t } from '@simplyfpl/i18n';
import type { ScoutEventTone } from '@simplyfpl/ui';

export interface PressStoryModel {
  id: string;
  tone: ScoutEventTone;
  chipLabel: string;
  text: string;
}

export interface PressPageModel {
  headline: string;
  lede: string;
  stories: PressStoryModel[];
}

export function buildPressModel(
  press: LeaguePress,
  locale: SupportedLocale = DEFAULT_LOCALE
): PressPageModel {
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(key, vars, locale);

  const headline = tr('press.headline', {
    team: press.leader.entryName,
    league: press.leagueName,
    points: press.leader.eventTotal,
  });

  const lede =
    press.chaser === null
      ? tr('press.lede_clear', { team: press.leader.entryName, total: press.leader.total })
      : tr('press.lede_chase', {
          team: press.leader.entryName,
          total: press.leader.total,
          gap: press.chaser.gap,
          chaser: press.chaser.entryName,
        });

  const stories: PressStoryModel[] = [];

  if (press.isRivalryWeek && press.chaser !== null) {
    stories.push({
      id: 'rivalry',
      tone: 'bad',
      chipLabel: tr('press.chip_rivalry'),
      text: tr('press.story_rivalry', {
        gap: press.chaser.gap,
        chaser: press.chaser.entryName,
        leader: press.leader.entryName,
      }),
    });
  }

  if (press.topScore !== null) {
    stories.push({
      id: 'top-score',
      tone: 'good',
      chipLabel: tr('press.chip_top_score'),
      text: tr('press.story_top_score', {
        team: press.topScore.entryName,
        points: press.topScore.eventTotal,
      }),
    });
  }

  if (press.sackWatch !== null) {
    stories.push({
      id: 'sack-watch',
      tone: 'warn',
      chipLabel: tr('press.chip_sack_watch'),
      text: tr('press.story_sack_watch', {
        team: press.sackWatch.entryName,
        points: press.sackWatch.eventTotal,
      }),
    });
  }

  if (press.biggestClimb !== null) {
    stories.push({
      id: 'climb',
      tone: 'good',
      chipLabel: tr('press.chip_climb'),
      text: tr('press.story_climb', {
        team: press.biggestClimb.entryName,
        places: press.biggestClimb.places,
      }),
    });
  }

  return { headline, lede, stories };
}

export function buildPressShareText(
  press: LeaguePress,
  gw: number | null,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const model = buildPressModel(press, locale);
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(key, vars, locale);

  const lines: string[] = [];
  lines.push(
    gw === null
      ? press.leagueName.toUpperCase()
      : tr('press.review_heading', { league: press.leagueName.toUpperCase(), gw })
  );
  lines.push(model.headline);
  lines.push('');
  for (const row of press.standingsTop) {
    lines.push(
      tr('press.share_row', {
        rank: row.rank,
        team: row.entryName,
        total: row.total,
        gwPoints: row.eventTotal,
      })
    );
  }
  lines.push('');
  for (const story of model.stories) {
    lines.push(`${story.chipLabel}: ${story.text}`);
  }
  lines.push('');
  lines.push('via simplyfpl.com');
  return lines.join('\n');
}
