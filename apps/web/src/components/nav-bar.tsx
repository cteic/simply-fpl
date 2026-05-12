'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { auth } from '@simplyfpl/features';
import { LiveRankPill, Nav } from '@simplyfpl/ui';

import { useEntry } from '@/queries/fpl';

const { useAuth } = auth;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

const BASE_LINKS = [
  { label: 'Live Rank', href: '/' },
  { label: 'Leagues', href: '/leagues' },
  { label: 'Prices', href: '/prices' },
  { label: 'Planner', href: '/planner' },
];

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

  const allLinks = session ? [...BASE_LINKS, { label: 'Settings', href: '/settings' }] : BASE_LINKS;

  const links = allLinks.map((link) => {
    const active =
      link.href === '/'
        ? pathname === '/' || pathname.startsWith('/rank')
        : pathname === link.href || pathname.startsWith(`${link.href}/`);
    return { ...link, active };
  });

  const authProps = session
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
      liveRankPill={liveRankPill}
      signInHref="/login"
      {...authProps}
    />
  );
}
