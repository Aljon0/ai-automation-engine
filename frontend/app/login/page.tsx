"use client";

/**
 * app/login/page.tsx
 *
 * Phase 9 — Login Page
 *
 * Email/password login via Supabase auth.
 * Redirects to / on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>({ phase: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setState({ phase: "loading" });

    const result = await login(email.trim(), password);

    if (result.error) {
      setState({ phase: "error", message: result.error });
      return;
    }

    router.push("/");
    router.refresh();
  }

  const isLoading = state.phase === "loading";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col items-center justify-center px-4">

      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
          AI Workflow Automation Engine
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
        <p className="text-sm text-zinc-500 mt-2">
          Log in to your account to continue.
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
              placeholder="••••••••"
              disabled={isLoading}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5
                         text-sm text-zinc-100 placeholder-zinc-600
                         focus:outline-none focus:border-zinc-600
                         disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Error */}
          {state.phase === "error" && (
            <p className="text-xs text-red-400 px-1">{state.message}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full py-2.5 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium
                       hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors mt-2"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}