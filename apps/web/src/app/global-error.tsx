'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const FONT_STACK =
  '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F7F7F5',
          color: '#1A1A18',
          fontFamily: FONT_STACK,
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 440, width: '100%' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#6B6B63',
              margin: '0 0 10px',
            }}
          >
            SimplyFPL
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 10px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#6B6B63', margin: '0 0 20px' }}>
            The app hit an unexpected error and couldn't load. This is on us — try again, and if it
            keeps happening, come back in a few minutes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              appearance: 'none',
              border: 'none',
              borderRadius: 8,
              backgroundColor: '#0F766E',
              color: '#FFFFFF',
              fontFamily: FONT_STACK,
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 18px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
