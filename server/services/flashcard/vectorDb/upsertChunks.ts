/**
 * Vector Database Upsert - upsertChunks Implementation
 * 
 * Upserts context chunks with embeddings to vector DB (Qdrant or Pinecone).
 */

import type {
  ContextChunk,
  UpsertChunksParams,
  VectorDbConfig,
} from "./types";
import { VectorDbError } from "./types";
import { getVectorDbConfig } from "./retrieveChunks";
import { embedText, getEmbeddingConfig } from "./embeddings";

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_BATCH_SIZE = 100; // Max points per upsert batch
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// =============================================================================
// MAIN UPSERT FUNCTION
// =============================================================================

/**
 * Upsert context chunks to vector database.
 * 
 * Automatically embeds text if embeddings not provided.
 * 
 * @param params - Chunks to upsert with module_id
 * 
 * @example
 * ```typescript
 * await upsertChunks({
 *   module_id: "mod-hr-101",
 *   chunks: [
 *     {
 *       chunk_id: "c1",
 *       source_file: "slides.pptx",
 *       provider: "local",
 *       text: "Organizational culture is...",
 *       tokens_est: 20,
 *       // ... other fields
 *     }
 *   ]
 * });
 * ```
 */
export async function upsertChunks(params: UpsertChunksParams): Promise<void> {
  const { chunks, module_id, namespace } = params;
  
  if (chunks.length === 0) {
    console.log("[VectorDB] No chunks to upsert");
    return;
  }
  
  const config = getVectorDbConfig();
  
  console.log(
    `[VectorDB] Upserting ${chunks.length} chunks for module ${module_id} to ${config.provider}`
  );
  
  // Generate embeddings for chunks that don't have them
  const chunksWithEmbeddings = await ensureEmbeddings(chunks);
  
  // Process in batches
  for (let i = 0; i < chunksWithEmbeddings.length; i += MAX_BATCH_SIZE) {
    const batch = chunksWithEmbeddings.slice(i, i + MAX_BATCH_SIZE);
    
    await withRetry(async () => {
      if (config.provider === "qdrant") {
        await upsertToQdrant(batch, module_id, config);
      } else if (config.provider === "pinecone") {
        await upsertToPinecone(batch, module_id, namespace, config);
      } else {
        throw new VectorDbError(
          `Unsupported provider: ${config.provider}`,
          config.provider,
          "UNSUPPORTED_PROVIDER"
        );
      }
    });
    
    console.log(
      `[VectorDB] Upserted batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(chunksWithEmbeddings.length / MAX_BATCH_SIZE)}`
    );
  }
  
  console.log(`[VectorDB] Successfully upserted ${chunks.length} chunks`);
}

// =============================================================================
// EMBEDDING HELPER
// =============================================================================

async function ensureEmbeddings(
  chunks: ContextChunk[]
): Promise<(ContextChunk & { embedding: number[] })[]> {
  // Separate chunks with and without embeddings
  const needsEmbedding: ContextChunk[] = [];
  const hasEmbedding: (ContextChunk & { embedding: number[] })[] = [];
  
  for (const chunk of chunks) {
    if (chunk.embedding && chunk.embedding.length > 0) {
      hasEmbedding.push(chunk as ContextChunk & { embedding: number[] });
    } else {
      needsEmbedding.push(chunk);
    }
  }
  
  if (needsEmbedding.length === 0) {
    return hasEmbedding;
  }
  
  console.log(`[VectorDB] Generating embeddings for ${needsEmbedding.length} chunks`);
  
  // Generate embeddings
  const texts = needsEmbedding.map(c => c.text);
  const embeddings = await embedText(texts);
  
  // Combine with chunks
  const newlyEmbedded = needsEmbedding.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));
  
  return [...hasEmbedding, ...newlyEmbedded];
}

// =============================================================================
// QDRANT UPSERT
// =============================================================================

