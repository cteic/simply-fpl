import { isValidElement } from 'react';

import { describe, expect, it, vi } from 'vitest';

import { LeagueInput } from './league-input';

describe('LeagueInput', () => {
  it('passes typed text back through onChange', () => {
    const onChange = vi.fn();
    const element = LeagueInput({ value: '', placeholder: 'League ID', onChange });
    expect(isValidElement(element)).toBe(true);
    const props: unknown = element.props;
    if (typeof props !== 'object' || props === null || !('onChangeText' in props)) {
      throw new Error('LeagueInput renders no editable field');
    }
    const { onChangeText } = props;
    if (typeof onChangeText !== 'function') throw new Error('onChangeText is not a function');
    onChangeText('12345');
    expect(onChange).toHaveBeenCalledWith('12345');
  });
});
