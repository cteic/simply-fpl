'use client';

import { usePathname } from 'next/navigation';

import { auth } from '@simplyfpl/features';
import { Nav } from '@simplyfpl/ui';

const { useAuth } = auth;

const LINKS = [
  { label: 'Live Rank', href: '/' },
  { label: 'Leagues', href: '/leagues' },
  { label: 'Prices', href: '/prices' },
  { label: 'Planner', href: '/planner' },
];

export function NavBar() {
  const pathname = usePathname() ?? '/';
  const { session, signOut } = useAuth();

  const links = LINKS.map((link) => {
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

  return <Nav links={links} liveLabel="GW30 Live" signInHref="/login" {...authProps} />;
}
