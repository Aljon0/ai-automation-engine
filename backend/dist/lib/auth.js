"use strict";
/**
 * lib/auth.ts
 *
 * Supabase auth client for the frontend.
 * Handles login, register, logout, and session management.
 *
 * All auth operations go through here — no direct Supabase
 * calls in components or pages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthClient = getAuthClient;
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.getToken = getToken;
exports.getSession = getSession;
exports.getCurrentUser = getCurrentUser;
exports.onAuthStateChange = onAuthStateChange;
const supabase_js_1 = require("@supabase/supabase-js");
// ---------------------------------------------------------------------------
// Supabase client — frontend uses anon key (safe for browser)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let _client = null;
function getAuthClient() {
    if (_client)
        return _client;
    _client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true, // store session in localStorage
            autoRefreshToken: true, // refresh JWT before expiry
            detectSessionInUrl: true, // handle OAuth callbacks
        },
    });
    return _client;
}
// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------
/**
 * Register a new user with email and password.
 */
async function register(email, password) {
    const client = getAuthClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error)
        return { user: null, error: error.message };
    if (!data.user)
        return { user: null, error: "Registration failed" };
    return {
        user: { id: data.user.id, email: data.user.email ?? email },
        error: null,
    };
}
/**
 * Log in with email and password.
 */
async function login(email, password) {
    const client = getAuthClient();
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
    });
    if (error)
        return { user: null, error: error.message };
    if (!data.user)
        return { user: null, error: "Login failed" };
    return {
        user: { id: data.user.id, email: data.user.email ?? email },
        error: null,
    };
}
/**
 * Log out the current user.
 */
async function logout() {
    const client = getAuthClient();
    await client.auth.signOut();
}
/**
 * Get the current session JWT token.
 * Used to set Authorization header on API requests.
 */
async function getToken() {
    const client = getAuthClient();
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
}
/**
 * Get the current session.
 */
async function getSession() {
    const client = getAuthClient();
    const { data } = await client.auth.getSession();
    return data.session;
}
/**
 * Get the current user.
 */
async function getCurrentUser() {
    const client = getAuthClient();
    const { data } = await client.auth.getUser();
    if (!data.user)
        return null;
    return {
        id: data.user.id,
        email: data.user.email ?? "",
    };
}
/**
 * Subscribe to auth state changes.
 * Returns unsubscribe function.
 */
function onAuthStateChange(callback) {
    const client = getAuthClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            callback({
                id: session.user.id,
                email: session.user.email ?? "",
            });
        }
        else {
            callback(null);
        }
    });
    return () => subscription.unsubscribe();
}
