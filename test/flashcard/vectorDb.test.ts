/**
 * Vector Database Tests
 * 
 * Unit tests for retrieveChunks, embedText, and upsertChunks
 * 
 * Run: npm run test:run -- test/flashcard/vectorDb.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ContextChunk } from "../../server/services/flashcard/vectorDb/types";

// =============================================================================
// MOCK DATA
// =============================================================================

const mockChunks: ContextChunk[] = [
  {
    chunk_id: "c1",
    source_file: "slides1.pptx",
    provider: "local",
    slide_or_page: "slide 2",
    start_sec: null,
    end_sec: null,
    heading: "Definition",
    text: "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations.",
    tokens_est: 20,
    score: 0.95,
  },
  {
    chunk_id: "c2",
    source_file: "reading1.pdf",
    provider: "local",
    slide_or_page: "p.12",
    start_sec: null,
    end_sec: null,
    heading: "Recruitment",
    text: "Recruitment refers to the process of attracting and selecting capable employees for an organization.",
    tokens_est: 18,
    score: 0.92,
  },
  {
    chunk_id: "c3",
    source_file: "lecture.mp4",
    provider: "google_drive",
    slide_or_page: "00:05:30-00:06:15",
    start_sec: 330,
    end_sec: 375,
    heading: "Training",
    text: "Employee training is essential for developing skills and improving performance in the workplace.",
    tokens_est: 15,
    score: 0.88,
  },
  {
    chunk_id: "c4",
    source_file: "slides2.pptx",
    provider: "local",
    slide_or_page: "slide 5",
    start_sec: null,
    end_sec: null,
    heading: "Performance",
    text: "Performance management involves setting goals, providing feedback, and evaluating employee contributions.",
    tokens_est: 16,
    score: 0.85,
  },
];

const mockEmbeddings = [
  [0.1, 0.2, 0.3, 0.4, 0.5],
  [0.2, 0.3, 0.4, 0.5, 0.6],
  [0.3, 0.4, 0.5, 0.6, 0.7],
  [0.4, 0.5, 0.6, 0.7, 0.8],
];

// =============================================================================
// RETRIEVE CHUNKS TESTS
// =============================================================================

describe("retrieveChunks", () => {
  let originalFetch: typeof global.fetch;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = { ...process.env };
    
    // Set default env
    process.env.VECTOR_DB_PROVIDER = "qdrant";
    process.env.QDRANT_URL = "http://localhost:6333";
    process.env.QDRANT_COLLECTION_NAME = "test_collection";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("should retrieve chunks from Qdrant with module_id filter", async () => {
    // Mock Qdrant scroll response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          points: mockChunks.map(chunk => ({
            id: chunk.chunk_id,
            payload: {
              chunk_id: chunk.chunk_id,
              source_file: chunk.source_file,
              provider: chunk.provider,
              slide_or_page: chunk.slide_or_page,
              start_sec: chunk.start_sec,
              end_sec: chunk.end_sec,
              heading: chunk.heading,
              text: chunk.text,
              tokens_est: chunk.tokens_est,
            },
          })),
        },
        status: "ok",
        time: 0.01,
      }),
    });

    const { retrieveChunks } = await import(
      "../../server/services/flashcard/vectorDb/retrieveChunks"
    );

    const result = await retrieveChunks({
      module_id: "mod-hr-101",
      retrieval_K: 8,
    });

    expect(result.chunks).toHaveLength(4);
    expect(result.metadata.insufficient).toBe(false);
    expect(result.metadata.provider).toBe("qdrant");
    expect(result.chunks[0].chunk_id).toBe("c1");
    expect(result.chunks[0].text).toContain("Organizational culture");

    // Verify fetch was called with correct URL and filter
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/collections/test_collection/points/scroll"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("mod-hr-101"),
      })
    );
  });

  it("should return insufficient flag when fewer than 4 chunks found", async () => {
    // Mock response with only 2 chunks
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          points: mockChunks.slice(0, 2).map(chunk => ({
            id: chunk.chunk_id,
            payload: { ...chunk },
          })),
        },
        status: "ok",
        time: 0.01,
      }),
    });

    const { retrieveChunks } = await import(
      "../../server/services/flashcard/vectorDb/retrieveChunks"
    );

    const result = await retrieveChunks({
      module_id: "mod-sparse",
      retrieval_K: 8,
    });

    expect(result.chunks).toHaveLength(2);
    expect(result.metadata.insufficient).toBe(true);
    expect(result.metadata.total_found).toBe(2);
  });

  it("should retry on network errors with exponential backoff", async () => {
    let callCount = 0;
    
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("Network error: ECONNREFUSED");
      }
      return {
        ok: true,
        json: async () => ({
          result: {
            points: mockChunks.map(chunk => ({
              id: chunk.chunk_id,
              payload: { ...chunk },
            })),
          },
          status: "ok",
          time: 0.01,
        }),
      };
    });

    const { retrieveChunks } = await import(
      "../../server/services/flashcard/vectorDb/retrieveChunks"
    );

    const result = await retrieveChunks({
      module_id: "mod-retry-test",
      retrieval_K: 8,
    });

    expect(callCount).toBe(3);
    expect(result.chunks).toHaveLength(4);
  });

  it("should throw after max retries exceeded", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error: timeout"));

    const { retrieveChunks } = await import(
      "../../server/services/flashcard/vectorDb/retrieveChunks"
    );

    await expect(
      retrieveChunks({ module_id: "mod-fail", retrieval_K: 8 })
    ).rejects.toThrow("timeout");
  }, 15000); // Extended timeout for retry delays

  it("should use Pinecone when VECTOR_DB_PROVIDER=pinecone", async () => {
    process.env.VECTOR_DB_PROVIDER = "pinecone";
    process.env.PINECONE_API_KEY = "test-api-key";
    process.env.PINECONE_INDEX = "test-index";

    // Mock Pinecone describe index
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ host: "test-index-abc123.svc.us-east1.pinecone.io" }),
      })
      // Mock list response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          vectors: mockChunks.map(c => ({ id: `mod-hr-101_${c.chunk_id}` })),
        }),
      })
      // Mock fetch response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          vectors: Object.fromEntries(
            mockChunks.map(c => [
              `mod-hr-101_${c.chunk_id}`,
              { id: `mod-hr-101_${c.chunk_id}`, metadata: { ...c } },
            ])
          ),
          namespace: "",
        }),
      });

    global.fetch = mockFetch;

    // Re-import to pick up new env
    vi.resetModules();
    const { retrieveChunks } = await import(
      "../../server/services/flashcard/vectorDb/retrieveChunks"
    );

    const result = await retrieveChunks({
      module_id: "mod-hr-101",
      retrieval_K: 8,
    });

    expect(result.metadata.provider).toBe("pinecone");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api.pinecone.io"),
      expect.any(Object)
    );
  });
});

// =============================================================================
// EMBED TEXT TESTS
// =============================================================================

describe("embedText", () => {
  let originalFetch: typeof global.fetch;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("should embed texts using Gemini API", async () => {
    process.env.EMBEDDING_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: mockEmbeddings.map(e => ({ values: e })),
      }),
    });

    const { embedText } = await import(
      "../../server/services/flashcard/vectorDb/embeddings"
    );

    const texts = ["Hello world", "Test text", "Another one", "Last one"];
    const result = await embedText(texts);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(mockEmbeddings[0]);
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Hello world"),
      })
    );
  });

  it("should embed texts using OpenAI API", async () => {
    process.env.EMBEDDING_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-openai-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockEmbeddings.map((e, i) => ({ embedding: e, index: i })),
        model: "text-embedding-3-small",
        usage: { prompt_tokens: 10, total_tokens: 10 },
      }),
    });

    const { embedText } = await import(
      "../../server/services/flashcard/vectorDb/embeddings"
    );

    const texts = ["Test 1", "Test 2", "Test 3", "Test 4"];
    const result = await embedText(texts);

    expect(result).toHaveLength(4);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-openai-key",
        }),
      })
    );
  });

  it("should handle empty input array", async () => {
    process.env.EMBEDDING_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";

    const { embedText } = await import(
      "../../server/services/flashcard/vectorDb/embeddings"
    );

    const result = await embedText([]);
    expect(result).toEqual([]);
  });

  it("should throw error when API key missing", async () => {
    process.env.EMBEDDING_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;

    global.fetch = vi.fn();

    const { embedText } = await import(
      "../../server/services/flashcard/vectorDb/embeddings"
    );

    await expect(embedText(["test"])).rejects.toThrow("GEMINI_API_KEY");
  });

  it("should compute cosine similarity correctly", async () => {
    const { cosineSimilarity } = await import(
      "../../server/services/flashcard/vectorDb/embeddings"
    );

    // Identical vectors should have similarity 1
    const sim1 = cosineSimilarity([1, 0, 0], [1, 0, 0]);
    expect(sim1).toBeCloseTo(1.0);

    // Orthogonal vectors should have similarity 0
    const sim2 = cosineSimilarity([1, 0, 0], [0, 1, 0]);
    expect(sim2).toBeCloseTo(0.0);

    // Opposite vectors should have similarity -1
    const sim3 = cosineSimilarity([1, 0, 0], [-1, 0, 0]);
    expect(sim3).toBeCloseTo(-1.0);
  });
});

// =============================================================================
// UPSERT CHUNKS TESTS
// =============================================================================

describe("upsertChunks", () => {
  let originalFetch: typeof global.fetch;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = { ...process.env };
    
    process.env.VECTOR_DB_PROVIDER = "qdrant";
    process.env.QDRANT_URL = "http://localhost:6333";
    process.env.QDRANT_COLLECTION_NAME = "test_collection";
    process.env.EMBEDDING_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("should upsert chunks to Qdrant with correct metadata", async () => {
    const fetchCalls: { url: string; body: any }[] = [];
    
    global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
      fetchCalls.push({ url, body: options?.body ? JSON.parse(options.body) : null });
      
      // Collection check
      if (url.includes("/collections/test_collection") && !url.includes("/points")) {
        return { ok: true, json: async () => ({}) };
      }
      // Embedding call
      if (url.includes("generativelanguage.googleapis.com")) {
        return {
          ok: true,
          json: async () => ({
            embeddings: mockChunks.map(() => ({ values: [0.1, 0.2, 0.3] })),
          }),
        };
      }
      // Upsert call
      if (url.includes("/points")) {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { upsertChunks } = await import(
      "../../server/services/flashcard/vectorDb/upsertChunks"
    );

    await upsertChunks({
      module_id: "mod-hr-101",
      chunks: mockChunks,
    });

    // Find the upsert call
    const upsertCall = fetchCalls.find(c => c.url.includes("/points?wait=true"));
    expect(upsertCall).toBeDefined();
    expect(upsertCall!.body.points).toHaveLength(4);
    expect(upsertCall!.body.points[0].payload.module_id).toBe("mod-hr-101");
    expect(upsertCall!.body.points[0].payload.source_file).toBe("slides1.pptx");
  });

  it("should generate embeddings for chunks without them", async () => {
    let embeddingCallCount = 0;
    
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("generativelanguage.googleapis.com")) {
        embeddingCallCount++;
        return {
          ok: true,
          json: async () => ({
            embeddings: [{ values: [0.1, 0.2, 0.3] }],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { upsertChunks } = await import(
      "../../server/services/flashcard/vectorDb/upsertChunks"
    );

    // Chunk without embedding
    const chunksWithoutEmbedding: ContextChunk[] = [{
      chunk_id: "c-new",
      source_file: "test.pdf",
      provider: "local",
      slide_or_page: "p.1",
      start_sec: null,
      end_sec: null,
      heading: "Test",
      text: "Test content",
      tokens_est: 5,
    }];

    await upsertChunks({
      module_id: "mod-test",
      chunks: chunksWithoutEmbedding,
    });

    expect(embeddingCallCount).toBeGreaterThan(0);
  });

  it("should skip embedding for chunks that already have embeddings", async () => {
    let embeddingCallCount = 0;
    
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("generativelanguage.googleapis.com")) {
        embeddingCallCount++;
        return {
          ok: true,
          json: async () => ({ embeddings: [] }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { upsertChunks } = await import(
      "../../server/services/flashcard/vectorDb/upsertChunks"
    );

    // Chunk with embedding already
    const chunksWithEmbedding: ContextChunk[] = [{
      chunk_id: "c-existing",
      source_file: "test.pdf",
      provider: "local",
      slide_or_page: "p.1",
      start_sec: null,
      end_sec: null,
      heading: "Test",
      text: "Test content",
      tokens_est: 5,
      embedding: [0.1, 0.2, 0.3],
    }];

    await upsertChunks({
      module_id: "mod-test",
      chunks: chunksWithEmbedding,
    });

    expect(embeddingCallCount).toBe(0);
  });
});
