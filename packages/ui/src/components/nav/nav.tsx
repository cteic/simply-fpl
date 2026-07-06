'use client';

import type { ReactNode } from 'react';

import { Text, XStack, styled } from 'tamagui';

import { t } from '@simplyfpl/i18n';

import { Button } from '../button';
import { Logo } from '../logo';

const Bar = styled(XStack, {
  zIndex: 200,
  backgroundColor: 'rgba(246,247,244,0.86)',
  backdropFilter: 'blur(18px)',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  alignItems: 'center',
  justifyContent: 'center',
  height: 54,
});

// Inner content is constrained to PageShell's max-width (960) and centered,
// so the logo + links line up with the page content rather than running
// full-bleed to the viewport edges on wide screens.
const Inner = styled(XStack, {
  width: '100%',
  maxWidth: 960,
  height: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 28,
  $sm: { paddingHorizontal: 16 },
});

const Left = styled(XStack, {
  alignItems: 'center',
  gap: 26,
  $sm: { gap: 14 },
});

const Right = styled(XStack, {
  alignItems: 'center',
  gap: 9,
});

const NavLinks = styled(XStack, {
  gap: 1,
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

const ShowOnMobile = styled(XStack, {
  display: 'none',
  $sm: { display: 'flex' },
});

const STICKY_STYLE = { position: 'sticky' as const, top: 0 };

interface NavLinkItem {
  label: string;
  href: string;
  active?: boolean;
}

interface NavProps {
  links: NavLinkItem[];
  statusPill?: ReactNode;
  signInHref?: string;
  onSignOut?: () => void;
  showAuthButton?: boolean;
  rightAction?: ReactNode;
}

export function Nav({
  links,
  statusPill,
  signInHref = '/login',
  onSignOut,
  showAuthButton = true,
  rightAction,
}: NavProps) {
  const isSignedIn = typeof onSignOut === 'function';

  return (
    <Bar render="nav" style={STICKY_STYLE}>
      <Inner>
        <Left>
          <HideOnMobile>
            <Logo href="/" variant="lockup" />
          </HideOnMobile>
          <ShowOnMobile>
            <Logo href="/" variant="mark" />
          </ShowOnMobile>
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
          {statusPill}
          {showAuthButton ? (
            <HideOnMobile>
              {isSignedIn ? (
                <Button tone="ghost" size="md" onPress={onSignOut}>
                  {t('nav.sign_out')}
                </Button>
              ) : (
                <Button
                  tone="ghost"
                  size="md"
                  onPress={() => {
                    window.location.href = signInHref;
                  }}
                >
                  {t('nav.sign_in')}
                </Button>
              )}
            </HideOnMobile>
          ) : null}
          {rightAction}
        </Right>
      </Inner>
    </Bar>
  );
}
