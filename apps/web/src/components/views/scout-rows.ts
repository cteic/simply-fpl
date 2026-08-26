import { formatPrice } from '@simplyfpl/fpl-client';
import { t } from '@simplyfpl/i18n';
import type { ScoutEvent } from '@simplyfpl/types';
import type { ScoutEventTone } from '@simplyfpl/ui';

export interface ScoutRowModel {
  id: string;
  tone: ScoutEventTone;
  chipLabel: string;
  title: string;
  meta: string;
}

function formatNet(net: number): string {
  const formatted = Math.abs(net).toLocaleString('en-GB');
  return net < 0 ? `−${formatted}` : `+${formatted}`;
}

export function buildScoutRow(event: ScoutEvent): ScoutRowModel {
  const player = event.player.webName;
  const base = `${event.player.teamShortName} · ${formatPrice(event.player.nowCost)}`;

  if (event.kind === 'price_fall' || event.kind === 'price_rise') {
    const probability = Math.round((event.probability ?? 0) * 100);
    return {
      id: event.id,
      tone: event.severity,
      chipLabel:
        event.kind === 'price_fall' ? t('scout.chip_price_fall') : t('scout.chip_price_rise'),
      title:
        event.kind === 'price_fall'
          ? t('scout.event_price_fall_title', { player })
          : t('scout.event_price_rise_title', { player }),
      meta: `${base} · ${t('scout.meta_probability', {
        probability,
        net: formatNet(event.netTransfers ?? 0),
      })}`,
    };
  }

  const chipByKind = {
    injury: t('scout.chip_injury'),
    doubt: t('scout.chip_doubt'),
    suspension: t('scout.chip_suspension'),
    unavailable: t('scout.chip_unavailable'),
  } as const;
  const titleByKind = {
    injury: t('scout.event_injury_title', { player }),
    doubt: t('scout.event_doubt_title', { player }),
    suspension: t('scout.event_suspension_title', { player }),
    unavailable: t('scout.event_unavailable_title', { player }),
  } as const;

  const metaParts = [base];
  if (event.chanceOfPlaying !== null) {
    metaParts.push(t('scout.meta_chance', { chance: event.chanceOfPlaying }));
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

export function buildScoutRows(events: ScoutEvent[]): ScoutRowModel[] {
  return events.map(buildScoutRow);
}
