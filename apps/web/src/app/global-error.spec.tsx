import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import GlobalError from './global-error';

describe('global error boundary', () => {
  function render() {
    return renderToStaticMarkup(<GlobalError error={new Error('boom')} reset={() => undefined} />);
  }

  it('renders its own html and body so it works without the root layout', () => {
    const markup = render();
    expect(markup).toContain('<html');
    expect(markup).toContain('<body');
  });

  it('shows a friendly message and a try-again button', () => {
    const markup = render();
    expect(markup).toContain('Something went wrong');
    expect(markup).toContain('Try again');
    expect(markup).toContain('<button');
  });
});
