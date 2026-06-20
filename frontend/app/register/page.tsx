"use client";

/**
 * app/register/page.tsx
 *
 * Phase 9 — Register Page
 *
 * Creates a new Supabase user account.
 * Redirects to / on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success" }
  | { phase: "error"; message: string };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<FormState>({ phase: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      setState({ phase: "error", message: "Passwords do not match." });
      return;
    }

    if (password.length < 6) {
      setState({
        phase: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    setState({ phase: "loading" });

    const result = await register(email.trim(), password);

    if (result.error) {
      setState({ phase: "error", message: result.error });
      return;
    }

    // Supabase may require email confirmation depending on project settings
    // If email confirmation is disabled, user is logged in immediately
    if (result.user) {
      router.push("/");
      router.refresh();
    } else {
      // Email confirmation required
      setState({ phase: "success" });
    }
  }

  const isLoading = state.phase === "loading";

  // Email confirmation sent
  if (state.phase === "success") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto">
            <span className="text-emerald-400 text-lg">✓</span>
          </div>
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-zinc-500">
            We sent a confirmation link to{" "}
            <span className="text-zinc-300">{email}</span>. Click the link to
            activate your account.
          </p>
          <Link
            href="/login"
            className="inline-block text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-4"
          >
            Back to login →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col items-center justify-center px-4">

      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
          AI Workflow Automation Engine
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Account
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Sign up to start automating tasks.
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5
                         text-sm text-zinc-100 placeholder-zinc-600
                         focus:outline-none focus:border-zinc-600
                         disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={isLoading}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5
                         text-sm text-zinc-100 placeholder-zinc-600
                         focus:outline-none focus:border-zinc-600
                         disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5
                         text-sm text-zinc-100 placeholder-zinc-600
                         focus:outline-none focus:border-zinc-600
                         disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Password match indicator */}
          {confirmPassword && (
            <p className={`text-xs px-1 ${
              password === confirmPassword ? "text-emerald-400" : "text-red-400"
            }`}>
              {password === confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </p>
          )}

          {/* Error */}
          {state.phase === "error" && (
            <p className="text-xs text-red-400 px-1">{state.message}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !email.trim() ||
              !password.trim() ||
              password !== confirmPassword
            }
            className="w-full py-2.5 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium
                       hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors mt-2"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}