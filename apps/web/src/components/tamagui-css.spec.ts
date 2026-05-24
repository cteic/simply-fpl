import { describe, expect, it } from 'vitest';

import { config } from '@simplyfpl/ui/tamagui.config';

const DESIGN_SYSTEM_VARS = ['--background', '--positive', '--brand', '--inverse'];

describe('tamagui design-system CSS', () => {
  it('emits the theme CSS variables that token colours resolve against', () => {
    const css = config.getCSS();

    for (const cssVar of DESIGN_SYSTEM_VARS) {
      expect(css).toContain(cssVar);
    }
  });

  it('resolves theme variables to real token values, not black', () => {
    const css = config.getCSS();

    expect(css).toMatch(/--background:\s*var\(--c-bg\)/);
    expect(css).toMatch(/--c-bg:\s*#F6F7F4/i);
  });

  it('keeps the design system out of the per-request atomic styles', () => {
    const atomicOnly = config.getCSS({ exclude: 'design-system' });

    for (const cssVar of DESIGN_SYSTEM_VARS) {
      expect(atomicOnly).not.toContain(cssVar);
    }
  });
});
