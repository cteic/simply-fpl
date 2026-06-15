'use client';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminFrankError({ error, reset }: ErrorBoundaryProps) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 16px',
        fontFamily: 'var(--font-body, sans-serif)',
        fontSize: 13,
        color: 'var(--color, #1A1A18)',
      }}
    >
      <p style={{ marginBottom: 12 }}>Failed to load stats: {error.message}</p>
      <button onClick={reset} style={{ fontSize: 13, cursor: 'pointer' }}>
        Retry
      </button>
    </main>
  );
}
