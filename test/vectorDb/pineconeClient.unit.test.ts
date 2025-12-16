/**
 * Pinecone Client Unit Tests
 * 
 * Tests for Pinecone vector database operations including upserts and queries.
 * 
 * Run: npm run test:run -- test/vectorDb/pineconeClient.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock embeddings client
vi.mock("../../server/services/flashcard/embeddings/embeddingsClient", () => ({
    embedTexts: vi.fn().mockResolvedValue([
        Array(768).fill(0.1),
        Array(768).fill(0.2),
    ]),
}));

// Mock Pinecone SDK
const mockUpsert = vi.fn().mockResolvedValue({ upsertedCount: 2 });
const mockQuery = vi.fn().mockResolvedValue({
    matches: [
        {
            id: "mod-test::chunk-001",
            score: 0.95,
            metadata: { chunk_id: "chunk-001", module_id: "mod-test", text: "Test text" },
        },
        {
            id: "mod-test::chunk-002",
            score: 0.85,
            metadata: { chunk_id: "chunk-002", module_id: "mod-test", text: "Another text" },
        },
    ],
});
const mockDescribeIndexStats = vi.fn().mockResolvedValue({ totalRecordCount: 100 });

vi.mock("@pinecone-database/pinecone", () => ({
    Pinecone: vi.fn().mockImplementation(() => ({
        index: vi.fn().mockReturnValue({
            upsert: mockUpsert,
            query: mockQuery,
            describeIndexStats: mockDescribeIndexStats,
        }),
    })),
}));

import {
    upsertChunksToPinecone,
    queryChunksFromPinecone,
    getIndexStats,
    PINECONE_INDEX,
    UPSERT_BATCH_SIZE,
} from "../../server/services/flashcard/vectorDb/pineconeClient";
import { embedTexts } from "../../server/services/flashcard/embeddings/embeddingsClient";
import type { ContextChunk } from "../../server/services/flashcard/transcription/types";

// =============================================================================
// SETUP
// =============================================================================

beforeEach(() => {
    vi.clearAllMocks();
    process.env.PINECONE_API_KEY = "test-pinecone-key";
    process.env.PINECONE_INDEX = "test-index";
});

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PINECONE_API_KEY;
    delete process.env.PINECONE_INDEX;
});

// =============================================================================
// TEST DATA
// =============================================================================

function createTestChunk(id: string, text: string = "Test content"): ContextChunk {
    return {
        chunk_id: id,
        source_file: "test.mp4",
        provider: "local",
        slide_or_page: "00:00:00-00:00:10",
        start_sec: 0,
        end_sec: 10,
        heading: null,
        text,
        tokens_est: 10,
    };
}

// =============================================================================
// UPSERT TESTS
// =============================================================================

describe("upsertChunksToPinecone", () => {
    it("should return 0 for empty chunks array", async () => {
        const result = await upsertChunksToPinecone({
            chunks: [],
            module_id: "mod-test",
        });

        expect(result.upserted).toBe(0);
        expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("should generate embeddings for chunks without them", async () => {
        const chunks = [
            createTestChunk("chunk-001", "First chunk text"),
            createTestChunk("chunk-002", "Second chunk text"),
        ];

        await upsertChunksToPinecone({
            chunks,
            module_id: "mod-test",
        });

        expect(embedTexts).toHaveBeenCalledWith(
            ["First chunk text", "Second chunk text"],
            expect.any(Object)
        );
    });

    it("should not call embedTexts if all chunks have embeddings", async () => {
        const chunks = [
            { ...createTestChunk("chunk-001"), embedding: Array(768).fill(0.1) },
            { ...createTestChunk("chunk-002"), embedding: Array(768).fill(0.2) },
        ];

        await upsertChunksToPinecone({
            chunks,
            module_id: "mod-test",
        });

        expect(embedTexts).not.toHaveBeenCalled();
    });

    it("should create correct vector IDs", async () => {
        const chunks = [
            { ...createTestChunk("chunk-abc"), embedding: Array(768).fill(0.1) },
        ];

        await upsertChunksToPinecone({
            chunks,
            module_id: "mod-hr-101",
        });

        expect(mockUpsert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "mod-hr-101::chunk-abc",
                }),
            ])
        );
    });

    it("should include all metadata in upsert", async () => {
        const chunk: ContextChunk = {
            chunk_id: "chunk-001",
            source_file: "lecture.mp4",
            provider: "google_drive",
            slide_or_page: "00:01:30-00:02:00",
            start_sec: 90,
            end_sec: 120,
            heading: "Introduction",
            text: "This is the introduction text.",
            tokens_est: 25,
            embedding: Array(768).fill(0.1),
        };

        await upsertChunksToPinecone({
            chunks: [chunk],
            module_id: "mod-test",
        });

        expect(mockUpsert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        chunk_id: "chunk-001",
                        module_id: "mod-test",
                        source_file: "lecture.mp4",
                        provider: "google_drive",
                        slide_or_page: "00:01:30-00:02:00",
                        start_sec: 90,
                        end_sec: 120,
                        heading: "Introduction",
                        tokens_est: 25,
                    }),
                }),
            ])
        );
    });

    it("should batch upserts correctly", async () => {
        // Create more chunks than batch size
        const chunks = Array(150)
            .fill(null)
            .map((_, i) => ({
                ...createTestChunk(`chunk-${i}`),
                embedding: Array(768).fill(0.1),
            }));

        await upsertChunksToPinecone({
            chunks,
            module_id: "mod-test",
        });

        // Should be called twice (150 / 100 = 2 batches)
        expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it("should return total upserted count", async () => {
        mockUpsert.mockResolvedValue({ upsertedCount: 50 });

        const chunks = Array(100)
            .fill(null)
            .map((_, i) => ({
                ...createTestChunk(`chunk-${i}`),
                embedding: Array(768).fill(0.1),
            }));

        const result = await upsertChunksToPinecone({
            chunks,
            module_id: "mod-test",
        });

        expect(result.upserted).toBe(100); // 50 per batch * 2 batches
    });
});

// =============================================================================
// QUERY TESTS
// =============================================================================

describe("queryChunksFromPinecone", () => {
    it("should embed query text when provided", async () => {
        await queryChunksFromPinecone({
            module_id: "mod-test",
            queryText: "What is organizational culture?",
            topK: 5,
        });

        expect(embedTexts).toHaveBeenCalledWith(
            ["What is organizational culture?"],
            expect.any(Object)
        );
    });

    it("should use provided query vector without embedding", async () => {
        const queryVector = Array(768).fill(0.5);

        await queryChunksFromPinecone({
            module_id: "mod-test",
            queryVector,
            topK: 5,
        });

        expect(embedTexts).not.toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                vector: queryVector,
            })
        );
    });

    it("should apply module_id filter", async () => {
        await queryChunksFromPinecone({
            module_id: "mod-hr-101",
            queryText: "test query",
            topK: 5,
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: expect.objectContaining({
                    module_id: { $eq: "mod-hr-101" },
                }),
            })
        );
    });

    it("should include additional filters", async () => {
        await queryChunksFromPinecone({
            module_id: "mod-test",
            queryText: "test",
            filter: { source_file: "lecture.mp4" },
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: expect.objectContaining({
                    module_id: { $eq: "mod-test" },
                    source_file: "lecture.mp4",
                }),
            })
        );
    });

    it("should return correct number of matches", async () => {
        const result = await queryChunksFromPinecone({
            module_id: "mod-test",
            queryText: "test",
            topK: 2,
        });

        expect(result.matches).toHaveLength(2);
        expect(result.matches[0].id).toBe("mod-test::chunk-001");
        expect(result.matches[0].score).toBe(0.95);
    });

    it("should respect topK parameter", async () => {
        await queryChunksFromPinecone({
            module_id: "mod-test",
            queryText: "test",
            topK: 10,
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                topK: 10,
            })
        );
    });

    it("should throw error when neither queryText nor queryVector provided", async () => {
        await expect(
            queryChunksFromPinecone({
                module_id: "mod-test",
            })
        ).rejects.toThrow(/Either queryText or queryVector must be provided/);
    });

    it("should include metadata by default", async () => {
        await queryChunksFromPinecone({
            module_id: "mod-test",
            queryText: "test",
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                includeMetadata: true,
            })
        );
    });

    it("should not include vector by default", async () => {
        await queryChunksFromPinecone({
            module_id: "mod-test",
            queryText: "test",
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                includeValues: false,
            })
        );
    });

    it("should include vector when requested", async () => {
        await queryChunksFromPinecone({
            module_id: "mod-test",
            queryText: "test",
            includeVector: true,
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                includeValues: true,
            })
        );
    });
});

// =============================================================================
// UTILITY TESTS
// =============================================================================

describe("getIndexStats", () => {
    it("should return index statistics", async () => {
        const stats = await getIndexStats();

        expect(mockDescribeIndexStats).toHaveBeenCalled();
        expect(stats.totalRecordCount).toBe(100);
    });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("Error Handling", () => {
    it("should throw error when API key is missing", async () => {
        delete process.env.PINECONE_API_KEY;

        await expect(
            upsertChunksToPinecone({
                chunks: [createTestChunk("chunk-001")],
                module_id: "mod-test",
            })
        ).rejects.toThrow(/Pinecone API key not configured/);
    });

    it("should handle upsert failures gracefully", async () => {
        mockUpsert.mockRejectedValueOnce(new Error("Connection timeout"));

        await expect(
            upsertChunksToPinecone({
                chunks: [{ ...createTestChunk("chunk-001"), embedding: Array(768).fill(0.1) }],
                module_id: "mod-test",
            })
        ).rejects.toThrow(/Connection timeout/);
    });

    it("should handle query failures gracefully", async () => {
        mockQuery.mockRejectedValueOnce(new Error("Query failed"));

        await expect(
            queryChunksFromPinecone({
                module_id: "mod-test",
                queryText: "test",
            })
        ).rejects.toThrow(/Pinecone query failed/);
    });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe("Configuration", () => {
    it("should use default index name if not set", () => {
        delete process.env.PINECONE_INDEX;
        expect(PINECONE_INDEX).toBe("flashcard-chunks");
    });

    it("should have correct batch size", () => {
        expect(UPSERT_BATCH_SIZE).toBe(100);
    });
});
