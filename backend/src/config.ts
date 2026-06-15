/**
 * config.ts
 *
 * Centralizes all environment variable access.
 * Throws at startup if any required variable is missing or empty.
 * All other modules import from here — never from process.env directly.
 */

function require_env(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      throw new Error(
        `[config] Missing required environment variable: ${name}\n` +
          `  Check your .env file against backend/.env.example`
      );
    }
    return value.trim();
  }
  
  function optional_env(name: string, fallback: string): string {
    const value = process.env[name];
    return value && value.trim() !== "" ? value.trim() : fallback;
  }
  
  // ---------------------------------------------------------------------------
  // Validate and export — this runs once on import, failing fast if incomplete
  // ---------------------------------------------------------------------------
  
  export const config = {
    // Server
    port: parseInt(optional_env("PORT", "4000"), 10),
    nodeEnv: optional_env("NODE_ENV", "development"),
  
    // Supabase
    supabase: {
      url: require_env("SUPABASE_URL"),
      anonKey: require_env("SUPABASE_ANON_KEY"),
      serviceRoleKey: require_env("SUPABASE_SERVICE_ROLE_KEY"),
    },
  
    // n8n
    n8n: {
      baseUrl: require_env("N8N_BASE_URL"),
      // Optional: used if N8N_BASIC_AUTH_ACTIVE=true in docker-compose
      apiKey: optional_env("N8N_API_KEY", ""),
    },
  
    // CORS — the frontend origin allowed to call this backend
    corsOrigin: optional_env("CORS_ORIGIN", "http://localhost:3000"),
  } as const;