"use strict";
/**
 * services/intent.service.ts
 *
 * Detects user intent from natural language input.
 *
 * Phase 1: keyword-based matching — fast, deterministic, no external calls.
 * Phase 3: this entire implementation gets replaced with an AI call
 *           (Mistral/Groq) without changing any other file.
 *
 * Returns an intent_key that maps 1:1 to workflow_registry.intent_key in DB.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectIntent = detectIntent;
exports.isIntentDetected = isIntentDetected;
// ---------------------------------------------------------------------------
// Keyword map
// Each intent_key maps to an array of trigger keywords/phrases.
// Order matters — first match wins.
// Phase 3 will replace this with AI classification.
// ---------------------------------------------------------------------------
const INTENT_KEYWORD_MAP = {
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
// Public API
// ---------------------------------------------------------------------------
/**
 * Detects the intent of a natural language input string.
 *
 * @param input - Raw user input e.g. "Analyze my CSV file"
 * @returns IntentResult on match, IntentDetectionFailed if no match found
 *
 * @example
 * detectIntent("Analyze my CSV") → { intent_key: "csv_analysis", confidence: "high", matched_term: "csv" }
 * detectIntent("hello")          → { intent_key: "hello_world",  confidence: "high", matched_term: "hello" }
 * detectIntent("do something")   → { intent_key: null, reason: "No matching intent found..." }
 */
function detectIntent(input) {
    if (!input || input.trim().length === 0) {
        return {
            intent_key: null,
            confidence: null,
            matched_term: null,
            reason: "Input is empty.",
        };
    }
    const normalized = input.toLowerCase().trim();
    for (const [intent_key, keywords] of Object.entries(INTENT_KEYWORD_MAP)) {
        for (const keyword of keywords) {
            if (normalized.includes(keyword)) {
                return {
                    intent_key,
                    confidence: "high",
                    matched_term: keyword,
                };
            }
        }
    }
    return {
        intent_key: null,
        confidence: null,
        matched_term: null,
        reason: `No matching intent found for: "${input}". Try including keywords like: csv, pdf, email, report, or hello.`,
    };
}
/**
 * Type guard — narrows DetectIntentResult to a successful IntentResult.
 */
function isIntentDetected(result) {
    return result.intent_key !== null;
}
