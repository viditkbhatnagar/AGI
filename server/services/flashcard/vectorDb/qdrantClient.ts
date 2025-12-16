/**
 * Qdrant Vector Database Client
 * 
 * Alternative to Pinecone for vector storage and retrieval.
 * Supports self-hosted Qdrant instances.
 * 
 * Environment Variables:
 * - QDRANT_URL: Qdrant server URL (default: http://localhost:6333)
 * - QDRANT_API_KEY: API key for Qdrant Cloud (optional for local)
 * - QDRANT_COLLECTION: Collection name (default: flashcard-chunks)
 * - VECTOR_UPSERT_BATCH_SIZE: Batch size for upserts (default: 100)
 * 
 * Vector ID Format:
 * All vectors use the format: ${module_id}::${chunk_id}
 * This ensures idempotent upserts.
 * 
 * Docker Quick Start:
 * docker run -p 6333:6333 qdrant/qdrant
 * 
 * @example
 * // Upsert chunks
 * const result = await upsertChunksToQdrant({
 *   chunks: contextChunks,
 *   module_id: 'mod-hr-101',
 * });
 * 
 * // Query
 * const matches = await queryChunksFromQdrant({
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
    chunks: ContextChunk[];
    module_id: string;
    collection?: string;
    jobId?: string;
}

export interface UpsertResult {
    upserted: number;
    failed?: string[];
}

export interface QueryParams {
    module_id: string;
    queryText?: string;
    queryVector?: number[];
    topK?: number;
    filter?: Record<string, unknown>;
    includeVector?: boolean;
    jobId?: string;
}

export interface QueryMatch {
    id: string;
    score: number;
    metadata: Record<string, unknown>;
    vector?: number[];
}

export interface QueryResult {
    matches: QueryMatch[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "flashcard-chunks";
const UPSERT_BATCH_SIZE = parseInt(process.env.VECTOR_UPSERT_BATCH_SIZE || "100", 10);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// Default embedding dimension (should match your embedding model)
const DEFAULT_VECTOR_SIZE = parseInt(process.env.EMBEDDING_DIMENSION || "768", 10);

// =============================================================================
// METRICS
// =============================================================================

export const qdrantUpsertsTotal = new Counter({
    name: "flashcard_qdrant_upserts_total",
    help: "Total number of Qdrant upsert operations",
    labelNames: ["status"],
});

export const qdrantUpsertLatency = new Histogram({
    name: "flashcard_qdrant_upsert_latency_seconds",
    help: "Qdrant upsert latency in seconds",
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const qdrantQueriesTotal = new Counter({
    name: "flashcard_qdrant_queries_total",
    help: "Total number of Qdrant query operations",
    labelNames: ["status"],
});

export const qdrantQueryLatency = new Histogram({
    name: "flashcard_qdrant_query_latency_seconds",
    help: "Qdrant query latency in seconds",
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

// =============================================================================
// QDRANT CLIENT
// =============================================================================

interface QdrantClient {
    upsert: (collection: string, params: QdrantUpsertParams) => Promise<void>;
    search: (collection: string, params: QdrantSearchParams) => Promise<QdrantSearchResult[]>;
    createCollection: (collection: string, params: QdrantCollectionParams) => Promise<void>;
    getCollections: () => Promise<{ collections: Array<{ name: string }> }>;
}

interface QdrantUpsertParams {
    wait?: boolean;
    points: QdrantPoint[];
}

interface QdrantPoint {
    id: string;
    vector: number[];
    payload?: Record<string, unknown>;
}

interface QdrantSearchParams {
    vector: number[];
    limit: number;
    filter?: QdrantFilter;
    with_payload?: boolean;
    with_vector?: boolean;
}

interface QdrantFilter {
    must?: Array<{ key: string; match: { value: unknown } }>;
}

interface QdrantSearchResult {
    id: string | number;
    score: number;
    payload?: Record<string, unknown>;
    vector?: number[];
}

interface QdrantCollectionParams {
    vectors: {
        size: number;
        distance: "Cosine" | "Euclid" | "Dot";
    };
}

let qdrantClient: QdrantClient | null = null;
let collectionInitialized = false;

async function getQdrantClient(): Promise<QdrantClient> {
    if (qdrantClient) {
        return qdrantClient;
    }

    try {
        const { QdrantClient: Client } = await import("@qdrant/js-client-rest");

        qdrantClient = new Client({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
        }) as unknown as QdrantClient;

        console.log(`[Qdrant] Connected to ${QDRANT_URL}`);
        return qdrantClient;

    } catch (error) {
        // Fallback to HTTP client if package not available
        console.log("[Qdrant] Using HTTP client fallback");
        qdrantClient = createHttpClient();
        return qdrantClient;
    }
}

/**
 * Simple HTTP client for Qdrant when SDK is not available
 */
