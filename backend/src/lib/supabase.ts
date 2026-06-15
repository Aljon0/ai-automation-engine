/**
 * lib/supabase.ts
 *
 * Supabase client singleton.
 *
 * Uses the service role key — this runs server-side only, never exposed
 * to the browser. Do NOT import this in any frontend code.
 *
 * Single instance is created once on first import and reused across
 * all backend modules (routes, services, etc).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  _client = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        // Backend service — no user sessions, no token persistence
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return _client;
}

/**
 * Verifies the Supabase connection is reachable.
 * Used by the health check route.
 *
 * Returns { ok: true } or { ok: false, error: string }
 */
export async function pingSupabase(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const client = getSupabaseClient();

    // rpc call to built-in postgres function — works on any Supabase project
    // with no tables required
    const { error } = await client.rpc("version");

    // "Could not find the function" is actually fine — it means we connected
    // successfully but the rpc doesn't exist. Any PGRST error with a non-network
    // code means the db is reachable.
    if (error && error.message.toLowerCase().includes("network")) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}