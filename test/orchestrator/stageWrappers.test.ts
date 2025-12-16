/**
 * Stage Wrappers Unit Tests
 * 
 * Tests LLM wrapper functions with mocked API calls.
 * 
 * Run: npm run test:run -- test/orchestrator/stageWrappers.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    extractJSON,
    isRetryableError,
    withTimeout,
} from "../../server/services/flashcard/orchestrator/stageWrappers";
import {
    STAGE_A_EXAMPLE_OUTPUT,
    STAGE_B_EXAMPLE_OUTPUT,
    STAGE_A_EXAMPLE_CHUNKS,
} from "../../server/services/flashcard/orchestrator/fewShots";

// =============================================================================
// MOCK JOB LOGGER
// =============================================================================

vi.mock("../../server/services/flashcard/queue/jobLogger", () => ({
    storeRawOutput: vi.fn(),
    addLogEntry: vi.fn(),
    getLogsUrl: vi.fn().mockReturnValue("/logs/test-job"),
}));

// =============================================================================
// extractJSON TESTS
// =============================================================================

describe("extractJSON", () => {
    it("should parse valid JSON directly", () => {
        const json = '{"key": "value", "number": 42}';
        const result = extractJSON(json);
        expect(result).toEqual({ key: "value", number: 42 });
    });

    it("should extract JSON from markdown code block", () => {
        const markdown = `Here is some text before.
\`\`\`json
{"module_summary": [{"point": "test", "supports": ["c1"]}]}
\`\`\`
And some text after.`;

        const result = extractJSON(markdown);
        expect(result).toEqual({
            module_summary: [{ point: "test", supports: ["c1"] }],
        });
    });

    it("should extract JSON object embedded in text", () => {
        const text = `Some preamble text...
    
    {"cards": [{"card_id": "M1_C1", "q": "Question?"}]}
    
    Some trailing text`;

        const result = extractJSON(text);
        expect(result).toEqual({
            cards: [{ card_id: "M1_C1", q: "Question?" }],
        });
    });

    it("should handle JSON with whitespace and newlines", () => {
        const json = `
    {
      "key": "value",
      "nested": {
        "inner": true
      }
    }
    `;
        const result = extractJSON(json);
        expect(result).toEqual({ key: "value", nested: { inner: true } });
    });

    it("should return null for invalid JSON", () => {
        const invalid = "This is not JSON at all";
        const result = extractJSON(invalid);
        expect(result).toBeNull();
    });

    it("should return null for malformed JSON", () => {
        const malformed = '{"key": "value", "unclosed": }';
        const result = extractJSON(malformed);
        expect(result).toBeNull();
    });

    it("should handle Stage A example output", () => {
        const jsonStr = JSON.stringify(STAGE_A_EXAMPLE_OUTPUT);
        const result = extractJSON(jsonStr);
        expect(result).toEqual(STAGE_A_EXAMPLE_OUTPUT);
    });

    it("should handle Stage B example output", () => {
        const jsonStr = JSON.stringify(STAGE_B_EXAMPLE_OUTPUT);
        const result = extractJSON(jsonStr);
        expect(result).toEqual(STAGE_B_EXAMPLE_OUTPUT);
    });
});

// =============================================================================
// isRetryableError TESTS
// =============================================================================

describe("isRetryableError", () => {
    it("should identify 429 rate limit as retryable", () => {
        const error = new Error("API returned 429 Too Many Requests");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should identify rate limit message as retryable", () => {
        const error = new Error("Rate limit exceeded, please try again later");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should identify 500 server error as retryable", () => {
        const error = new Error("Server returned 500 Internal Server Error");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should identify 502 bad gateway as retryable", () => {
        const error = new Error("502 Bad Gateway");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should identify 503 service unavailable as retryable", () => {
        const error = new Error("503 Service Unavailable");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should identify timeout as retryable", () => {
        const error = new Error("Request timeout after 30000ms");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should identify socket hang up as retryable", () => {
        const error = new Error("socket hang up");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should identify ECONNRESET as retryable", () => {
        const error = new Error("read ECONNRESET");
        expect(isRetryableError(error)).toBe(true);
    });

    it("should not identify 400 bad request as retryable", () => {
        const error = new Error("400 Bad Request: Invalid input");
        expect(isRetryableError(error)).toBe(false);
    });

    it("should not identify authentication error as retryable", () => {
        const error = new Error("401 Unauthorized: Invalid API key");
        expect(isRetryableError(error)).toBe(false);
    });

    it("should not identify schema validation error as retryable", () => {
        const error = new Error("Schema validation failed: missing required field");
        expect(isRetryableError(error)).toBe(false);
    });
});

// =============================================================================
// withTimeout TESTS
// =============================================================================

describe("withTimeout", () => {
    it("should resolve before timeout", async () => {
        const fastPromise = new Promise<string>(resolve => {
            setTimeout(() => resolve("success"), 50);
        });

        const result = await withTimeout(fastPromise, 1000, "test");
        expect(result).toBe("success");
    });

    it("should reject on timeout", async () => {
        const slowPromise = new Promise<string>(resolve => {
            setTimeout(() => resolve("too late"), 500);
        });

        await expect(withTimeout(slowPromise, 100, "test operation"))
            .rejects.toThrow("test operation timed out after 100ms");
    });

    it("should propagate promise errors", async () => {
        const errorPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error("original error")), 50);
        });

        await expect(withTimeout(errorPromise, 1000, "test"))
            .rejects.toThrow("original error");
    });
});

// =============================================================================
// STAGE WRAPPER INTEGRATION TESTS (with mocked LLM)
// =============================================================================

describe("Stage Wrappers Integration", () => {
    // These tests would require mocking the LLM client
    // For now, we test the supporting utilities

    it("should have valid example chunks for testing", () => {
        expect(STAGE_A_EXAMPLE_CHUNKS).toHaveLength(3);
        expect(STAGE_A_EXAMPLE_CHUNKS[0].chunk_id).toBe("c1");
        expect(STAGE_A_EXAMPLE_CHUNKS[0].text).toContain("Organizational culture");
    });

    it("should have valid example outputs for testing", () => {
        expect(STAGE_A_EXAMPLE_OUTPUT.module_summary.length).toBeGreaterThanOrEqual(6);
        expect(STAGE_A_EXAMPLE_OUTPUT.key_topics.length).toBeGreaterThanOrEqual(6);
        expect(STAGE_B_EXAMPLE_OUTPUT.cards.length).toBe(3);
    });
});

// =============================================================================
// MOCK LLM CLIENT TESTS
// =============================================================================

describe("LLM Client Behavior (Mocked)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should handle empty response gracefully", () => {
        const result = extractJSON("");
        expect(result).toBeNull();
    });

    it("should handle response with only markdown", () => {
        const result = extractJSON("# Heading\n\nSome paragraph text without JSON.");
        expect(result).toBeNull();
    });

    it("should extract deeply nested JSON", () => {
        const nested = {
            outer: {
                middle: {
                    inner: {
                        value: "deep"
                    }
                }
            }
        };
        const result = extractJSON(JSON.stringify(nested));
        expect(result).toEqual(nested);
    });

    it("should handle JSON arrays", () => {
        const array = [1, 2, 3, { key: "value" }];
        // Note: extractJSON looks for objects first
        const jsonStr = JSON.stringify({ items: array });
        const result = extractJSON(jsonStr);
        expect(result).toEqual({ items: array });
    });
});

// =============================================================================
// RETRY LOGIC TESTS
// =============================================================================

describe("Retry Logic", () => {
    it("should detect various 5xx errors as retryable", () => {
        const errors = [
            new Error("500"),
            new Error("502"),
            new Error("503"),
            new Error("504"),
        ];

        for (const error of errors) {
            expect(isRetryableError(error)).toBe(true);
        }
    });

    it("should not retry on 4xx client errors (except 429)", () => {
        const nonRetryable = [
            new Error("400 Bad Request"),
            new Error("401 Unauthorized"),
            new Error("403 Forbidden"),
            new Error("404 Not Found"),
        ];

        for (const error of nonRetryable) {
            expect(isRetryableError(error)).toBe(false);
        }
    });
});
