'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { auth, liveRank } from '@simplyfpl/features';
import { getCurrentGameweek, getNextDeadline } from '@simplyfpl/fpl-client';
import { DeadlinePill, LiveRankPill, Nav } from '@simplyfpl/ui';

import { FEATURE_AUTH, FEATURE_PLANNER, FEATURE_PRICES } from '@/lib/feature-flags';
import { useBootstrap } from '@/queries/fpl';

import { buildNavLinks } from './nav-links';

const { useAuth } = auth;
const { useCountdown, useLiveAgoMs, useLiveRankEstimate, useLiveSnapshot } = liveRank;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

export function NavBar() {
  const pathname = usePathname() ?? '/';
  const { session, signOut } = useAuth();
  const [entryId, setEntryId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const id = saved ? Number(saved) : NaN;
    if (Number.isInteger(id) && id > 0) {
      setEntryId(id);
    }
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

  const deadline =
    nextDeadline && countdown.label && !countdown.isPast ? (
      <DeadlinePill gwLabel={`GW${nextDeadline.event}`} countdown={countdown.label} />
    ) : undefined;

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

  const liveRankPill =
    entryId !== null ? (
      <LiveRankPill
        rank={liveRankValue}
        movement={estimate?.movement ?? null}
        direction={estimate?.direction ?? null}
        href="/"
      />
    ) : undefined;

  return (
    <Nav
      links={links}
      liveLabel={liveLabel}
      liveAgoMs={agoMs}
      {...(liveRankPill !== undefined ? { liveRankPill } : {})}
      {...(deadline !== undefined ? { deadline } : {})}
      signInHref="/login"
      showAuthButton={FEATURE_AUTH}
      {...authProps}
    />
  );
}