function createHttpClient(): QdrantClient {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (QDRANT_API_KEY) {
        headers["api-key"] = QDRANT_API_KEY;
    }

    return {
        async upsert(collection: string, params: QdrantUpsertParams): Promise<void> {
            const response = await fetch(`${QDRANT_URL}/collections/${collection}/points?wait=true`, {
                method: "PUT",
                headers,
                body: JSON.stringify({ points: params.points }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Qdrant upsert failed (${response.status}): ${error}`);
            }
        },

        async search(collection: string, params: QdrantSearchParams): Promise<QdrantSearchResult[]> {
            const response = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
                method: "POST",
                headers,
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Qdrant search failed (${response.status}): ${error}`);
            }

            const data = await response.json() as { result: QdrantSearchResult[] };
            return data.result;
        },

        async createCollection(collection: string, params: QdrantCollectionParams): Promise<void> {
            const response = await fetch(`${QDRANT_URL}/collections/${collection}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(params),
            });

            if (!response.ok && response.status !== 409) { // 409 = already exists
                const error = await response.text();
                throw new Error(`Qdrant create collection failed (${response.status}): ${error}`);
            }
        },

        async getCollections(): Promise<{ collections: Array<{ name: string }> }> {
            const response = await fetch(`${QDRANT_URL}/collections`, {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Qdrant get collections failed (${response.status}): ${error}`);
            }

            return await response.json() as { collections: Array<{ name: string }> };
        },
    };
}

/**
 * Ensure collection exists with correct configuration
 */
async function ensureCollection(vectorSize: number = DEFAULT_VECTOR_SIZE): Promise<void> {
    if (collectionInitialized) {
        return;
    }

    const client = await getQdrantClient();

    try {
        const { collections } = await client.getCollections();
        const exists = collections.some(c => c.name === QDRANT_COLLECTION);

        if (!exists) {
            console.log(`[Qdrant] Creating collection: ${QDRANT_COLLECTION}`);
            await client.createCollection(QDRANT_COLLECTION, {
                vectors: {
                    size: vectorSize,
                    distance: "Cosine",
                },
            });
        }

        collectionInitialized = true;
    } catch (error) {
        console.warn(`[Qdrant] Collection check failed:`, error);
        // Continue anyway - might work if collection exists
        collectionInitialized = true;
    }
}

// =============================================================================
// UPSERT CHUNKS
// =============================================================================

/**
 * Upsert chunks to Qdrant.
 */
