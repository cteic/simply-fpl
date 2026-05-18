'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { auth, liveRank } from '@simplyfpl/features';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';
import { LiveRankPill, Nav } from '@simplyfpl/ui';

import { FEATURE_AUTH, FEATURE_PLANNER, FEATURE_PRICES } from '@/lib/feature-flags';
import { useBootstrap, useEntry } from '@/queries/fpl';

const { useAuth } = auth;
const { useLiveAgoMs, useLiveSnapshot } = liveRank;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

interface NavLinkItem {
  label: string;
  href: string;
}

function buildBaseLinks(): NavLinkItem[] {
  const links: NavLinkItem[] = [{ label: 'Leagues', href: '/leagues' }];
  if (FEATURE_PRICES) links.push({ label: 'Prices', href: '/prices' });
  if (FEATURE_PLANNER) links.push({ label: 'Planner', href: '/planner' });
  return links;
}

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

  const { data: entry } = useEntry(entryId);
  const { data: bootstrap } = useBootstrap();
  const currentGw = bootstrap ? getCurrentGameweek(bootstrap) : null;
  useLiveSnapshot(currentGw);
  const agoMs = useLiveAgoMs();
  const liveLabel = currentGw !== null ? `GW${currentGw} Live` : 'Live';

  const baseLinks = buildBaseLinks();
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
    entryId !== null && entry ? (
      <LiveRankPill rank={entry.summary_overall_rank} href="/" />
    ) : undefined;

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
