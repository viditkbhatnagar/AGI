/**
 * Vector Database Types
 * 
 * Shared types for vector DB operations (Qdrant, Pinecone)
 */

import { z } from "zod";

// =============================================================================
// CONTEXT CHUNK SCHEMA (matches existing Chunk type with extensions)
// =============================================================================

export const ContextChunkSchema = z.object({
  chunk_id: z.string(),
  source_file: z.string(),
  provider: z.enum(["google_drive", "onedrive", "local", "cloudinary", "other"]),
  slide_or_page: z.union([z.string(), z.number()]).nullable(),
  start_sec: z.number().nullable(),
  end_sec: z.number().nullable(),
  heading: z.string().nullable(),
  text: z.string(),
  tokens_est: z.number().int(),
  embedding: z.array(z.number()).optional(),
  score: z.number().optional(), // Similarity score from vector search
});

export type ContextChunk = z.infer<typeof ContextChunkSchema>;

// =============================================================================
// RETRIEVAL PARAMS
// =============================================================================

export const RetrieveChunksParamsSchema = z.object({
  module_id: z.string(),
  retrieval_K: z.number().int().min(1).max(50).default(8),
  filters: z.record(z.union([z.string(), z.number()])).optional(),
  query_embedding: z.array(z.number()).optional(), // Pre-computed embedding
  query_text: z.string().optional(), // Text to embed for query
});

export type RetrieveChunksParams = z.infer<typeof RetrieveChunksParamsSchema>;

// =============================================================================
// RETRIEVAL RESULT
// =============================================================================

export const RetrievalMetadataSchema = z.object({
  insufficient: z.boolean(),
  total_found: z.number().int(),
  retrieval_time_ms: z.number(),
  provider: z.enum(["qdrant", "pinecone"]),
  index_name: z.string().optional(),
});

export type RetrievalMetadata = z.infer<typeof RetrievalMetadataSchema>;

export const RetrieveChunksResultSchema = z.object({
  chunks: z.array(ContextChunkSchema),
  metadata: RetrievalMetadataSchema,
});

export type RetrieveChunksResult = z.infer<typeof RetrieveChunksResultSchema>;

// =============================================================================
// UPSERT PARAMS
// =============================================================================

export const UpsertChunksParamsSchema = z.object({
  chunks: z.array(ContextChunkSchema),
  module_id: z.string(),
  namespace: z.string().optional(), // For Pinecone namespaces
});

export type UpsertChunksParams = z.infer<typeof UpsertChunksParamsSchema>;

// =============================================================================
// VECTOR DB CONFIG
// =============================================================================

export const VectorDbProviderSchema = z.enum(["qdrant", "pinecone"]);
export type VectorDbProvider = z.infer<typeof VectorDbProviderSchema>;

export interface VectorDbConfig {
  provider: VectorDbProvider;
  // Qdrant
  qdrantUrl?: string;
  qdrantApiKey?: string;
  qdrantCollectionName?: string;
  // Pinecone
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndexName?: string;
  // Common
  embeddingDimension?: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class VectorDbError extends Error {
  constructor(
    message: string,
    public readonly provider: VectorDbProvider,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "VectorDbError";
  }
}

export class InsufficientChunksError extends Error {
  constructor(
    public readonly moduleId: string,
    public readonly found: number,
    public readonly required: number = 4
  ) {
    super(`Insufficient chunks for module ${moduleId}: found ${found}, required ${required}`);
    this.name = "InsufficientChunksError";
  }
}
