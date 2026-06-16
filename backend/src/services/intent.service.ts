/**
 * services/intent.service.ts
 *
 * Detects user intent from natural language input.
 *
 * Phase 1: keyword-based matching (fast, deterministic, no external calls)
 * Phase 3: AI-powered classification via Groq as primary,
 *           keyword matching as fallback if AI fails/times out.
 *
 * The public API (detectIntent, isIntentDetected) is unchanged —
 * no other file needed to be modified for this upgrade.
 */

import { classifyIntent } from "../lib/groq";
import { listActiveWorkflows } from "./registry.service";

// ---------------------------------------------------------------------------
// Types — unchanged from Phase 1
// ---------------------------------------------------------------------------

export interface IntentResult {
  intent_key: string;
  confidence: "high" | "low";
  matched_term: string | null;
  method: "ai" | "keyword";   // Phase 3: track which method was used
}

export interface IntentDetectionFailed {
  intent_key: null;
  confidence: null;
  matched_term: null;
  method: null;
  reason: string;
}

export type DetectIntentResult = IntentResult | IntentDetectionFailed;

// ---------------------------------------------------------------------------
// Keyword fallback map — kept from Phase 1
// Used when Groq is unavailable or returns null
// ---------------------------------------------------------------------------

const INTENT_KEYWORD_MAP: Record<string, string[]> = {
  csv_analysis: [
    "csv",
    "spreadsheet",
    "analyze my data",
    "analyse my data",
    "data analysis",
    "parse csv",
  ],
  document_processing: [
    "pdf",
    "document",
    "summarize",
    "summarise",
    "extract text",
    "doc",
    "docx",
  ],
  email_automation: [
    "email",
    "send mail",
    "draft email",
    "write email",
    "compose email",
  ],
  data_extraction: [
    "extract",
    "scrape",
    "pull data",
    "fetch data",
    "get data from",
  ],
  report_generation: [
    "report",
    "generate report",
    "create report",
    "build report",
  ],
  hello_world: [
    "hello",
    "test",
    "ping",
    "hi",
    "hey",
    "hello world",
  ],
};

// ---------------------------------------------------------------------------
// Keyword fallback (private)
// ---------------------------------------------------------------------------

function detectByKeyword(input: string): DetectIntentResult {
  const normalized = input.toLowerCase().trim();

  for (const [intent_key, keywords] of Object.entries(INTENT_KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return {
          intent_key,
          confidence: "low",      // keyword match is lower confidence than AI
          matched_term: keyword,
          method: "keyword",
        };
      }
    }
  }

  return {
    intent_key: null,
    confidence: null,
    matched_term: null,
    method: null,
    reason: `No matching intent found for: "${input}". Try describing your task differently.`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects the intent of a natural language input string.
 *
 * Strategy:
 * 1. Fetch active intent keys from the registry (live, not hardcoded)
 * 2. Send to Groq for AI classification
 * 3. If AI fails or returns null → fall back to keyword matching
 * 4. If keyword matching also fails → return IntentDetectionFailed
 *
 * @param input - Raw user input e.g. "Analyze my CSV file"
 */
export async function detectIntent(
  input: string
): Promise<DetectIntentResult> {
  if (!input || input.trim().length === 0) {
    return {
      intent_key: null,
      confidence: null,
      matched_term: null,
      method: null,
      reason: "Input is empty.",
    };
  }

  // 1. Fetch live intent keys from registry
  // Falls back gracefully if registry call fails
  let validIntentKeys: string[] = Object.keys(INTENT_KEYWORD_MAP);
  try {
    const workflows = await listActiveWorkflows();
    if (workflows.length > 0) {
      validIntentKeys = workflows.map((w) => w.intent_key);
    }
  } catch {
    console.warn(
      "[intent] Could not fetch registry — using static intent keys as fallback"
    );
  }

  // 2. Try AI classification first
  console.log(`[intent] Classifying via Groq: "${input}"`);
  const aiResult = await classifyIntent({
    userInput: input,
    validIntentKeys,
  });

  if (aiResult) {
    console.log(`[intent] Groq classified as: "${aiResult}"`);
    return {
      intent_key: aiResult,
      confidence: "high",
      matched_term: null,    // AI doesn't match a specific term
      method: "ai",
    };
  }

  // 3. Groq failed or returned null — fall back to keyword matching
  console.warn(
    "[intent] Groq classification failed or returned unknown — falling back to keyword match"
  );
  return detectByKeyword(input);
}

/**
 * Type guard — narrows DetectIntentResult to a successful IntentResult.
 * Unchanged from Phase 1.
 */
export function isIntentDetected(
  result: DetectIntentResult
): result is IntentResult {
  return result.intent_key !== null;
}