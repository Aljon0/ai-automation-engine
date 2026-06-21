"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";

type FormState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<FormState>({ phase: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setState({ phase: "loading" });
    const result = await login(email.trim(), password);
    if (result.error) { setState({ phase: "error", message: result.error }); return; }
    router.push("/");
    router.refresh();
  }

  const isLoading = state.phase === "loading";

  return (
    <main style={{
      minHeight: "100vh", background: "var(--color-bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--color-accent-subtle)",
            border: "1px solid var(--color-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <span style={{ fontSize: "1.25rem" }}>⚡</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-muted)" }}>
                Email
              </label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading} required
                className="input"
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-muted)" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading} required
                  className="input"
                  style={{ paddingRight: "2.75rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "0.75rem", top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--color-text-faint)", fontSize: "1rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0.25rem",
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Error */}
            {state.phase === "error" && (
              <div style={{
                padding: "0.625rem 0.875rem",
                background: "var(--color-error-bg)",
                border: "1px solid var(--color-error)",
                borderRadius: 8,
              }}>
                <p style={{ fontSize: "0.8125rem", color: "#fca5a5" }}>{state.message}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="btn-primary"
              style={{ width: "100%", padding: "0.625rem", marginTop: "0.25rem" }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--color-text-faint)", marginTop: "1.25rem" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--color-text-muted)", textDecoration: "none", fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}