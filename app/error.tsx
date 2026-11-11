"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors securely without rendering raw internals to the user
    console.error("Application error captured by ProjectSphere error boundary:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        color: "var(--foreground)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "min(100%, 500px)",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.08)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: "14px",
            background: "#fee2e2",
            color: "#dc2626",
            marginBottom: 20,
          }}
        >
          <AlertCircle size={28} />
        </div>

        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#dc2626",
            marginBottom: 8,
          }}
        >
          Application Notice
        </div>

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "24px",
            fontWeight: 700,
            margin: "0 0 10px",
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "var(--muted-foreground)",
            lineHeight: 1.55,
            margin: "0 0 24px",
          }}
        >
          An unexpected issue prevented this view from loading completely. You can attempt to refresh the view or return to your main workspace.
        </p>

        {error?.digest && (
          <div
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              color: "var(--muted-foreground)",
              background: "var(--muted)",
              padding: "6px 10px",
              borderRadius: "6px",
              marginBottom: 24,
              display: "inline-block",
            }}
          >
            Incident Reference: {error.digest}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "var(--primary)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={16} />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            <Home size={16} />
            <span>Workspace Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
