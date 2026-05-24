import { isValidElement } from 'react';

import { describe, expect, it } from 'vitest';

import { LiveStatusPill } from '@simplyfpl/ui';

function collectText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (!isValidElement(node)) return '';
  const props = node.props;
  if (props !== null && typeof props === 'object' && 'children' in props) {
    return collectText(props.children);
  }
  return '';
}

describe('LiveStatusPill', () => {
  it('shows live, rank (with movement) and deadline in one pill', () => {
    const text = collectText(
      LiveStatusPill({
        liveLabel: 'GW37 Live',
        rank: 124356,
        movement: 13000,
        direction: 'up',
        deadlineLabel: 'GW38',
        deadlineCountdown: '3h 26m',
        href: '/',
      })
    );
    expect(text).toContain('GW37 Live');
    expect(text).toContain('124,356');
    expect(text).toContain('13k');
    expect(text).toContain('GW38');
    expect(text).toContain('3h 26m');
  });

  it('omits the rank segment when no team is selected', () => {
    const text = collectText(LiveStatusPill({ liveLabel: 'Live', rank: null }));
    expect(text).toContain('Live');
    expect(text).not.toContain('Rank');
  });

  it('shows the team id beside the rank when a team is selected', () => {
    const text = collectText(
      LiveStatusPill({
        liveLabel: 'GW37 Live',
        rank: 124356,
        teamId: 1234567,
        onDeselect: () => undefined,
      })
    );
    expect(text).toContain('Rank');
    expect(text).toContain('124,356');
    expect(text).toContain('Team');
    expect(text).toContain('1234567');
  });

  it('omits the team segment when no team id is provided', () => {
    const text = collectText(LiveStatusPill({ liveLabel: 'Live', rank: null }));
    expect(text).not.toContain('Team');
  });
});
