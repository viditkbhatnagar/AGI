/**
 * Vector Database Retrieval - retrieveChunks Implementation
 * 
 * Supports Qdrant and Pinecone with automatic provider selection via env var.
 * Includes retry with exponential backoff for network errors.
 */

import type {
  ContextChunk,
  RetrieveChunksParams,
  RetrieveChunksResult,
  RetrievalMetadata,
  VectorDbProvider,
  VectorDbConfig,
} from "./types";
import { VectorDbError } from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_RETRIEVAL_K = 8;
const MIN_CHUNKS_THRESHOLD = 4;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

/**
 * Get vector DB configuration from environment
 */
export function getVectorDbConfig(): VectorDbConfig {
  const provider = (process.env.VECTOR_DB_PROVIDER || "qdrant") as VectorDbProvider;
  
  return {
    provider,
    // Qdrant config
    qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
    qdrantApiKey: process.env.QDRANT_API_KEY,
    qdrantCollectionName: process.env.QDRANT_COLLECTION_NAME || "flashcard_chunks",
    // Pinecone config
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENV,
    pineconeIndexName: process.env.PINECONE_INDEX || "flashcard-chunks",
    // Common
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || "768", 10),
  };
}

// =============================================================================
// RETRY HELPER
// =============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable (network errors, rate limits)
      const isRetryable = isRetryableError(lastError);
      
      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        MAX_DELAY_MS
      );
      
      console.warn(
        `[VectorDB] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("econnreset") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("502")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN RETRIEVAL FUNCTION
// =============================================================================

/**
 * Retrieve top-K context chunks from vector DB for a given module.
 * 
 * @param params - Retrieval parameters including module_id and optional filters
 * @returns Promise<RetrieveChunksResult> - Chunks with metadata including insufficient flag
 * 
 * @example
 * ```typescript
 * const result = await retrieveChunks({
 *   module_id: "mod-hr-101",
 *   retrieval_K: 10,
 *   filters: { course_id: "course-123" }
 * });
 * 
 * if (result.metadata.insufficient) {
 *   // Queue re-indexing for this module
 * }
 * ```
 */
export async function retrieveChunks(
  params: RetrieveChunksParams
): Promise<RetrieveChunksResult> {
  const config = getVectorDbConfig();
  const startTime = Date.now();
  
  const retrieval_K = params.retrieval_K ?? DEFAULT_RETRIEVAL_K;
  
  let chunks: ContextChunk[];
  
  try {
    if (config.provider === "qdrant") {
      chunks = await withRetry(() => 
        retrieveFromQdrant(params, retrieval_K, config)
      );
    } else if (config.provider === "pinecone") {
      chunks = await withRetry(() => 
        retrieveFromPinecone(params, retrieval_K, config)
      );
    } else {
      throw new VectorDbError(
        `Unsupported vector DB provider: ${config.provider}`,
        config.provider,
        "UNSUPPORTED_PROVIDER"
      );
    }
  } catch (error) {
    console.error(`[VectorDB] Retrieval failed for module ${params.module_id}:`, error);
    throw error;
  }
  
  const metadata: RetrievalMetadata = {
    insufficient: chunks.length < MIN_CHUNKS_THRESHOLD,
    total_found: chunks.length,
    retrieval_time_ms: Date.now() - startTime,
    provider: config.provider,
    index_name: config.provider === "qdrant" 
      ? config.qdrantCollectionName 
      : config.pineconeIndexName,
  };
  
  if (metadata.insufficient) {
    console.warn(
      `[VectorDB] Insufficient chunks for module ${params.module_id}: ` +
      `found ${chunks.length}, need at least ${MIN_CHUNKS_THRESHOLD}`
    );
  }
  
  return { chunks, metadata };
}

// =============================================================================
// QDRANT IMPLEMENTATION
// =============================================================================

/**
 * Retrieve chunks from Qdrant vector database
 */
async function retrieveFromQdrant(
  params: RetrieveChunksParams,
  topK: number,
  config: VectorDbConfig
): Promise<ContextChunk[]> {
  const { qdrantUrl, qdrantApiKey, qdrantCollectionName } = config;
  
  if (!qdrantUrl) {
    throw new VectorDbError(
      "QDRANT_URL not configured",
      "qdrant",
      "MISSING_CONFIG"
    );
  }
  
  // Build filter for module_id
  const filter: QdrantFilter = {
    must: [
      {
        key: "module_id",
        match: { value: params.module_id },
      },
    ],
  };
  
  // Add additional filters if provided
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      filter.must.push({
        key,
        match: { value },
      });
    }
  }
  
  // Build request body
  const requestBody: QdrantSearchRequest = {
    filter,
    limit: topK,
    with_payload: true,
    with_vector: false, // Don't return embeddings by default
  };
  
  // If query embedding provided, use vector search
  if (params.query_embedding && params.query_embedding.length > 0) {
    requestBody.vector = params.query_embedding;
  } else {
    // Scroll/filter-only query (no vector similarity)
    // Use scroll endpoint instead for filter-only queries
    return scrollFromQdrant(params, topK, config);
  }
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (qdrantApiKey) {
    headers["api-key"] = qdrantApiKey;
  }
  
  const response = await fetch(
    `${qdrantUrl}/collections/${qdrantCollectionName}/points/search`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new VectorDbError(
      `Qdrant search failed: ${response.status} ${errorText}`,
      "qdrant",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
  
  const data = await response.json() as QdrantSearchResponse;
  
  return data.result.map(point => mapQdrantPointToChunk(point));
}

/**
 * Scroll (filter-only) from Qdrant when no query vector provided
 */
async function scrollFromQdrant(
  params: RetrieveChunksParams,
  limit: number,
  config: VectorDbConfig
): Promise<ContextChunk[]> {
  const { qdrantUrl, qdrantApiKey, qdrantCollectionName } = config;
  
  const filter: QdrantFilter = {
    must: [
      {
        key: "module_id",
        match: { value: params.module_id },
      },
    ],
  };
  
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      filter.must.push({
        key,
        match: { value },
      });
    }
  }
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (qdrantApiKey) {
    headers["api-key"] = qdrantApiKey;
  }
  
  const response = await fetch(
    `${qdrantUrl}/collections/${qdrantCollectionName}/points/scroll`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter,
        limit,
        with_payload: true,
        with_vector: false,
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new VectorDbError(
      `Qdrant scroll failed: ${response.status} ${errorText}`,
      "qdrant",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
  
  const data = await response.json() as QdrantScrollResponse;
  
  return data.result.points.map(point => mapQdrantPointToChunk(point));
}

function mapQdrantPointToChunk(point: QdrantPoint): ContextChunk {
  const payload = point.payload || {};
  
  return {
    chunk_id: point.id?.toString() || payload.chunk_id || "",
    source_file: payload.source_file || "",
    provider: payload.provider || "local",
    slide_or_page: payload.slide_or_page ?? null,
    start_sec: payload.start_sec ?? null,
    end_sec: payload.end_sec ?? null,
    heading: payload.heading ?? null,
    text: payload.text || "",
    tokens_est: payload.tokens_est || 0,
    score: point.score,
  };
}

// Qdrant types
interface QdrantFilter {
  must: Array<{
    key: string;
    match: { value: string | number };
  }>;
}

interface QdrantSearchRequest {
  vector?: number[];
  filter: QdrantFilter;
  limit: number;
  with_payload: boolean;
  with_vector: boolean;
}

interface QdrantPoint {
  id: string | number;
  score?: number;
  payload?: Record<string, any>;
  vector?: number[];
}

interface QdrantSearchResponse {
  result: QdrantPoint[];
  status: string;
  time: number;
}

interface QdrantScrollResponse {
  result: {
    points: QdrantPoint[];
    next_page_offset?: string | number;
  };
  status: string;
  time: number;
}

// =============================================================================
// PINECONE IMPLEMENTATION
// =============================================================================

/**
 * Retrieve chunks from Pinecone vector database
 */
async function retrieveFromPinecone(
  params: RetrieveChunksParams,
  topK: number,
  config: VectorDbConfig
): Promise<ContextChunk[]> {
  const { pineconeApiKey, pineconeEnvironment, pineconeIndexName } = config;
  
  if (!pineconeApiKey) {
    throw new VectorDbError(
      "PINECONE_API_KEY not configured",
      "pinecone",
      "MISSING_CONFIG"
    );
  }
  
  if (!pineconeIndexName) {
    throw new VectorDbError(
      "PINECONE_INDEX not configured",
      "pinecone",
      "MISSING_CONFIG"
    );
  }
  
  // Build filter for module_id
  const filter: PineconeFilter = {
    module_id: { $eq: params.module_id },
  };
  
  // Add additional filters
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      filter[key] = { $eq: value };
    }
  }
  
  // Pinecone requires a query vector for similarity search
  // If no embedding provided, we need to use list/fetch approach
  if (!params.query_embedding || params.query_embedding.length === 0) {
    return listFromPinecone(params, topK, config);
  }
  
  // Get the host URL for the index
  const hostUrl = await getPineconeIndexHost(config);
  
  const response = await fetch(`${hostUrl}/query`, {
    method: "POST",
    headers: {
      "Api-Key": pineconeApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector: params.query_embedding,
      topK,
      filter,
      includeMetadata: true,
      includeValues: false,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new VectorDbError(
      `Pinecone query failed: ${response.status} ${errorText}`,
      "pinecone",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
  
  const data = await response.json() as PineconeQueryResponse;
  
  return data.matches.map(match => mapPineconeMatchToChunk(match));
}

/**
 * List vectors from Pinecone by filter (when no query vector)
 */
async function listFromPinecone(
  params: RetrieveChunksParams,
  limit: number,
  config: VectorDbConfig
): Promise<ContextChunk[]> {
  const { pineconeApiKey } = config;
  
  // Get the host URL for the index
  const hostUrl = await getPineconeIndexHost(config);
  
  // Use list endpoint with prefix filter
  const prefix = `${params.module_id}_`;
  
  const response = await fetch(
    `${hostUrl}/vectors/list?prefix=${encodeURIComponent(prefix)}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Api-Key": pineconeApiKey!,
      },
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new VectorDbError(
      `Pinecone list failed: ${response.status} ${errorText}`,
      "pinecone",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
  
  const listData = await response.json() as PineconeListResponse;
  
  if (!listData.vectors || listData.vectors.length === 0) {
    return [];
  }
  
  // Fetch full vectors with metadata
  const ids = listData.vectors.map(v => v.id).slice(0, limit);
  
  const fetchResponse = await fetch(`${hostUrl}/vectors/fetch`, {
    method: "POST",
    headers: {
      "Api-Key": pineconeApiKey!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  
  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text();
    throw new VectorDbError(
      `Pinecone fetch failed: ${fetchResponse.status} ${errorText}`,
      "pinecone",
      `HTTP_${fetchResponse.status}`,
      fetchResponse.status >= 500 || fetchResponse.status === 429
    );
  }
  
  const fetchData = await fetchResponse.json() as PineconeFetchResponse;
  
  return Object.values(fetchData.vectors).map(vector => 
    mapPineconeVectorToChunk(vector)
  );
}

/**
 * Get Pinecone index host URL
 */
async function getPineconeIndexHost(config: VectorDbConfig): Promise<string> {
  const { pineconeApiKey, pineconeEnvironment, pineconeIndexName } = config;
  
  // For serverless indexes, construct the host directly
  // Format: https://{index-name}-{project-id}.svc.{environment}.pinecone.io
  // Or use the describe index API to get the host
  
  const controllerUrl = `https://api.pinecone.io/indexes/${pineconeIndexName}`;
  
  const response = await fetch(controllerUrl, {
    method: "GET",
    headers: {
      "Api-Key": pineconeApiKey!,
    },
  });
  
  if (!response.ok) {
    throw new VectorDbError(
      `Failed to get Pinecone index info: ${response.status}`,
      "pinecone",
      "INDEX_NOT_FOUND"
    );
  }
  
  const indexInfo = await response.json() as { host: string };
  return `https://${indexInfo.host}`;
}

function mapPineconeMatchToChunk(match: PineconeMatch): ContextChunk {
  const metadata = match.metadata || {};
  
  return {
    chunk_id: match.id,
    source_file: metadata.source_file || "",
    provider: metadata.provider || "local",
    slide_or_page: metadata.slide_or_page ?? null,
    start_sec: metadata.start_sec ?? null,
    end_sec: metadata.end_sec ?? null,
    heading: metadata.heading ?? null,
    text: metadata.text || "",
    tokens_est: metadata.tokens_est || 0,
    score: match.score,
  };
}

function mapPineconeVectorToChunk(vector: PineconeVector): ContextChunk {
  const metadata = vector.metadata || {};
  
  return {
    chunk_id: vector.id,
    source_file: metadata.source_file || "",
    provider: metadata.provider || "local",
    slide_or_page: metadata.slide_or_page ?? null,
    start_sec: metadata.start_sec ?? null,
    end_sec: metadata.end_sec ?? null,
    heading: metadata.heading ?? null,
    text: metadata.text || "",
    tokens_est: metadata.tokens_est || 0,
  };
}

// Pinecone types
interface PineconeFilter {
  [key: string]: { $eq: string | number } | { $in: (string | number)[] };
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

interface PineconeQueryResponse {
  matches: PineconeMatch[];
  namespace: string;
}

interface PineconeListResponse {
  vectors: Array<{ id: string }>;
  pagination?: { next?: string };
}

interface PineconeVector {
  id: string;
  values?: number[];
  metadata?: Record<string, any>;
}

interface PineconeFetchResponse {
  vectors: Record<string, PineconeVector>;
  namespace: string;
}

// Note: getVectorDbConfig, retrieveChunks, withRetry are exported via their function declarations
// Additional internal functions exported for testing:
export { retrieveFromQdrant, retrieveFromPinecone };
