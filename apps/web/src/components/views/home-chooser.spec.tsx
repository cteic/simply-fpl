import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { HomeChooser } from './home-chooser';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/dashboard/dashboard-view', () => ({
  DashboardView: () => <div data-testid="dashboard" />,
}));

vi.mock('./hero-presave-view', () => ({
  HeroPreSaveView: () => <main data-testid="home-unified-hero" />,
}));

describe('home chooser server render', () => {
  it('puts the hero in the server HTML so it can be the first paint', () => {
    const markup = renderToString(<HomeChooser />);
    expect(markup).toContain('data-testid="home-unified-hero"');
    expect(markup).not.toContain('data-testid="dashboard"');
  });
});
