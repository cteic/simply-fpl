'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { auth } from '@simplyfpl/features';
import { LiveRankPill, Nav } from '@simplyfpl/ui';

import { FEATURE_AUTH, FEATURE_PLANNER, FEATURE_PRICES } from '@/lib/feature-flags';
import { useEntry } from '@/queries/fpl';

const { useAuth } = auth;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

interface NavLinkItem {
  label: string;
  href: string;
}

function buildBaseLinks(): NavLinkItem[] {
  const links: NavLinkItem[] = [
    { label: 'Live Rank', href: '/' },
    { label: 'Leagues', href: '/leagues' },
  ];
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

  const baseLinks = buildBaseLinks();
  const allLinks =
    FEATURE_AUTH && session ? [...baseLinks, { label: 'Settings', href: '/settings' }] : baseLinks;

  const links = allLinks.map((link) => {
    const active =
      link.href === '/'
        ? pathname === '/' || pathname.startsWith('/rank')
        : pathname === link.href || pathname.startsWith(`${link.href}/`);
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
      <LiveRankPill rank={entry.summary_overall_rank} href={`/rank/${entryId}`} />
    ) : undefined;

  return (
    <Nav
      links={links}
      liveLabel="GW30 Live"
      {...(liveRankPill !== undefined ? { liveRankPill } : {})}
      signInHref="/login"
      showAuthButton={FEATURE_AUTH}
      {...authProps}
    />
  );
}
