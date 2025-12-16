/**
 * Vector Database Module - Public Exports
 * 
 * Provides unified interface for vector operations.
 * Routes to Pinecone or Qdrant based on VECTOR_DB_PROVIDER env var.
 */

// Existing exports
export * from "./types";
export * from "./retrieveChunks";
export * from "./embeddings";
export * from "./upsertChunks";

// Pinecone client exports
export {
    upsertChunksToPinecone,
    queryChunksFromPinecone,
    PINECONE_INDEX,
    pineconeUpsertsTotal,
    pineconeUpsertLatency,
    pineconeQueriesTotal,
    pineconeQueryLatency,
    deleteModuleVectors,
    getIndexStats,
} from "./pineconeClient";

// Qdrant client exports
export {
    upsertChunksToQdrant,
    queryChunksFromQdrant,
    QDRANT_URL,
    QDRANT_COLLECTION,
    qdrantUpsertsTotal,
    qdrantUpsertLatency,
    qdrantQueriesTotal,
    qdrantQueryLatency,
} from "./qdrantClient";

// Type exports from Pinecone (use as canonical versions)
export type {
    UpsertParams as PineconeUpsertParams,
    UpsertResult as PineconeUpsertResult,
    QueryParams as PineconeQueryParams,
    QueryResult as PineconeQueryResult,
    QueryMatch,
} from "./pineconeClient";

// Type exports from Qdrant
export type {
    UpsertParams as QdrantUpsertParams,
    UpsertResult as QdrantUpsertResult,
    QueryParams as QdrantQueryParams,
    QueryResult as QdrantQueryResult,
} from "./qdrantClient";
