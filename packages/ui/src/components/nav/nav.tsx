'use client';

import type { ReactNode } from 'react';

import { Text, XStack, styled } from 'tamagui';

import { Button } from '../button';
import { LivePill } from '../live-pill';
import { Logo } from '../logo';

const Bar = styled(XStack, {
  zIndex: 200,
  backgroundColor: 'rgba(247,247,245,0.92)',
  backdropFilter: 'blur(18px)',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 28,
  height: 54,
  $sm: { paddingHorizontal: 16 },
});

const Left = styled(XStack, {
  alignItems: 'center',
  gap: 26,
});

const Right = styled(XStack, {
  alignItems: 'center',
  gap: 9,
});

const NavLinks = styled(XStack, {
  gap: 1,
  $sm: { display: 'none' },
});

const NavLinkBase = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  letterSpacing: '$6',
  paddingHorizontal: 11,
  paddingVertical: 5,
  borderRadius: '$3',
  cursor: 'pointer',
  transition: 'fast',
  variants: {
    active: {
      true: { color: '$color', backgroundColor: '$border', fontWeight: '500' },
      false: {
        color: '$colorMuted',
        fontWeight: '400',
        hoverStyle: { color: '$color', backgroundColor: '$border' },
      },
    },
  } as const,
});

const HideOnMobile = styled(XStack, {
  $sm: { display: 'none' },
});

const STICKY_STYLE = { position: 'sticky' as const, top: 0 };

interface NavLinkItem {
  label: string;
  href: string;
  active?: boolean;
}

interface NavProps {
  links: NavLinkItem[];
  liveLabel?: string;
  liveAgoMs?: number | null;
  liveRankPill?: ReactNode;
  deadline?: ReactNode;
  signInHref?: string;
  onSignOut?: () => void;
  showAuthButton?: boolean;
  rightAction?: ReactNode;
}

export function Nav({
  links,
  liveLabel = 'GW30 Live',
  liveAgoMs,
  liveRankPill,
  deadline,
  signInHref = '/login',
  onSignOut,
  showAuthButton = true,
  rightAction,
}: NavProps) {
  const isSignedIn = typeof onSignOut === 'function';

  return (
    <Bar render="nav" style={STICKY_STYLE}>
      <Left>
        <Logo href="/" />
        <NavLinks>
          {links.map((link) => (
            <NavLinkBase
              key={link.href}
              render={<a href={link.href} role="link" />}
              active={link.active === true}
            >
              {link.label}
            </NavLinkBase>
          ))}
        </NavLinks>
      </Left>
      <Right>
        {deadline}
        <LivePill label={liveLabel} agoMs={liveAgoMs ?? null} />
        {liveRankPill}
        {showAuthButton ? (
          <HideOnMobile>
            {isSignedIn ? (
              <Button tone="ghost" size="md" onPress={onSignOut}>
                Sign out
              </Button>
            ) : (
              <Button
                tone="ghost"
                size="md"
                onPress={() => {
                  window.location.href = signInHref;
                }}
              >
                Sign in
              </Button>
            )}
          </HideOnMobile>
        ) : null}
        {rightAction}
      </Right>
    </Bar>
  );
}
