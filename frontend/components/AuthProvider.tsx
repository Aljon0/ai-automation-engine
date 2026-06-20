"use client";

/**
 * components/AuthProvider.tsx
 *
 * Client component that:
 * 1. Listens to Supabase auth state changes
 * 2. Redirects unauthenticated users to /login
 * 3. Shows a persistent top nav with user email + logout
 *
 * Public routes (/login, /register) bypass the auth guard.
 */

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChange, logout, AuthUser } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register"];

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);

      if (!authUser && !isPublicRoute) {
        router.push("/login");
      }

      if (authUser && isPublicRoute) {
        router.push("/");
      }
    });

    return unsubscribe;
  }, [pathname, isPublicRoute, router]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  // Show nothing while checking auth to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
      </div>
    );
  }

  // Public routes — render without nav
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes — render with nav
  return (
    <>
      {user && <TopNav user={user} onLogout={handleLogout} />}
      {children}
    </>
  );
}

// ---------------------------------------------------------------------------
// TopNav
// ---------------------------------------------------------------------------

interface TopNavProps {
  user: AuthUser;
  onLogout: () => void;
}

function TopNav({ user, onLogout }: TopNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">

        {/* Left — brand + nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            AI Workflow
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Tasks
            </Link>
            <Link
              href="/runs"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Runs
            </Link>
            <Link
              href="/dashboard"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Right — user email + logout */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-600 hidden sm:block">
            {user.email}
          </span>
          <button
            onClick={onLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800
                       hover:border-zinc-600 rounded-md px-3 py-1.5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}