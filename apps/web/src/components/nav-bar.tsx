'use client';

import { usePathname } from 'next/navigation';

import { Nav } from '@simplyfpl/ui';

const LINKS = [
  { label: 'Live Rank', href: '/' },
  { label: 'Leagues', href: '/leagues' },
  { label: 'Prices', href: '/prices' },
  { label: 'Planner', href: '/planner' },
];

export function NavBar() {
  const pathname = usePathname() ?? '/';

  const links = LINKS.map((link) => {
    const active =
      link.href === '/'
        ? pathname === '/' || pathname.startsWith('/rank')
        : pathname === link.href || pathname.startsWith(`${link.href}/`);
    return { ...link, active };
  });

  return <Nav links={links} liveLabel="GW30 Live" />;
}
