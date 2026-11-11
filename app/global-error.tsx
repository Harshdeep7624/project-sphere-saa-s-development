"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical root error captured by ProjectSphere global error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
          background: "#0f172a",
          color: "#f8fafc",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "min(100%, 480px)",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "16px",
            padding: "36px 32px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
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
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              marginBottom: 20,
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 700,
              margin: "0 0 10px",
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            System Recovery Mode
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "#94a3b8",
              lineHeight: 1.55,
              margin: "0 0 24px",
            }}
          >
            A critical system issue occurred while loading ProjectSphere. Please try reloading the application.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={16} />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
