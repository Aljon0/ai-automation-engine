"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
exports.pingSupabase = pingSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
let _client = null;
function getSupabaseClient() {
    if (_client)
        return _client;
    _client = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.serviceRoleKey, {
        auth: {
            // Backend service — no user sessions, no token persistence
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    return _client;
}
/**
 * Verifies the Supabase connection is reachable.
 * Used by the health check route.
 *
 * Returns { ok: true } or { ok: false, error: string }
 */
async function pingSupabase() {
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
    }
}
