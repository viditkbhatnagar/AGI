/**
 * Pinecone Vector Database Client
 * 
 * Provides upsert and query operations for storing and retrieving
 * ContextChunks as vectors in Pinecone.
 * 
 * Environment Variables:
 * - PINECONE_API_KEY: Your Pinecone API key (required)
 * - PINECONE_INDEX: Index name (default: 'flashcard-chunks')
 * - VECTOR_UPSERT_BATCH_SIZE: Batch size for upserts (default: 100)
 * 
 * Vector ID Format:
 * All vectors use the format: ${module_id}::${chunk_id}
 * This ensures idempotent upserts - same chunk always has same ID.
 * 
 * Metadata Stored:
 * - chunk_id: Original chunk identifier
 * - module_id: Module scope for filtering
 * - source_file: Original file name
 * - provider: Storage provider (google_drive, onedrive, local)
 * - slide_or_page: Timestamp range or page reference
 * - start_sec: Start timestamp (for audio/video)
 * - end_sec: End timestamp
 * - heading: Section heading if available
 * - tokens_est: Estimated token count
 * 
 * @example
 * // Upsert chunks
 * const result = await upsertChunksToPinecone({
 *   chunks: contextChunks,
 *   module_id: 'mod-hr-101',
 * });
 * 
 * // Query by text
 * const matches = await queryChunksFromPinecone({
 *   module_id: 'mod-hr-101',
 *   queryText: 'What is organizational culture?',
 *   topK: 5,
 * });
 */

import { Counter, Histogram } from "prom-client";
import { embedTexts } from "../embeddings/embeddingsClient";
import type { ContextChunk } from "../transcription/types";

// =============================================================================
// TYPES
// =============================================================================

export interface UpsertParams {
    /** Chunks to upsert */
    chunks: ContextChunk[];
    /** Module ID for scoping */
    module_id: string;
    /** Optional index override */
    index?: string;
    /** Job ID for logging */
    jobId?: string;
}

export interface UpsertResult {
    /** Number of vectors upserted */
    upserted: number;
    /** IDs of failed upserts */
    failed?: string[];
}

export interface QueryParams {
    /** Module ID for filtering */
    module_id: string;
    /** Text query (will be embedded) */
    queryText?: string;
    /** Pre-computed query vector */
    queryVector?: number[];
    /** Number of results to return */
    topK?: number;
    /** Additional metadata filters */
    filter?: Record<string, unknown>;
    /** Include vector in response */
    includeVector?: boolean;
    /** Job ID for logging */
    jobId?: string;
}

export interface QueryMatch {
    /** Vector ID */
    id: string;
    /** Similarity score */
    score: number;
    /** Stored metadata */
    metadata: Record<string, unknown>;
    /** Vector values (if requested) */
    vector?: number[];
}

