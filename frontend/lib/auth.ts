/**
 * lib/auth.ts
 *
 * Supabase auth client for the frontend.
 * Handles login, register, logout, and session management.
 *
 * All auth operations go through here — no direct Supabase
 * calls in components or pages.
 */

import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase client — frontend uses anon key (safe for browser)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true, // store session in localStorage
      autoRefreshToken: true, // refresh JWT before expiry
      detectSessionInUrl: true, // handle OAuth callbacks
    },
  });
  return _client;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

/**
 * Register a new user with email and password.
 */
export async function register(
  email: string,
  password: string,
): Promise<AuthResult> {
  const client = getAuthClient();
  const { data, error } = await client.auth.signUp({ email, password });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: "Registration failed" };

  return {
    user: { id: data.user.id, email: data.user.email ?? email },
    error: null,
  };
}

/**
 * Log in with email and password.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const client = getAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: "Login failed" };

  return {
    user: { id: data.user.id, email: data.user.email ?? email },
    error: null,
  };
}

/**
 * Log out the current user.
 */
export async function logout(): Promise<void> {
  const client = getAuthClient();
  await client.auth.signOut();
}

/**
 * Get the current session JWT token.
 * Used to set Authorization header on API requests.
 */
export async function getToken(): Promise<string | null> {
  const client = getAuthClient();
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Get the current session.
 */
export async function getSession(): Promise<Session | null> {
  const client = getAuthClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

/**
 * Get the current user.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getAuthClient();
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
  };
}

/**
 * Subscribe to auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void,
): () => void {
  const client = getAuthClient();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email ?? "",
      });
    } else {
      callback(null);
    }
  });
  return () => subscription.unsubscribe();
}
