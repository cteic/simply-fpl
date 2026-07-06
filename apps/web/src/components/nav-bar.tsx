'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { auth, liveRank } from '@simplyfpl/features';
import { getCurrentGameweek, getNextDeadline } from '@simplyfpl/fpl-client';
import { LiveStatusPill, Nav } from '@simplyfpl/ui';

import { FEATURE_AUTH, FEATURE_PLANNER, FEATURE_PRICES } from '@/lib/feature-flags';
import { setSavedEntryId, useSavedEntryId } from '@/lib/saved-entry-id';
import { useBootstrap } from '@/queries/fpl';

import { buildNavLinks } from './nav-links';

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
  const liveLabel = mounted && currentGw !== null ? `GW${currentGw} Live` : 'Live';

  const deadlineProps =
    nextDeadline && countdown.label && !countdown.isPast
      ? { deadlineLabel: `GW${nextDeadline.event}`, deadlineCountdown: countdown.label }
      : {};

  const baseLinks = buildNavLinks({
    hasEntry: entryId !== null,
    prices: FEATURE_PRICES,
    planner: FEATURE_PLANNER,
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
      agoMs={agoMs}
      rank={entryId !== null ? liveRankValue : null}
      movement={estimate?.movement ?? null}
      direction={estimate?.direction ?? null}
      teamId={entryId}
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
