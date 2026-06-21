"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";

type FormState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success" }
  | { phase: "error"; message: string };

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState<FormState>({ phase: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (password !== confirmPassword) { setState({ phase: "error", message: "Passwords do not match." }); return; }
    if (password.length < 6) { setState({ phase: "error", message: "Password must be at least 6 characters." }); return; }
    setState({ phase: "loading" });
    const result = await register(email.trim(), password);
    if (result.error) { setState({ phase: "error", message: result.error }); return; }
    if (result.user) { router.push("/"); router.refresh(); }
    else setState({ phase: "success" });
  }

  const isLoading = state.phase === "loading";
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  if (state.phase === "success") {
    return (
      <main style={{
        minHeight: "100vh", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
      }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--color-success-bg)",
            border: "1px solid var(--color-success)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem", fontSize: "1.5rem",
          }}>✓</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Check your email</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
            We sent a confirmation link to <strong style={{ color: "var(--color-text)" }}>{email}</strong>
          </p>
          <Link href="/login" style={{ fontSize: "0.875rem", color: "var(--color-text-subtle)", textDecoration: "none" }}>
            Back to login →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh", background: "var(--color-bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

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
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>Create account</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Sign up to start automating tasks
          </p>
        </div>

        <div className="card" style={{ padding: "1.75rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" disabled={isLoading} required className="input" />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isLoading} required className="input"
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

            {/* Confirm Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading} required className="input"
                  style={{
                    paddingRight: "2.75rem",
                    borderColor: confirmPassword
                      ? (passwordsMatch ? "var(--color-success)" : "var(--color-error)")
                      : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
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
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
              {confirmPassword && (
                <p style={{ fontSize: "0.75rem", color: passwordsMatch ? "var(--color-success)" : "var(--color-error)" }}>
                  {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            {/* Error */}
            {state.phase === "error" && (
              <div style={{ padding: "0.625rem 0.875rem", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", borderRadius: 8 }}>
                <p style={{ fontSize: "0.8125rem", color: "#fca5a5" }}>{state.message}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim() || password !== confirmPassword}
              className="btn-primary"
              style={{ width: "100%", padding: "0.625rem", marginTop: "0.25rem" }}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--color-text-faint)", marginTop: "1.25rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-text-muted)", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}