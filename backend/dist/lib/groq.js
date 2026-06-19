"use strict";
/**
 * lib/groq.ts
 *
 * HTTP client for the Groq inference API.
 *
 * Phase 3: used for intent classification only.
 * Future phases: can be reused for CSV analysis, summarization, etc.
 *
 * All Groq communication goes through this module — no raw fetch
 * calls to Groq anywhere else in the codebase.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyIntent = classifyIntent;
const config_1 = require("../config");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Best model for fast intent classification — ~200ms response time
const DEFAULT_MODEL = "llama-3.1-8b-instant";
// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------
async function groqRequest(request) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config_1.config.groq.apiKey}`,
            },
            body: JSON.stringify(request),
            signal: controller.signal,
        });
        if (!response.ok) {
            const error = await response.text().catch(() => response.statusText);
            throw new Error(`Groq API responded with ${response.status}: ${error}`);
        }
        return (await response.json());
    }
    catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            throw new Error("Groq API request timed out after 10000ms");
        }
        throw err;
    }
    finally {
        clearTimeout(timeout);
    }
}
/**
 * Uses Groq to classify a natural language input into one of the
 * provided intent keys.
 *
 * Returns the matched intent key string, or null if classification fails.
 *
 * @param options.userInput      - Raw user input e.g. "Analyze my spreadsheet"
 * @param options.validIntentKeys - Intent keys to classify into e.g. ["csv_analysis", "hello_world"]
 */
async function classifyIntent(options) {
    const { userInput, validIntentKeys } = options;
    const systemPrompt = `You are an intent classification system for an AI workflow automation engine.

Your job is to classify user input into exactly one of these intent keys:
${validIntentKeys.map((k) => `- ${k}`).join("\n")}

Rules:
1. Respond with ONLY the intent key — no explanation, no punctuation, no extra words.
2. Choose the most relevant intent key based on the user's request.
3. If nothing matches, respond with: unknown
4. Never invent new intent keys outside the provided list.

Examples:
User: "analyze my csv file" → csv_analysis
User: "summarize this pdf" → document_processing
User: "send an email to my team" → email_automation
User: "hello" → hello_world
User: "book me a flight" → unknown`;
    try {
        const result = await groqRequest({
            model: DEFAULT_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userInput },
            ],
            temperature: 0, // deterministic — classification needs consistency
            max_tokens: 20, // intent key is never more than ~5 words
        });
        const raw = result.choices[0]?.message?.content?.trim().toLowerCase();
        if (!raw)
            return null;
        // Validate — only return if it's one of our known keys
        if (validIntentKeys.includes(raw))
            return raw;
        // Groq returned "unknown" or something unexpected
        return null;
    }
    catch (err) {
        // Log but don't throw — caller handles fallback
        console.error(`[groq] classifyIntent failed: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}
