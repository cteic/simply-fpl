import { isValidElement } from 'react';
import type { ReactElement } from 'react';

import { describe, expect, it } from 'vitest';

import { Logo, Nav } from '@simplyfpl/ui';

function findElementByType(node: unknown, target: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByType(child, target);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (node.type === target) return node;
  const props = node.props;
  if (props !== null && typeof props === 'object' && 'children' in props) {
    return findElementByType(props.children, target);
  }
  return null;
}

function readHref(el: ReactElement): unknown {
  const props = el.props;
  if (props !== null && typeof props === 'object' && 'href' in props) return props.href;
  return undefined;
}

function readTag(el: ReactElement): unknown {
  const props = el.props;
  if (props !== null && typeof props === 'object' && 'tag' in props) return props.tag;
  return undefined;
}

describe('Nav logo home link', () => {
  it('renders the logo as a link to "/" so sub-routes can navigate home', () => {
    const tree = Nav({ links: [] });
    const logo = findElementByType(tree, Logo);
    expect(logo).not.toBeNull();
    if (logo === null) return;
    expect(readHref(logo)).toBe('/');
  });

  it('Logo renders as an anchor when given an href', () => {
    const el = Logo({ href: '/' });
    expect(readTag(el)).toBe('a');
    expect(readHref(el)).toBe('/');
  });
});