export interface QueryResult {
    /** Matching chunks */
    matches: QueryMatch[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || "flashcard-chunks";
const UPSERT_BATCH_SIZE = parseInt(process.env.VECTOR_UPSERT_BATCH_SIZE || "100", 10);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// =============================================================================
// METRICS
// =============================================================================

export const pineconeUpsertsTotal = new Counter({
    name: "flashcard_pinecone_upserts_total",
    help: "Total number of Pinecone upsert operations",
    labelNames: ["status"],
});

export const pineconeUpsertLatency = new Histogram({
    name: "flashcard_pinecone_upsert_latency_seconds",
    help: "Pinecone upsert latency in seconds",
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const pineconeQueriesTotal = new Counter({
    name: "flashcard_pinecone_queries_total",
    help: "Total number of Pinecone query operations",
    labelNames: ["status"],
});

export const pineconeQueryLatency = new Histogram({
    name: "flashcard_pinecone_query_latency_seconds",
    help: "Pinecone query latency in seconds",
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

// =============================================================================
// PINECONE CLIENT INITIALIZATION
// =============================================================================

interface PineconeIndex {
    upsert: (vectors: PineconeVector[]) => Promise<{ upsertedCount: number }>;
    query: (params: PineconeQueryParams) => Promise<PineconeQueryResponse>;
    describeIndexStats: () => Promise<{ totalRecordCount: number }>;
}

interface PineconeVector {
    id: string;
    values: number[];
    metadata?: Record<string, unknown>;
}

interface PineconeQueryParams {
    vector: number[];
    topK: number;
    filter?: Record<string, unknown>;
    includeMetadata?: boolean;
    includeValues?: boolean;
}

interface PineconeQueryResponse {
    matches: Array<{
        id: string;
        score: number;
        metadata?: Record<string, unknown>;
        values?: number[];
    }>;
}

let pineconeIndex: PineconeIndex | null = null;

async function getPineconeIndex(): Promise<PineconeIndex> {
    if (pineconeIndex) {
        return pineconeIndex;
    }

    if (!PINECONE_API_KEY) {
        throw new Error(`
Pinecone API key not configured.

To use Pinecone:
1. Create an account at https://www.pinecone.io
2. Create an index with appropriate dimensions (768 for Gemini, 1536 for OpenAI)
3. Set environment variables:
   export PINECONE_API_KEY=your-api-key
   export PINECONE_INDEX=flashcard-chunks
    `.trim());
    }

    try {
        const { Pinecone } = await import("@pinecone-database/pinecone");
        const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
        pineconeIndex = pc.index(PINECONE_INDEX);
        console.log(`[Pinecone] Connected to index: ${PINECONE_INDEX}`);
        return pineconeIndex;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize Pinecone: ${message}`);
    }
}

// =============================================================================
// UPSERT CHUNKS
// =============================================================================

/**
 * Upsert chunks to Pinecone.
 * 
 * - Generates embeddings for chunks without them
 * - Creates idempotent vector IDs: ${module_id}::${chunk_id}
 * - Batches upserts to respect Pinecone limits
 * - Stores full metadata for filtering and retrieval
 */
export async function upsertChunksToPinecone(
    params: UpsertParams
): Promise<UpsertResult> {
    const { chunks, module_id, jobId } = params;

    if (!chunks || chunks.length === 0) {
        return { upserted: 0 };
    }

    console.log(`[Pinecone] Upserting ${chunks.length} chunks for module ${module_id}`);
    const startTime = Date.now();

    try {
        const index = await getPineconeIndex();

        // Step 1: Generate embeddings for chunks that don't have them
        const chunksNeedingEmbeddings = chunks.filter(c => !c.embedding);

        if (chunksNeedingEmbeddings.length > 0) {
            console.log(`[Pinecone] Generating embeddings for ${chunksNeedingEmbeddings.length} chunks`);
            const texts = chunksNeedingEmbeddings.map(c => c.text);
            const embeddings = await embedTexts(texts, { jobId });

            // Attach embeddings to chunks
            for (let i = 0; i < chunksNeedingEmbeddings.length; i++) {
                chunksNeedingEmbeddings[i].embedding = embeddings[i];
            }
        }

        // Step 2: Convert chunks to Pinecone vectors
        const vectors: PineconeVector[] = chunks.map(chunk => ({
            id: `${module_id}::${chunk.chunk_id}`,
            values: chunk.embedding!,
            metadata: {
                chunk_id: chunk.chunk_id,
                module_id,
                source_file: chunk.source_file,
                provider: chunk.provider,
                slide_or_page: chunk.slide_or_page,
                start_sec: chunk.start_sec,
                end_sec: chunk.end_sec,
                heading: chunk.heading,
                tokens_est: chunk.tokens_est,
                // Store text for retrieval (Pinecone metadata limit is 40KB)
                text: chunk.text.substring(0, 10000),
            },
        }));

        // Step 3: Batch upsert
        let totalUpserted = 0;
        const batches = chunkArray(vectors, UPSERT_BATCH_SIZE);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`[Pinecone] Upserting batch ${i + 1}/${batches.length} (${batch.length} vectors)`);

            const result = await upsertWithRetry(index, batch);
            totalUpserted += result.upsertedCount;
        }

        const duration = (Date.now() - startTime) / 1000;
        pineconeUpsertLatency.observe(duration);
        pineconeUpsertsTotal.inc({ status: "success" });

        console.log(`[Pinecone] Upserted ${totalUpserted} vectors in ${duration.toFixed(2)}s`);

        return { upserted: totalUpserted };

    } catch (error) {
        pineconeUpsertsTotal.inc({ status: "error" });
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Pinecone] Upsert failed: ${message}`);
        throw new Error(`Pinecone upsert failed: ${message}`);
    }
}

async function upsertWithRetry(
    index: PineconeIndex,
    vectors: PineconeVector[]
): Promise<{ upsertedCount: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await index.upsert(vectors);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < MAX_RETRIES && isRetryableError(error)) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`[Pinecone] Upsert attempt ${attempt} failed, retrying in ${delay}ms`);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

// =============================================================================
// QUERY CHUNKS
// =============================================================================

/**
 * Query chunks from Pinecone.
 * 
 * - Supports text query (auto-embeds) or pre-computed vector
 * - Filters by module_id for scoped retrieval
 * - Returns top-K matches with metadata
 */
export async function queryChunksFromPinecone(
    params: QueryParams
): Promise<QueryResult> {
    const {
        module_id,
        queryText,
        queryVector,
        topK = 5,
        filter = {},
        includeVector = false,
        jobId,
    } = params;

    console.log(`[Pinecone] Querying module ${module_id} for top ${topK} matches`);
    const startTime = Date.now();

    try {
        const index = await getPineconeIndex();

        // Prepare query vector
        let vector: number[];
        if (queryVector) {
            vector = queryVector;
        } else if (queryText) {
            const embeddings = await embedTexts([queryText], { jobId });
            vector = embeddings[0];
        } else {
            throw new Error("Either queryText or queryVector must be provided");
        }

        // Build filter with module_id scope
        const fullFilter = {
            module_id: { $eq: module_id },
            ...filter,
        };

        // Execute query
        const response = await index.query({
            vector,
            topK,
            filter: fullFilter,
            includeMetadata: true,
            includeValues: includeVector,
        });

        const duration = (Date.now() - startTime) / 1000;
        pineconeQueryLatency.observe(duration);
        pineconeQueriesTotal.inc({ status: "success" });

        // Map response to our format
        const matches: QueryMatch[] = response.matches.map(match => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata || {},
            vector: includeVector ? match.values : undefined,
        }));

        console.log(`[Pinecone] Found ${matches.length} matches in ${duration.toFixed(3)}s`);

        return { matches };

    } catch (error) {
        pineconeQueriesTotal.inc({ status: "error" });
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Pinecone] Query failed: ${message}`);
        throw new Error(`Pinecone query failed: ${message}`);
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("timeout") ||
            message.includes("econnreset") ||
            message.includes("rate") ||
            message.includes("429") ||
            message.includes("500") ||
            message.includes("502") ||
            message.includes("503") ||
            message.includes("504")
        );
    }
    return false;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Delete all vectors for a module.
 */
export async function deleteModuleVectors(module_id: string): Promise<void> {
    const index = await getPineconeIndex();

    // Pinecone doesn't support delete by filter in all versions
    // This is a placeholder - implement based on your Pinecone version
    console.warn(`[Pinecone] deleteModuleVectors not fully implemented for module: ${module_id}`);
}

/**
 * Get index statistics.
 */
export async function getIndexStats(): Promise<{ totalRecordCount: number }> {
    const index = await getPineconeIndex();
    return await index.describeIndexStats();
}

// =============================================================================
// EXPORTS
// =============================================================================

export { PINECONE_INDEX, UPSERT_BATCH_SIZE };
