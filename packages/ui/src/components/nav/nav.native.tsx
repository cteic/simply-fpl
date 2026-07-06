import type { ReactNode } from 'react';

import { Text, XStack, styled } from 'tamagui';

import { Button } from '../button';
import { LivePill } from '../live-pill';
import { Logo } from '../logo';

const Bar = styled(XStack, {
  backgroundColor: '$background',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  height: 54,
});

const Left = styled(XStack, {
  alignItems: 'center',
  gap: 18,
});

const Right = styled(XStack, {
  alignItems: 'center',
  gap: 9,
});

const NavLinkBase = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  letterSpacing: '$6',
  paddingHorizontal: 11,
  paddingVertical: 5,
  borderRadius: '$3',
  pressStyle: { opacity: 0.7 },
  variants: {
    active: {
      true: { color: '$color', backgroundColor: '$border', fontWeight: '500' },
      false: { color: '$colorMuted', fontWeight: '400' },
    },
  } as const,
});

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
  onSignOut,
  showAuthButton = true,
  rightAction,
}: NavProps) {
  const isSignedIn = typeof onSignOut === 'function';

  return (
    <Bar>
      <Left>
        <Logo />
        <XStack gap={1}>
          {links.map((link) => (
            <NavLinkBase key={link.href} active={link.active === true}>
              {link.label}
            </NavLinkBase>
          ))}
        </XStack>
      </Left>
      <Right>
        <LivePill label={liveLabel} agoMs={liveAgoMs ?? null} />
        {liveRankPill}
        {showAuthButton && isSignedIn ? (
          <Button tone="ghost" size="md" onPress={onSignOut}>
            Sign out
          </Button>
        ) : null}
        {rightAction}
      </Right>
    </Bar>
  );
}
