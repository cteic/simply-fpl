import { formatPrice } from '@simplyfpl/fpl-client';
import type { SupportedLocale, TranslationKey } from '@simplyfpl/i18n';
import { DEFAULT_LOCALE, formatNumber, t } from '@simplyfpl/i18n';
import type { ScoutEvent } from '@simplyfpl/types';
import type { ScoutEventTone } from '@simplyfpl/ui';

export interface ScoutRowModel {
  id: string;
  tone: ScoutEventTone;
  chipLabel: string;
  title: string;
  meta: string;
}

function formatNet(net: number, locale: SupportedLocale): string {
  const formatted = formatNumber(Math.abs(net), locale);
  return net < 0 ? `−${formatted}` : `+${formatted}`;
}

export function buildScoutRow(
  event: ScoutEvent,
  locale: SupportedLocale = DEFAULT_LOCALE
): ScoutRowModel {
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(key, vars, locale);
  const player = event.player.webName;
  const base = `${event.player.teamShortName} · ${formatPrice(event.player.nowCost)}`;

  if (event.kind === 'price_fall' || event.kind === 'price_rise') {
    const probability = Math.round((event.probability ?? 0) * 100);
    return {
      id: event.id,
      tone: event.severity,
      chipLabel:
        event.kind === 'price_fall' ? tr('scout.chip_price_fall') : tr('scout.chip_price_rise'),
      title:
        event.kind === 'price_fall'
          ? tr('scout.event_price_fall_title', { player })
          : tr('scout.event_price_rise_title', { player }),
      meta: `${base} · ${tr('scout.meta_probability', {
        probability,
        net: formatNet(event.netTransfers ?? 0, locale),
      })}`,
    };
  }

  const chipByKind = {
    injury: tr('scout.chip_injury'),
    doubt: tr('scout.chip_doubt'),
    suspension: tr('scout.chip_suspension'),
    unavailable: tr('scout.chip_unavailable'),
  };
  const titleByKind = {
    injury: tr('scout.event_injury_title', { player }),
    doubt: tr('scout.event_doubt_title', { player }),
    suspension: tr('scout.event_suspension_title', { player }),
    unavailable: tr('scout.event_unavailable_title', { player }),
  };

  const metaParts = [base];
  if (event.chanceOfPlaying !== null) {
    metaParts.push(tr('scout.meta_chance', { chance: event.chanceOfPlaying }));
  }
  if (event.news !== null) {
    metaParts.push(event.news);
  }

  return {
    id: event.id,
    tone: event.severity,
    chipLabel: chipByKind[event.kind],
    title: titleByKind[event.kind],
    meta: metaParts.join(' · '),
  };
}

export function buildScoutRows(
  events: ScoutEvent[],
  locale: SupportedLocale = DEFAULT_LOCALE
): ScoutRowModel[] {
  return events.map((event) => buildScoutRow(event, locale));
}
