"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  FolderKanban,
  ClipboardCheck,
  AlertCircle,
  Check,
} from "lucide-react";

function getPasswordStrength(pass: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pass) return { score: 0, label: "", color: "#e2e8f0" };
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass) || pass.length >= 12) score++;

  switch (score) {
    case 1:
      return { score: 1, label: "Weak", color: "#ef4444" };
    case 2:
      return { score: 2, label: "Fair", color: "#f59e0b" };
    case 3:
      return { score: 3, label: "Good", color: "#3b82f6" };
    case 4:
      return { score: 4, label: "Strong", color: "#10b981" };
    default:
      return { score: 0, label: "Too short", color: "#ef4444" };
  }
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed. Please check your information.");
        return;
      }

      router.push("/login?registered=true");
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
              background: "rgba(165, 180, 252, 0.15)",
              color: "#c7d2fe",
              border: "1px solid rgba(165, 180, 252, 0.25)",
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
            Create your account to start managing capstone projects, connecting task milestones, and collaborating with academic faculty.
          </p>

          <div className="auth-glass-cards">
            {/* Illustrative preview disclosure */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#cbd5e1", background: "rgba(255, 255, 255, 0.08)", padding: "4px 10px", borderRadius: 20, width: "fit-content", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
              <Sparkles size={12} style={{ color: "#a5b4fc" }} /> Platform Preview (Illustrative Showcase)
            </div>

            {/* Showcase Card 1 */}
            <div className="auth-glass-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99, 102, 241, 0.25)", color: "#a5b4fc", display: "grid", placeItems: "center" }}>
                    <FolderKanban size={15} />
                  </div>
                  <strong style={{ fontSize: 13, color: "#f8fafc" }}>Distributed Systems Platform</strong>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", background: "rgba(129, 140, 248, 0.15)", padding: "2px 8px", borderRadius: 12 }}>
                  In Progress
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                <span>Milestone Progress (9/12 tasks)</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>75%</span>
              </div>
              <div style={{ height: 5, width: "100%", borderRadius: 4, background: "rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
                <div style={{ width: "75%", height: "100%", background: "linear-gradient(90deg, #6657d9, #38bdf8)", borderRadius: 4 }} />
              </div>
            </div>

            {/* Showcase Card 2 */}
            <div className="auth-glass-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16, 185, 129, 0.2)", color: "#34d399", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <ClipboardCheck size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 12, color: "#f8fafc" }}>Faculty Evaluation Portal</strong>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Live queue</span>
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Real-time feedback loops between engineering students and project mentors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-hero-footer">
          <span>© 2026 ProjectSphere. Connected Project Management.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span>Zero Mock Data</span>
            <span>Verified Sessions</span>
            <span>Role RBAC</span>
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
                Project<span style={{ color: "#6657d9" }}>Sphere</span>
              </span>
            </Link>
          </div>

          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.6px" }}>
              Create your account
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              Get started with ProjectSphere to track academic milestones and tasks.
            </p>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <label htmlFor="name" style={{ display: "block", fontSize: 13, fontWeight: 650, color: "#334155", marginBottom: 2 }}>
                Full name
              </label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  required
                  className="auth-input-field"
                />
              </div>
            </div>

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
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
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

              {/* Real-time Password Strength Feedback */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, height: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        style={{
                          flex: 1,
                          height: "100%",
                          borderRadius: 2,
                          background: seg <= passwordStrength.score ? passwordStrength.color : "#e2e8f0",
                          transition: "background 0.25s ease",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                    <span>
                      Strength:{" "}
                      <strong style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </strong>
                    </span>
                    <span>Min. 8 characters</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" style={{ display: "block", fontSize: 13, fontWeight: 650, color: "#334155", marginBottom: 2 }}>
                Confirm password
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                  className="auth-input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-input-toggle"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Passwords Match Feedback */}
              {confirmPassword.length > 0 && (
                <div style={{ marginTop: 5, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  {passwordsMatch ? (
                    <span style={{ color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                      <Check size={13} /> Passwords match
                    </span>
                  ) : passwordsMismatch ? (
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>
                      ✕ Passwords do not match
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="auth-btn-primary">
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ margin: "22px 0 0", textAlign: "center", fontSize: 13, color: "#64748b" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#6657d9", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>

          <div style={{ marginTop: 32, paddingTop: 18, borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
            By registering, you join ProjectSphere with verified student account credentials.
          </div>
        </div>
      </section>
    </main>
  );
}