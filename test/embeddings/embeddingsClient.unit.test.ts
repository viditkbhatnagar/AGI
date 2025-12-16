/**
 * Embeddings Client Unit Tests
 * 
 * Tests for the embeddings client including batching, retries, and provider handling.
 * 
 * Run: npm run test:run -- test/embeddings/embeddingsClient.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Google Generative AI
vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
            embedContent: vi.fn().mockResolvedValue({
                embedding: { values: Array(768).fill(0.1) },
            }),
        }),
    })),
}));

import {
    embedTexts,
    DEFAULT_PROVIDER,
    BATCH_SIZE,
    MAX_RETRIES,
    chunkArray,
    normalizeEmbedding,
} from "../../server/services/flashcard/embeddings/embeddingsClient";

// =============================================================================
// SETUP
// =============================================================================

beforeEach(() => {
    vi.clearAllMocks();
    // Set required env vars for testing
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.OPENAI_API_KEY = "test-openai-key";
});

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.EMBEDDING_PROVIDER;
});

// =============================================================================
// BASIC TESTS
// =============================================================================

describe("embedTexts - Basic", () => {
    it("should return empty array for empty input", async () => {
        const result = await embedTexts([]);
        expect(result).toEqual([]);
    });

    it("should return empty array for array of empty strings", async () => {
        const result = await embedTexts(["", "  ", "   "]);
        expect(result).toEqual([]);
    });

    it("should filter out empty strings from input", async () => {
        process.env.EMBEDDING_PROVIDER = "gemini";

        const result = await embedTexts(["hello", "", "world"]);

        // Should only generate embeddings for non-empty strings
        expect(result.length).toBe(2);
    });
});

// =============================================================================
// OPENAI PROVIDER TESTS
// =============================================================================

describe("embedTexts - OpenAI", () => {
    beforeEach(() => {
        process.env.EMBEDDING_PROVIDER = "openai";
    });

    it("should call OpenAI API with correct parameters", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                data: [
                    { index: 0, embedding: Array(1536).fill(0.1) },
                    { index: 1, embedding: Array(1536).fill(0.2) },
                ],
                usage: { prompt_tokens: 10, total_tokens: 10 },
            }),
        });

        const result = await embedTexts(["text one", "text two"]);

        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.openai.com/v1/embeddings",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Content-Type": "application/json",
                    Authorization: "Bearer test-openai-key",
                }),
            })
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveLength(1536);
    });

    it("should throw error when API key is missing", async () => {
        delete process.env.OPENAI_API_KEY;

        await expect(embedTexts(["test"])).rejects.toThrow("OPENAI_API_KEY not set");
    });

    it("should throw error on API failure", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: vi.fn().mockResolvedValue("Unauthorized"),
        });

        await expect(embedTexts(["test"])).rejects.toThrow(/OpenAI embedding failed/);
    });
});

// =============================================================================
// BATCHING TESTS
// =============================================================================

describe("embedTexts - Batching", () => {
    it("should split large arrays into batches", async () => {
        process.env.EMBEDDING_PROVIDER = "openai";

        const texts = Array(150).fill("test text");

        // Mock multiple batch calls
        mockFetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                data: Array(64).fill(null).map((_, i) => ({
                    index: i,
                    embedding: Array(1536).fill(0.1),
                })),
                usage: { prompt_tokens: 100, total_tokens: 100 },
            }),
        });

        const result = await embedTexts(texts);

        // Should make multiple API calls
        expect(mockFetch).toHaveBeenCalledTimes(3); // 150/64 = 3 batches
        expect(result.length).toBe(150);
    });

    it("chunkArray should split correctly", () => {
        const arr = [1, 2, 3, 4, 5, 6, 7];

        expect(chunkArray(arr, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
        expect(chunkArray(arr, 10)).toEqual([[1, 2, 3, 4, 5, 6, 7]]);
        expect(chunkArray([], 5)).toEqual([]);
    });
});

// =============================================================================
// RETRY TESTS
// =============================================================================

describe("embedTexts - Retries", () => {
    it("should retry on transient errors", async () => {
        process.env.EMBEDDING_PROVIDER = "openai";

        // First call fails, second succeeds
        mockFetch
            .mockRejectedValueOnce(new Error("timeout"))
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    data: [{ index: 0, embedding: Array(1536).fill(0.1) }],
                    usage: { prompt_tokens: 5, total_tokens: 5 },
                }),
            });

        const result = await embedTexts(["test"]);

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(1);
    });

    it("should retry on rate limit errors", async () => {
        process.env.EMBEDDING_PROVIDER = "openai";

        mockFetch
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                text: vi.fn().mockResolvedValue("Rate limited"),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    data: [{ index: 0, embedding: Array(1536).fill(0.1) }],
                    usage: { prompt_tokens: 5, total_tokens: 5 },
                }),
            });

        const result = await embedTexts(["test"]);

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(1);
    });

    it("should throw after max retries", async () => {
        process.env.EMBEDDING_PROVIDER = "openai";

        mockFetch.mockRejectedValue(new Error("timeout"));

        await expect(embedTexts(["test"])).rejects.toThrow("timeout");
        expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRIES);
    });

    it("should not retry on non-transient errors", async () => {
        process.env.EMBEDDING_PROVIDER = "openai";

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: vi.fn().mockResolvedValue("Bad request"),
        });

        await expect(embedTexts(["test"])).rejects.toThrow(/OpenAI embedding failed/);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});

// =============================================================================
// LOCAL PROVIDER TESTS
// =============================================================================

describe("embedTexts - Local", () => {
    beforeEach(() => {
        process.env.EMBEDDING_PROVIDER = "local";
    });

    it("should throw error when URL not configured", async () => {
        delete process.env.EMBEDDINGS_LOCAL_URL;

        await expect(embedTexts(["test"])).rejects.toThrow(
            /Local embedding service URL not configured/
        );
    });

    it("should call local service with correct payload", async () => {
        process.env.EMBEDDINGS_LOCAL_URL = "http://localhost:8080/embed";

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                embeddings: [Array(768).fill(0.1)],
            }),
        });

        const result = await embedTexts(["test"]);

        expect(mockFetch).toHaveBeenCalledWith(
            "http://localhost:8080/embed",
            expect.objectContaining({
                method: "POST",
                body: expect.stringContaining("test"),
            })
        );

        expect(result).toHaveLength(1);
    });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("normalizeEmbedding", () => {
    it("should convert values to numbers", () => {
        const input = [0.1, "0.2", 0.3] as unknown as number[];
        const result = normalizeEmbedding(input);

        expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("should replace non-finite values with 0", () => {
        const input = [0.1, NaN, Infinity, -Infinity, 0.5];
        const result = normalizeEmbedding(input);

        expect(result).toEqual([0.1, 0, 0, 0, 0.5]);
    });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe("Configuration", () => {
    it("should have correct default values", () => {
        expect(BATCH_SIZE).toBe(64);
        expect(MAX_RETRIES).toBe(3);
    });

    it("should use gemini as default provider", () => {
        delete process.env.EMBEDDING_PROVIDER;
        expect(DEFAULT_PROVIDER).toBe("gemini");
    });
});
