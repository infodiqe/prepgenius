"use client";

import React from "react";

/*
 * Root global error boundary (SPRINT-5B-01).
 *
 * Catches errors thrown in the root layout itself. Next.js requires this file
 * to render its own <html>/<body>, and the layout's global stylesheet is NOT
 * loaded here — so styling is intentionally inline and self-contained, and copy
 * is plain English (this renders outside the next-intl provider). It is a true
 * last-resort screen; per-route surfaces use the localized ErrorState instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "0.95rem", color: "#94a3b8", margin: 0, maxWidth: "28rem" }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            cursor: "pointer",
            borderRadius: "0.5rem",
            border: "none",
            padding: "0.6rem 1.25rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            background: "#2563eb",
            color: "#ffffff",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
