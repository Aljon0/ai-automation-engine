/**
 * lib/n8n.ts
 *
 * HTTP client for communicating with the self-hosted n8n instance.
 *
 * Phase 0: health check (ping) only.
 * Phase 1: triggerWebhook() added for workflow execution.
 *
 * All n8n communication goes through this module — no raw fetch calls
 * to n8n anywhere else in the codebase.
 */

import { config } from "../config";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: "GET" | "POST";
  path: string;
  body?: unknown;
  timeoutMs?: number;
}

async function n8nRequest<T = unknown>(options: RequestOptions): Promise<T> {
  const { method = "GET", path, body, timeoutMs = 5000 } = options;

  const url = `${config.n8n.baseUrl}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Attach API key if configured (when N8N_BASIC_AUTH_ACTIVE=true)
  if (config.n8n.apiKey) {
    headers["X-N8N-API-KEY"] = config.n8n.apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `n8n responded with ${response.status} ${response.statusText} — ${url}`
      );
    }

    // n8n /healthz returns plain text "OK", not JSON
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`n8n request timed out after ${timeoutMs}ms — ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verifies the n8n instance is reachable and healthy.
 * Used by the health check route.
 *
 * Returns { ok: true } or { ok: false, error: string }
 */
export async function pingN8n(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await n8nRequest({ path: "/healthz", timeoutMs: 5000 });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Triggers an n8n webhook by its full URL.
 * Used by workflow.service.ts to fire a registered workflow.
 *
 * @param webhookUrl - Full webhook URL from workflow_registry.webhook_url
 * @param payload    - Data to send as the request body
 * @returns The parsed JSON response from n8n
 *
 * Note: webhookUrl is a full URL (not a path), so we POST directly
 * to it rather than going through n8nRequest which prepends baseUrl.
 */
export async function triggerWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.n8n.apiKey) {
    headers["X-N8N-API-KEY"] = config.n8n.apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s — workflows take longer than pings

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `n8n webhook responded with ${response.status} ${response.statusText} — ${webhookUrl}`
      );
    }

    // Normalize response — n8n webhooks always return JSON
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as Record<string, unknown>;
    }

    // Wrap plain text responses so the return type is always consistent
    const text = await response.text();
    return { message: text };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `n8n webhook timed out after 30000ms — ${webhookUrl}`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}