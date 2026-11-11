import Link from "next/link";
import { FolderKanban, ArrowLeft, Home, LogIn } from "lucide-react";

export default function NotFound() {
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
          width: "min(100%, 520px)",
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
            background: "var(--accent-gold-light)",
            color: "var(--accent-gold)",
            border: "1px solid var(--accent-gold-border)",
            marginBottom: 20,
          }}
        >
          <FolderKanban size={28} />
        </div>

        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent-gold)",
            marginBottom: 8,
          }}
        >
          404 · Page Not Found
        </div>

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "26px",
            fontWeight: 700,
            margin: "0 0 10px",
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          Lost in Orbit?
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "var(--muted-foreground)",
            lineHeight: 1.55,
            margin: "0 0 28px",
          }}
        >
          The page or resource you requested does not exist, may have been relocated, or is no longer accessible.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "var(--primary)",
              color: "#faf9f6",
              border: "1px solid rgba(184, 144, 71, 0.35)",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
            }}
          >
            <Home size={16} />
            <span>Return to Workspace</span>
          </Link>

          <Link
            href="/login"
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
            <LogIn size={16} />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
