"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-[#0E0E0E] text-white font-mono">
        <div className="max-w-md p-6 border border-zinc-700 bg-zinc-900 text-center space-y-4">
          <h2 className="text-lg font-bold text-red-400">Application Error</h2>
          <p className="text-xs text-zinc-400">
            {error?.message || "An unexpected system error occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