async function upsertToQdrant(
  chunks: (ContextChunk & { embedding: number[] })[],
  module_id: string,
  config: VectorDbConfig
): Promise<void> {
  const { qdrantUrl, qdrantApiKey, qdrantCollectionName } = config;
  
  if (!qdrantUrl) {
    throw new VectorDbError(
      "QDRANT_URL not configured",
      "qdrant",
      "MISSING_CONFIG"
    );
  }
  
  // Ensure collection exists
  await ensureQdrantCollection(config);
  
  // Build points
  const points = chunks.map(chunk => ({
    id: chunk.chunk_id,
    vector: chunk.embedding,
    payload: {
      chunk_id: chunk.chunk_id,
      module_id,
      source_file: chunk.source_file,
      provider: chunk.provider,
      slide_or_page: chunk.slide_or_page,
      start_sec: chunk.start_sec,
      end_sec: chunk.end_sec,
      heading: chunk.heading,
      text: chunk.text,
      tokens_est: chunk.tokens_est,
    },
  }));
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (qdrantApiKey) {
    headers["api-key"] = qdrantApiKey;
  }
  
  const response = await fetch(
    `${qdrantUrl}/collections/${qdrantCollectionName}/points?wait=true`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ points }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new VectorDbError(
      `Qdrant upsert failed: ${response.status} ${errorText}`,
      "qdrant",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
}

async function ensureQdrantCollection(config: VectorDbConfig): Promise<void> {
  const { qdrantUrl, qdrantApiKey, qdrantCollectionName, embeddingDimension } = config;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (qdrantApiKey) {
    headers["api-key"] = qdrantApiKey;
  }
  
  // Check if collection exists
  const checkResponse = await fetch(
    `${qdrantUrl}/collections/${qdrantCollectionName}`,
    { method: "GET", headers }
  );
  
  if (checkResponse.ok) {
    return; // Collection exists
  }
  
  // Create collection
  const embeddingConfig = getEmbeddingConfig();
  const dimension = embeddingDimension || embeddingConfig.dimension || 768;
  
  console.log(`[VectorDB] Creating Qdrant collection: ${qdrantCollectionName}`);
  
  const createResponse = await fetch(
    `${qdrantUrl}/collections/${qdrantCollectionName}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        vectors: {
          size: dimension,
          distance: "Cosine",
        },
      }),
    }
  );
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new VectorDbError(
      `Failed to create Qdrant collection: ${createResponse.status} ${errorText}`,
      "qdrant",
      "CREATE_COLLECTION_FAILED"
    );
  }
  
  // Create index on module_id for filtering
  await fetch(
    `${qdrantUrl}/collections/${qdrantCollectionName}/index`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        field_name: "module_id",
        field_schema: "keyword",
      }),
    }
  );
}

// =============================================================================
// PINECONE UPSERT
// =============================================================================

async function upsertToPinecone(
  chunks: (ContextChunk & { embedding: number[] })[],
  module_id: string,
  namespace: string | undefined,
  config: VectorDbConfig
): Promise<void> {
  const { pineconeApiKey, pineconeIndexName } = config;
  
  if (!pineconeApiKey) {
    throw new VectorDbError(
      "PINECONE_API_KEY not configured",
      "pinecone",
      "MISSING_CONFIG"
    );
  }
  
  // Get index host
  const hostUrl = await getPineconeIndexHost(config);
  
  // Build vectors
  const vectors = chunks.map(chunk => ({
    id: `${module_id}_${chunk.chunk_id}`,
    values: chunk.embedding,
    metadata: {
      chunk_id: chunk.chunk_id,
      module_id,
      source_file: chunk.source_file,
      provider: chunk.provider,
      slide_or_page: chunk.slide_or_page,
      start_sec: chunk.start_sec,
      end_sec: chunk.end_sec,
      heading: chunk.heading,
      text: chunk.text,
      tokens_est: chunk.tokens_est,
    },
  }));
  
  const body: any = { vectors };
  if (namespace) {
    body.namespace = namespace;
  }
  
  const response = await fetch(`${hostUrl}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": pineconeApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new VectorDbError(
      `Pinecone upsert failed: ${response.status} ${errorText}`,
      "pinecone",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
}

async function getPineconeIndexHost(config: VectorDbConfig): Promise<string> {
  const { pineconeApiKey, pineconeIndexName } = config;
  
  const response = await fetch(
    `https://api.pinecone.io/indexes/${pineconeIndexName}`,
    {
      method: "GET",
      headers: {
        "Api-Key": pineconeApiKey!,
      },
    }
  );
  
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

// =============================================================================
// DELETE HELPER
// =============================================================================

/**
 * Delete all chunks for a module from vector DB
 */
export async function deleteModuleChunks(module_id: string): Promise<void> {
  const config = getVectorDbConfig();
  
  console.log(`[VectorDB] Deleting chunks for module ${module_id}`);
  
  if (config.provider === "qdrant") {
    await deleteFromQdrant(module_id, config);
  } else if (config.provider === "pinecone") {
    await deleteFromPinecone(module_id, config);
  }
}

async function deleteFromQdrant(
  module_id: string,
  config: VectorDbConfig
): Promise<void> {
  const { qdrantUrl, qdrantApiKey, qdrantCollectionName } = config;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (qdrantApiKey) {
    headers["api-key"] = qdrantApiKey;
  }
  
  await fetch(
    `${qdrantUrl}/collections/${qdrantCollectionName}/points/delete`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: {
          must: [
            { key: "module_id", match: { value: module_id } },
          ],
        },
      }),
    }
  );
}

async function deleteFromPinecone(
  module_id: string,
  config: VectorDbConfig
): Promise<void> {
  const { pineconeApiKey } = config;
  const hostUrl = await getPineconeIndexHost(config);
  
  await fetch(`${hostUrl}/vectors/delete`, {
    method: "POST",
    headers: {
      "Api-Key": pineconeApiKey!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: {
        module_id: { $eq: module_id },
      },
    }),
  });
}

// =============================================================================
// RETRY HELPER
// =============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isRetryable = 
        error instanceof VectorDbError ? error.retryable : isRetryableError(lastError);
      
      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = Math.min(
        BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500,
        10000
      );
      
      console.warn(
        `[VectorDB] Upsert retry ${attempt + 1}/${maxRetries} after ${delay}ms`
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
    message.includes("429") ||
    message.includes("503")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
