'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { auth, liveRank } from '@simplyfpl/features';
import { getCurrentGameweek, getGameweekPhase, getNextDeadline } from '@simplyfpl/fpl-client';
import { LiveStatusPill, Nav } from '@simplyfpl/ui';

import { FEATURE_AUTH, FEATURE_PLANNER, FEATURE_PRICES, FEATURE_SCOUT } from '@/lib/feature-flags';
import { setSavedEntryId, useSavedEntryId } from '@/lib/saved-entry-id';
import { useBootstrap } from '@/queries/fpl';

import { buildLiveLabel, buildNavLinks } from './nav-links';

const { useAuth } = auth;
const { useCountdown, useLiveAgoMs, useLiveRankEstimate, useLiveSnapshot } = liveRank;

export function NavBar() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const { session, signOut } = useAuth();
  const entryId = useSavedEntryId();
  const [mounted, setMounted] = useState(false);

  function handleDeselectTeam() {
    setSavedEntryId(null);
    router.push('/?clear=1');
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: bootstrap } = useBootstrap();
  const currentGw = bootstrap ? getCurrentGameweek(bootstrap) : null;
  const nextDeadline = bootstrap ? getNextDeadline(bootstrap) : null;
  const countdown = useCountdown(nextDeadline?.deadlineTime ?? null);
  useLiveSnapshot(currentGw);
  const agoMs = useLiveAgoMs();
  const { estimate } = useLiveRankEstimate(entryId);
  const liveRankValue = estimate?.liveRank ?? null;
  // "Live" only while the gameweek is in progress. An event stays current until
  // the next deadline, so going by is_current alone labelled a gameweek that
  // finished days ago as live.
  const phase = bootstrap ? getGameweekPhase(bootstrap) : null;
  const liveLabel = buildLiveLabel(mounted ? currentGw : null, phase);

  // Everything below comes from browser-only state: the bootstrap is restored
  // from localStorage and the saved team from storage too, so both exist on the
  // client's first render and never on the server's. Rendering them before
  // mount made the two disagree and React threw away the server HTML.
  const deadlineProps =
    mounted && nextDeadline && countdown.label && !countdown.isPast
      ? { deadlineLabel: `GW${nextDeadline.event}`, deadlineCountdown: countdown.label }
      : {};

  const baseLinks = buildNavLinks({
    hasEntry: entryId !== null,
    prices: FEATURE_PRICES,
    planner: FEATURE_PLANNER,
    scout: FEATURE_SCOUT,
  });
  const allLinks =
    FEATURE_AUTH && session ? [...baseLinks, { label: 'Settings', href: '/settings' }] : baseLinks;

  const links = allLinks.map((link) => {
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
    return { ...link, active };
  });

  const authProps =
    FEATURE_AUTH && session
      ? {
          onSignOut: () => {
            signOut();
          },
        }
      : {};

  const statusPill = (
    <LiveStatusPill
      liveLabel={liveLabel}
      agoMs={mounted ? agoMs : null}
      rank={mounted && entryId !== null ? liveRankValue : null}
      movement={mounted ? (estimate?.movement ?? null) : null}
      direction={mounted ? (estimate?.direction ?? null) : null}
      teamId={mounted ? entryId : null}
      onDeselect={handleDeselectTeam}
      {...deadlineProps}
      href="/"
    />
  );

  return (
    <Nav
      links={links}
      statusPill={statusPill}
      signInHref="/login"
      showAuthButton={FEATURE_AUTH}
      {...authProps}
    />
  );
}
