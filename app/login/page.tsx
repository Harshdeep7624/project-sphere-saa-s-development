"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
const router = useRouter();
const searchParams = useSearchParams();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const registered = searchParams.get("registered") === "true";

async function handleSubmit(
event: React.FormEvent<HTMLFormElement>
) {
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
    setError(data.message || "Login failed. Please try again.");
    return;
  }

  router.push("/");
  router.refresh();
} catch {
  setError("Unable to connect to the server. Please try again.");
} finally {
  setLoading(false);
}


}

return ( <main className="auth-page"> <section className="auth-card"> <Link href="/" className="auth-brand">
Project<span>Sphere</span> </Link>

    <h1>Welcome back</h1>

    <p className="auth-description">
      Log in to manage your academic projects.
    </p>

    {registered && (
      <div
        style={{
          marginBottom: 18,
          padding: 12,
          borderRadius: 9,
          background: "#ecfdf5",
          color: "#047857",
          fontSize: 13,
        }}
      >
        Account created successfully! Please log in.
      </div>
    )}

    {error && (
      <div className="auth-error" role="alert">
        {error}
      </div>
    )}

    <form onSubmit={handleSubmit} className="auth-form">
      <label htmlFor="email">Email address</label>

      <input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />

      <label htmlFor="password">Password</label>

      <input
        id="password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="auth-submit"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>
    </form>

    <p className="auth-footer">
      Don&apos;t have an account?{" "}
      <Link href="/register">Create an account</Link>
    </p>
  </section>
</main>


);
}

export default function LoginPage() {
return (
<Suspense
fallback={ <main className="auth-page"> <p>Loading login page...</p> </main>
}
> <LoginForm /> </Suspense>
);
}
