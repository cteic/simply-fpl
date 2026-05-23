import { isValidElement } from 'react';

import { describe, expect, it } from 'vitest';

import { Logo } from '@simplyfpl/ui';

function collectText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join('');
  if (!isValidElement(node)) return '';
  const props = node.props;
  if (props !== null && typeof props === 'object' && 'children' in props) {
    return collectText(props.children);
  }
  return '';
}

describe('Logo wordmark', () => {
  it('reads "simplyfpl.com" in the lockup', () => {
    const text = collectText(Logo({ variant: 'lockup' }));
    expect(text).toBe('simplyfpl.com');
  });

  it('reads "simplyfpl.com" in the plain wordmark', () => {
    const text = collectText(Logo({ variant: 'wordmark' }));
    expect(text).toBe('simplyfpl.com');
  });
});
