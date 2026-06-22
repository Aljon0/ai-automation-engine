"use client";

/**
 * components/AuthProvider.tsx
 *
 * Phase 10 update — redesigned TopNav with professional layout.
 * Auth guard unchanged — only visual design updated.
 */

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChange, logout, AuthUser } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login", "/register"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--color-text-faint)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <>
      {user && <TopNav user={user} onLogout={handleLogout} pathname={pathname} />}
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
  pathname: string;
}

function TopNav({ user, onLogout, pathname }: TopNavProps) {
  const navLinks = [
    { href: "/", label: "Tasks" },
    { href: "/runs", label: "Runs" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "var(--nav-height)",
        background: "rgba(9,9,11,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          padding: "0 1rem",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--color-text)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
            flexShrink: 0,
          }}
        >
          AI Workflow
        </Link>

        {/* Nav links */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.125rem",
            flex: 1,
          }}
        >
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive
                    ? "var(--color-text)"
                    : "var(--color-text-subtle)",
                  textDecoration: "none",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "6px",
                  background: isActive
                    ? "var(--color-surface-2)"
                    : "transparent",
                  transition: "color 0.15s, background 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          {/* Email — hidden on small screens */}
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-faint)",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "none",
            }}
            className="nav-email"
          >
            {user.email}
          </span>
          <button
            onClick={onLogout}
            className="btn-ghost"
            style={{ fontSize: "0.75rem", whiteSpace: "nowrap", padding: "0.375rem 0.625rem" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}