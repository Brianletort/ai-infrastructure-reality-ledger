"use client";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <div className="error-state" role="alert">
        <h1>Local evidence could not be read.</h1>
        <p>
          The interface fails closed when a corpus label, warning, or checked-in artifact is
          unavailable.
        </p>
        <button type="button" onClick={reset}>
          Try local read again
        </button>
      </div>
    </div>
  );
}
