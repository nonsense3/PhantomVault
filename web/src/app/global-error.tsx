"use client";

export const dynamic = "force-dynamic";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#0E0E0E", color: "#FFFFFF", fontFamily: "monospace" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ maxWidth: "480px", width: "100%", border: "1px solid #333333", backgroundColor: "#141414", padding: "32px", textAlign: "center" }}>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px", color: "#EF4444", margin: "0 0 12px 0" }}>
              CRITICAL SYSTEM FAULT
            </h1>
            <p style={{ fontSize: "12px", color: "#A1A1AA", lineHeight: "1.6", margin: "0 0 24px 0" }}>
              {error?.message || "An unexpected error disrupted the honeypot subsystem."}
            </p>
            <button
              onClick={() => reset()}
              type="button"
              style={{ padding: "8px 20px", backgroundColor: "#1351AA", color: "#FFFFFF", border: "none", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer" }}
            >
              Reset Session
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
