/**
 * Embeddings Module Index
 * 
 * Exports text embedding functionality for the flashcard pipeline.
 */

export {
    embedTexts,
    DEFAULT_PROVIDER,
    DEFAULT_MODELS,
    BATCH_SIZE,
    MAX_RETRIES,
    EMBEDDING_DIMENSIONS,
    embeddingCallsTotal,
    embeddingLatencySeconds,
    embeddingTokensTotal,
    chunkArray,
    normalizeEmbedding,
    type EmbeddingProvider,
    type EmbedOptions,
    type EmbeddingResult,
} from "./embeddingsClient";
