'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, fontFamily: 'monospace', background: '#0f172a', color: '#f87171', minHeight: '100vh' }}>
      <h2 style={{ color: 'white', marginBottom: 12 }}>DEBUG: Page-level crash</h2>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: '#1e293b', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button
        onClick={() => reset()}
        style={{ marginTop: 16, padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6 }}
      >
        Try again
      </button>
    </div>
  );
}
