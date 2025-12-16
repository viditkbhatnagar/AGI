/**
 * Upsert Helper Integration Tests
 * 
 * Tests the full upsert flow with mocked embeddings and vector DB.
 * Verifies that the transcription worker can call upsertChunks correctly.
 * 
 * Run: npm run test:run -- test/vectorDb/upsertHelper.integration.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =============================================================================
// MOCKS
// =============================================================================

// Mock embeddings - deterministic vector generation
const mockEmbedText = vi.fn().mockImplementation((texts: string[]) => {
    return texts.map((text: string) => {
        // Generate deterministic embedding based on text hash
        const hash = text.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
        return Array(768).fill(0).map((_, i) => Math.sin(hash + i) * 0.5 + 0.5);
    });
});

vi.mock("../../server/services/flashcard/vectorDb/embeddings", () => ({
    embedText: mockEmbedText,
    getEmbeddingConfig: vi.fn().mockReturnValue({
        provider: "gemini",
        dimension: 768,
    }),
}));

// Mock retrieveChunks (for config)
vi.mock("../../server/services/flashcard/vectorDb/retrieveChunks", () => ({
    getVectorDbConfig: vi.fn().mockReturnValue({
        provider: process.env.VECTOR_DB_PROVIDER || "qdrant",
        qdrantUrl: "http://localhost:6333",
        qdrantCollectionName: "test-collection",
        embeddingDimension: 768,
    }),
}));

// Mock fetch for Qdrant HTTP calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { upsertChunks, deleteModuleChunks } from "../../server/services/flashcard/vectorDb/upsertChunks";
import type { ContextChunk } from "../../server/services/flashcard/vectorDb/types";

// =============================================================================
// SETUP
// =============================================================================

beforeEach(() => {
    vi.clearAllMocks();
    process.env.VECTOR_DB_PROVIDER = "qdrant";
    process.env.QDRANT_URL = "http://localhost:6333";

    // Default mock responses
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        // Collection check
        if (url.includes("/collections/") && options?.method === "GET") {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ result: { status: "ok" } }),
            });
        }

        // Upsert
        if (url.includes("/points") && options?.method === "PUT") {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: "ok" }),
            });
        }

        // Create collection
        if (!url.includes("/points") && options?.method === "PUT") {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ result: true }),
            });
        }

        // Create index
        if (url.includes("/index") && options?.method === "PUT") {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ result: true }),
            });
        }

        // Delete
        if (url.includes("/delete")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ result: true }),
            });
        }

        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
        });
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.VECTOR_DB_PROVIDER;
    delete process.env.QDRANT_URL;
});

// =============================================================================
// TEST DATA
// =============================================================================

function createTestChunks(count: number): ContextChunk[] {
    return Array(count).fill(null).map((_, i) => ({
        chunk_id: `chunk-${i.toString().padStart(3, "0")}`,
        source_file: "test_lecture.mp4",
        provider: "local" as const,
        slide_or_page: `00:0${i}:00-00:0${i}:30`,
        start_sec: i * 60,
        end_sec: i * 60 + 30,
        heading: `Section ${i + 1}`,
        text: `This is the content of chunk ${i + 1}. It contains important information about the topic.`,
        tokens_est: 20,
    }));
}

// =============================================================================
// BASIC UPSERT TESTS
// =============================================================================

describe("upsertChunks - Basic Flow", () => {
    it("should do nothing for empty chunks array", async () => {
        await upsertChunks({
            chunks: [],
            module_id: "mod-test",
        });

        // Should not call embedText or fetch
        expect(mockEmbedText).not.toHaveBeenCalled();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should generate embeddings and upsert chunks", async () => {
        const chunks = createTestChunks(3);

        await upsertChunks({
            chunks,
            module_id: "mod-hr-101",
        });

        // Should generate embeddings
        expect(mockEmbedText).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.stringContaining("chunk 1"),
                expect.stringContaining("chunk 2"),
                expect.stringContaining("chunk 3"),
            ])
        );

        // Should call Qdrant upsert
        const upsertCalls = mockFetch.mock.calls.filter(
            ([url, opts]) => url.includes("/points") && opts?.method === "PUT"
        );
        expect(upsertCalls.length).toBeGreaterThan(0);
    });

    it("should not call embedText for chunks with existing embeddings", async () => {
        const chunks = createTestChunks(2).map(chunk => ({
            ...chunk,
            embedding: Array(768).fill(0.5),
        }));

        await upsertChunks({
            chunks,
            module_id: "mod-test",
        });

        expect(mockEmbedText).not.toHaveBeenCalled();
    });

    it("should only embed chunks without embeddings", async () => {
        const chunks = [
            { ...createTestChunks(1)[0], embedding: Array(768).fill(0.1) },
            createTestChunks(1)[0], // No embedding
        ];
        chunks[1].chunk_id = "chunk-no-embed";
        chunks[1].text = "No embedding text";

        await upsertChunks({
            chunks,
            module_id: "mod-test",
        });

        expect(mockEmbedText).toHaveBeenCalledWith(["No embedding text"]);
    });
});

// =============================================================================
// METADATA TESTS
// =============================================================================

describe("upsertChunks - Metadata", () => {
    it("should include all metadata in upsert payload", async () => {
        const chunk: ContextChunk = {
            chunk_id: "chunk-metadata-test",
            source_file: "lecture.mp4",
            provider: "google_drive",
            slide_or_page: "00:05:00-00:05:30",
            start_sec: 300,
            end_sec: 330,
            heading: "Important Topic",
            text: "This is the text content.",
            tokens_est: 15,
        };

        await upsertChunks({
            chunks: [chunk],
            module_id: "mod-meta-test",
        });

        // Find the upsert call
        const upsertCall = mockFetch.mock.calls.find(
            ([url, opts]) => url.includes("/points") && opts?.method === "PUT"
        );

        expect(upsertCall).toBeDefined();

        const body = JSON.parse(upsertCall[1].body);
        const point = body.points[0];

        expect(point.payload).toMatchObject({
            chunk_id: "chunk-metadata-test",
            module_id: "mod-meta-test",
            source_file: "lecture.mp4",
            provider: "google_drive",
            slide_or_page: "00:05:00-00:05:30",
            start_sec: 300,
            end_sec: 330,
            heading: "Important Topic",
            tokens_est: 15,
        });
    });
});

// =============================================================================
// BATCHING TESTS
// =============================================================================

describe("upsertChunks - Batching", () => {
    it("should batch large chunk arrays", async () => {
        const chunks = createTestChunks(150).map(c => ({
            ...c,
            embedding: Array(768).fill(0.1),
        }));

        await upsertChunks({
            chunks,
            module_id: "mod-batch-test",
        });

        // Should make multiple upsert calls (150/100 = 2 batches)
        const upsertCalls = mockFetch.mock.calls.filter(
            ([url, opts]) => url.includes("/points") && opts?.method === "PUT"
        );
        expect(upsertCalls.length).toBe(2);
    });

    it("should correctly split points across batches", async () => {
        const chunks = createTestChunks(250).map(c => ({
            ...c,
            embedding: Array(768).fill(0.1),
        }));

        await upsertChunks({
            chunks,
            module_id: "mod-test",
        });

        const upsertCalls = mockFetch.mock.calls.filter(
            ([url, opts]) => url.includes("/points") && opts?.method === "PUT"
        );

        // Should have 3 batches: 100 + 100 + 50
        expect(upsertCalls.length).toBe(3);

        // Verify batch sizes
        const firstBatch = JSON.parse(upsertCalls[0][1].body);
        const secondBatch = JSON.parse(upsertCalls[1][1].body);
        const thirdBatch = JSON.parse(upsertCalls[2][1].body);

        expect(firstBatch.points.length).toBe(100);
        expect(secondBatch.points.length).toBe(100);
        expect(thirdBatch.points.length).toBe(50);
    });
});

// =============================================================================
// IDEMPOTENCY TESTS
// =============================================================================

describe("upsertChunks - Idempotency", () => {
    it("should use consistent chunk IDs for idempotent upserts", async () => {
        const chunks = createTestChunks(2).map(c => ({
            ...c,
            embedding: Array(768).fill(0.1),
        }));

        // Upsert twice
        await upsertChunks({ chunks, module_id: "mod-idem" });
        await upsertChunks({ chunks, module_id: "mod-idem" });

        // Get all upsert calls
        const upsertCalls = mockFetch.mock.calls.filter(
            ([url, opts]) => url.includes("/points") && opts?.method === "PUT"
        );

        expect(upsertCalls.length).toBe(2);

        // Both should have same IDs
        const firstPoints = JSON.parse(upsertCalls[0][1].body).points;
        const secondPoints = JSON.parse(upsertCalls[1][1].body).points;

        expect(firstPoints.map((p: any) => p.id)).toEqual(
            secondPoints.map((p: any) => p.id)
        );
    });

    it("should use chunk_id as vector point ID", async () => {
        const chunk: ContextChunk = {
            chunk_id: "stable-chunk-id-123",
            source_file: "test.mp4",
            provider: "local",
            slide_or_page: null,
            start_sec: 0,
            end_sec: 10,
            heading: null,
            text: "Test text",
            tokens_est: 5,
            embedding: Array(768).fill(0.1),
        };

        await upsertChunks({
            chunks: [chunk],
            module_id: "mod-test",
        });

        const upsertCall = mockFetch.mock.calls.find(
            ([url, opts]) => url.includes("/points") && opts?.method === "PUT"
        );

        const body = JSON.parse(upsertCall[1].body);
        expect(body.points[0].id).toBe("stable-chunk-id-123");
    });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("upsertChunks - Error Handling", () => {
    it("should handle embedding failures", async () => {
        mockEmbedText.mockRejectedValueOnce(new Error("Embedding service unavailable"));

        const chunks = createTestChunks(1);

        await expect(
            upsertChunks({
                chunks,
                module_id: "mod-test",
            })
        ).rejects.toThrow();
    });

    it("should handle vector DB failures", async () => {
        mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
            if (url.includes("/points") && opts?.method === "PUT") {
                return Promise.resolve({
                    ok: false,
                    status: 500,
                    text: () => Promise.resolve("Internal server error"),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        const chunks = createTestChunks(1).map(c => ({
            ...c,
            embedding: Array(768).fill(0.1),
        }));

        await expect(
            upsertChunks({
                chunks,
                module_id: "mod-test",
            })
        ).rejects.toThrow(/upsert failed/i);
    });
});

// =============================================================================
// DELETE TESTS
// =============================================================================

describe("deleteModuleChunks", () => {
    it("should delete all chunks for a module", async () => {
        await deleteModuleChunks("mod-to-delete");

        const deleteCall = mockFetch.mock.calls.find(
            ([url]) => url.includes("/delete")
        );

        expect(deleteCall).toBeDefined();

        const body = JSON.parse(deleteCall[1].body);
        expect(body.filter.must[0]).toEqual({
            key: "module_id",
            match: { value: "mod-to-delete" },
        });
    });
});

// =============================================================================
// TRANSCRIPTION WORKER SIMULATION
// =============================================================================

describe("Transcription Worker Integration", () => {
    it("should work as called by transcription worker", async () => {
        // Simulate what transcriptionWorker.ts does
        const transcribedChunks = [
            {
                chunk_id: "mod-hr-101::file-001::chunk_0-5000",
                source_file: "lecture.mp4",
                provider: "google_drive" as const,
                slide_or_page: "00:00:00-00:00:05",
                start_sec: 0,
                end_sec: 5,
                heading: null,
                text: "Welcome to today's lecture on human resources.",
                tokens_est: 10,
            },
            {
                chunk_id: "mod-hr-101::file-001::chunk_5000-12000",
                source_file: "lecture.mp4",
                provider: "google_drive" as const,
                slide_or_page: "00:00:05-00:00:12",
                start_sec: 5,
                end_sec: 12,
                heading: null,
                text: "Today we will discuss talent acquisition strategies.",
                tokens_est: 12,
            },
        ];

        await upsertChunks({
            chunks: transcribedChunks,
            module_id: "mod-hr-101",
        });

        // Verify embeddings were generated
        expect(mockEmbedText).toHaveBeenCalledWith(expect.arrayContaining([
            "Welcome to today's lecture on human resources.",
            "Today we will discuss talent acquisition strategies.",
        ]));

        // Verify upsert was called
        const upsertCalls = mockFetch.mock.calls.filter(
            ([url, opts]) => url.includes("/points") && opts?.method === "PUT"
        );
        expect(upsertCalls.length).toBeGreaterThan(0);
    });
});
