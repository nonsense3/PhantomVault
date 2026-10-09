"use client";

import React from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono">
      <div className="max-w-md p-6 border border-[var(--border-color)] bg-[var(--bg-surface)] text-center space-y-4">
        <h2 className="text-lg font-bold text-red-500">Operation Error</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          {error?.message || "An unexpected error occurred during execution."}
        </p>
        <button
          onClick={() => reset()}
          className="poster-btn poster-btn-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
