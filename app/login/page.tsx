"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registered = searchParams.get("registered") === "true";

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("ps_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore localStorage read errors in SSR/strict modes
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed. Please check your credentials.");
        return;
      }

      if (rememberMe) {
        try {
          localStorage.setItem("ps_remembered_email", email);
        } catch {}
      } else {
        try {
          localStorage.removeItem("ps_remembered_email");
        } catch {}
      }

      // Role-based redirection preserving existing logic
      if (data.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-split-layout">
      {/* 1. Left Visual Hero Section */}
      <section className="auth-hero-pane">
        <div className="auth-hero-grid" />

        <Link href="/" className="auth-hero-brand">
          <div className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10 }}>
            <Sparkles size={19} />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>
            Project<span style={{ color: "#a5b4fc" }}>Sphere</span>
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 20,
              background: "rgba(184, 144, 71, 0.15)",
              color: "#dfc89a",
              border: "1px solid rgba(184, 144, 71, 0.3)",
              marginLeft: 6,
            }}
          >
            Academic SaaS
          </span>
        </Link>

        <div className="auth-hero-content">
          <h1 className="auth-hero-headline">
            Turn your ideas into <span>meaningful progress.</span>
          </h1>
          <p className="auth-hero-subtitle">
            The modern project management and evaluation platform engineered for engineering students and academic faculty.
          </p>

          <div className="auth-glass-cards">
            {/* Illustrative preview disclosure */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#cbd5e1", background: "rgba(255, 255, 255, 0.08)", padding: "4px 10px", borderRadius: 20, width: "fit-content", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
              <Sparkles size={12} style={{ color: "var(--accent-gold)" }} /> Platform Preview (Illustrative Showcase)
            </div>

            {/* Showcase Card 1 */}
            <div className="auth-glass-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(184, 144, 71, 0.2)", color: "#dfc89a", display: "grid", placeItems: "center" }}>
                    <FolderKanban size={15} />
                  </div>
                  <strong style={{ fontSize: 13, color: "#f8fafc" }}>Autonomous Robotics System</strong>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", background: "rgba(74, 222, 128, 0.12)", padding: "2px 8px", borderRadius: 12 }}>
                  Approved
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                <span>Sprint Progress (14/16 tasks)</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>88%</span>
              </div>
              <div style={{ height: 5, width: "100%", borderRadius: 4, background: "rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
                <div style={{ width: "88%", height: "100%", background: "linear-gradient(90deg, #b89047, #e6c887)", borderRadius: 4 }} />
              </div>
            </div>

            {/* Showcase Card 2 */}
            <div className="auth-glass-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <ClipboardCheck size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 12, color: "#f8fafc" }}>Faculty Review Verified</strong>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Just now</span>
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#cbd5e1", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    &ldquo;Strong milestone breakdown and architectural scope. Approved.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-hero-footer">
          <span>© 2026 ProjectSphere. Connected Project Management.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span>Verified Roles</span>
            <span>JWT Security</span>
            <span>Real-time Velocity</span>
          </div>
        </div>
      </section>

      {/* 2. Right Authentication Form Panel */}
      <section className="auth-form-pane">
        <div className="auth-form-container">
          {/* Mobile Header Branding */}
          <div className="auth-mobile-header">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 16 }}>
              <div className="brand-mark" style={{ width: 32, height: 32, borderRadius: 8 }}>
                <Sparkles size={17} />
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>
                Project<span style={{ color: "var(--accent-gold)" }}>Sphere</span>
              </span>
            </Link>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              Enter your credentials to access your academic workspace.
            </p>
          </div>

          {registered && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0 }} />
              <span>Account created successfully! Please sign in with your credentials.</span>
            </div>
          )}

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                fontSize: 13,
                lineHeight: 1.4,
              }}
              role="alert"
            >
              <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: 13, fontWeight: 650, color: "#334155", marginBottom: 2 }}>
                Email address
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="auth-input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" style={{ display: "block", fontSize: 13, fontWeight: 650, color: "#334155", marginBottom: 2 }}>
                Password
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="auth-input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-input-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#6657d9", cursor: "pointer", borderRadius: 4 }}
                />
                Remember me on this device
              </label>
            </div>

            <button type="submit" disabled={loading} className="auth-btn-primary">
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ margin: "24px 0 0", textAlign: "center", fontSize: 13, color: "#64748b" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#6657d9", fontWeight: 700, textDecoration: "none" }}>
              Create an account
            </Link>
          </p>

          <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
            Protected by database-verified sessions and HTTP-only JWT security.
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <p>Loading login page...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