export async function upsertChunksToQdrant(params: UpsertParams): Promise<UpsertResult> {
    const { chunks, module_id, collection = QDRANT_COLLECTION, jobId } = params;

    if (!chunks || chunks.length === 0) {
        return { upserted: 0 };
    }

    console.log(`[Qdrant] Upserting ${chunks.length} chunks for module ${module_id}`);
    const startTime = Date.now();

    try {
        const client = await getQdrantClient();

        // Generate embeddings for chunks without them
        const chunksNeedingEmbeddings = chunks.filter(c => !c.embedding);

        if (chunksNeedingEmbeddings.length > 0) {
            console.log(`[Qdrant] Generating embeddings for ${chunksNeedingEmbeddings.length} chunks`);
            const texts = chunksNeedingEmbeddings.map(c => c.text);
            const embeddings = await embedTexts(texts, { jobId });

            for (let i = 0; i < chunksNeedingEmbeddings.length; i++) {
                chunksNeedingEmbeddings[i].embedding = embeddings[i];
            }
        }

        // Ensure collection exists with correct vector size
        if (chunks[0].embedding) {
            await ensureCollection(chunks[0].embedding.length);
        } else {
            await ensureCollection();
        }

        // Convert to Qdrant points
        const points: QdrantPoint[] = chunks.map(chunk => ({
            id: `${module_id}::${chunk.chunk_id}`,
            vector: chunk.embedding!,
            payload: {
                chunk_id: chunk.chunk_id,
                module_id,
                source_file: chunk.source_file,
                provider: chunk.provider,
                slide_or_page: chunk.slide_or_page,
                start_sec: chunk.start_sec,
                end_sec: chunk.end_sec,
                heading: chunk.heading,
                tokens_est: chunk.tokens_est,
                text: chunk.text.substring(0, 10000),
            },
        }));

        // Batch upsert
        let totalUpserted = 0;
        const batches = chunkArray(points, UPSERT_BATCH_SIZE);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`[Qdrant] Upserting batch ${i + 1}/${batches.length} (${batch.length} points)`);

            await upsertWithRetry(client, collection, batch);
            totalUpserted += batch.length;
        }

        const duration = (Date.now() - startTime) / 1000;
        qdrantUpsertLatency.observe(duration);
        qdrantUpsertsTotal.inc({ status: "success" });

        console.log(`[Qdrant] Upserted ${totalUpserted} points in ${duration.toFixed(2)}s`);

        return { upserted: totalUpserted };

    } catch (error) {
        qdrantUpsertsTotal.inc({ status: "error" });
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Qdrant] Upsert failed: ${message}`);
        throw new Error(`Qdrant upsert failed: ${message}`);
    }
}

async function upsertWithRetry(
    client: QdrantClient,
    collection: string,
    points: QdrantPoint[]
): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await client.upsert(collection, { wait: true, points });
            return;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < MAX_RETRIES && isRetryableError(error)) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`[Qdrant] Upsert attempt ${attempt} failed, retrying in ${delay}ms`);
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
 * Query chunks from Qdrant.
 */
export async function queryChunksFromQdrant(params: QueryParams): Promise<QueryResult> {
    const {
        module_id,
        queryText,
        queryVector,
        topK = 5,
        filter = {},
        includeVector = false,
        jobId,
    } = params;

    console.log(`[Qdrant] Querying module ${module_id} for top ${topK} matches`);
    const startTime = Date.now();

    try {
        const client = await getQdrantClient();
        await ensureCollection();

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

        // Build Qdrant filter
        const qdrantFilter: QdrantFilter = {
            must: [
                { key: "module_id", match: { value: module_id } },
            ],
        };

        // Add custom filters
        for (const [key, value] of Object.entries(filter)) {
            qdrantFilter.must!.push({ key, match: { value } });
        }

        // Execute search
        const results = await client.search(QDRANT_COLLECTION, {
            vector,
            limit: topK,
            filter: qdrantFilter,
            with_payload: true,
            with_vector: includeVector,
        });

        const duration = (Date.now() - startTime) / 1000;
        qdrantQueryLatency.observe(duration);
        qdrantQueriesTotal.inc({ status: "success" });

        // Map to our format
        const matches: QueryMatch[] = results.map(r => ({
            id: String(r.id),
            score: r.score,
            metadata: r.payload || {},
            vector: includeVector ? r.vector : undefined,
        }));

        console.log(`[Qdrant] Found ${matches.length} matches in ${duration.toFixed(3)}s`);

        return { matches };

    } catch (error) {
        qdrantQueriesTotal.inc({ status: "error" });
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Qdrant] Query failed: ${message}`);
        throw new Error(`Qdrant query failed: ${message}`);
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
            message.includes("econnrefused") ||
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
// EXPORTS
// =============================================================================

export { QDRANT_URL, QDRANT_COLLECTION, UPSERT_BATCH_SIZE };
