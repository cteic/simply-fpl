'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { auth, liveRank } from '@simplyfpl/features';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';
import { LiveRankPill, Nav } from '@simplyfpl/ui';

import { FEATURE_AUTH, FEATURE_PLANNER, FEATURE_PRICES } from '@/lib/feature-flags';
import { useBootstrap } from '@/queries/fpl';

import { buildNavLinks } from './nav-links';

const { useAuth } = auth;
const { useLiveAgoMs, useLiveRankEstimate, useLiveSnapshot } = liveRank;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

export function NavBar() {
  const pathname = usePathname() ?? '/';
  const { session, signOut } = useAuth();
  const [entryId, setEntryId] = useState<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const id = saved ? Number(saved) : NaN;
    if (Number.isInteger(id) && id > 0) {
      setEntryId(id);
    }
  }, []);

  const { data: bootstrap } = useBootstrap();
  const currentGw = bootstrap ? getCurrentGameweek(bootstrap) : null;
  useLiveSnapshot(currentGw);
  const agoMs = useLiveAgoMs();
  const { estimate } = useLiveRankEstimate(entryId);
  const liveRankValue = estimate?.liveRank ?? null;
  const liveLabel = currentGw !== null ? `GW${currentGw} Live` : 'Live';

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
    entryId !== null ? <LiveRankPill rank={liveRankValue} href="/" /> : undefined;

  return (
    <Nav
      links={links}
      liveLabel={liveLabel}
      liveAgoMs={agoMs}
      {...(liveRankPill !== undefined ? { liveRankPill } : {})}
      signInHref="/login"
      showAuthButton={FEATURE_AUTH}
      {...authProps}
    />
  );
}
