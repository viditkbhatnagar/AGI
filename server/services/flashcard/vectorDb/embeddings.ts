/**
 * Embeddings Service
 * 
 * Provides text embedding functionality with multiple provider support:
 * - Gemini (Google AI)
 * - OpenAI
 * - Local (sentence-transformers via HTTP microservice)
 * 
 * Includes retry logic and batch processing.
 */

import { z } from "zod";

// =============================================================================
// CONFIGURATION
// =============================================================================

export const EmbeddingProviderSchema = z.enum(["gemini", "openai", "local"]);
export type EmbeddingProvider = z.infer<typeof EmbeddingProviderSchema>;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_BATCH_SIZE = 100; // Max texts per batch

// Default models per provider
const DEFAULT_MODELS: Record<EmbeddingProvider, string> = {
  gemini: "text-embedding-004", // or "embedding-001"
  openai: "text-embedding-3-small",
  local: "all-MiniLM-L6-v2",
};

// Embedding dimensions per model
const EMBEDDING_DIMENSIONS: Record<string, number> = {
  "text-embedding-004": 768,
  "embedding-001": 768,
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
  "all-MiniLM-L6-v2": 384,
  "all-mpnet-base-v2": 768,
};

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model: string;
  apiKey?: string;
  localUrl?: string;
  dimension: number;
}

/**
 * Get embedding configuration from environment
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  const provider = (process.env.EMBEDDING_PROVIDER || "gemini") as EmbeddingProvider;
  
  let model: string;
  let apiKey: string | undefined;
  let localUrl: string | undefined;
  
  switch (provider) {
    case "gemini":
      model = process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_MODELS.gemini;
      apiKey = process.env.GEMINI_API_KEY;
      break;
    case "openai":
      model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODELS.openai;
      apiKey = process.env.OPENAI_API_KEY;
      break;
    case "local":
      model = process.env.LOCAL_EMBEDDING_MODEL || DEFAULT_MODELS.local;
      localUrl = process.env.LOCAL_EMBEDDING_URL || "http://localhost:8080/embed";
      break;
  }
  
  const dimension = EMBEDDING_DIMENSIONS[model] || 768;
  
  return { provider, model, apiKey, localUrl, dimension };
}

// =============================================================================
// MAIN EMBEDDING FUNCTION
// =============================================================================

/**
 * Embed text(s) using configured provider.
 * 
 * @param texts - Array of texts to embed
 * @param model - Optional model override
 * @returns Promise<number[][]> - Array of embedding vectors
 * 
 * @example
 * ```typescript
 * const embeddings = await embedText([
 *   "What is organizational culture?",
 *   "Define recruitment process"
 * ]);
 * // Returns: [[0.1, 0.2, ...], [0.3, 0.4, ...]]
 * ```
 */
export async function embedText(
  texts: string[],
  model?: string
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  
  const config = getEmbeddingConfig();
  const effectiveModel = model || config.model;
  
  // Process in batches if needed
  if (texts.length > MAX_BATCH_SIZE) {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const batchEmbeddings = await embedTextBatch(batch, effectiveModel, config);
      results.push(...batchEmbeddings);
    }
    return results;
  }
  
  return embedTextBatch(texts, effectiveModel, config);
}

async function embedTextBatch(
  texts: string[],
  model: string,
  config: EmbeddingConfig
): Promise<number[][]> {
  switch (config.provider) {
    case "gemini":
      return withRetry(() => embedWithGemini(texts, model, config.apiKey!));
    case "openai":
      return withRetry(() => embedWithOpenAI(texts, model, config.apiKey!));
    case "local":
      return withRetry(() => embedWithLocal(texts, model, config.localUrl!));
    default:
      throw new EmbeddingError(
        `Unsupported embedding provider: ${config.provider}`,
        config.provider,
        "UNSUPPORTED_PROVIDER"
      );
  }
}

// =============================================================================
// GEMINI EMBEDDINGS
// =============================================================================

/**
 * Generate embeddings using Google Gemini API
 */
async function embedWithGemini(
  texts: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {
  if (!apiKey) {
    throw new EmbeddingError(
      "GEMINI_API_KEY not configured",
      "gemini",
      "MISSING_API_KEY"
    );
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`;
  
  const requests = texts.map(text => ({
    model: `models/${model}`,
    content: {
      parts: [{ text }],
    },
  }));
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new EmbeddingError(
      `Gemini embedding failed: ${response.status} ${errorText}`,
      "gemini",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
  
  const data = await response.json() as GeminiEmbeddingResponse;
  
  return data.embeddings.map(e => e.values);
}

// Gemini types
interface GeminiEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

// =============================================================================
// OPENAI EMBEDDINGS
// =============================================================================

/**
 * Generate embeddings using OpenAI API
 */
async function embedWithOpenAI(
  texts: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {
  if (!apiKey) {
    throw new EmbeddingError(
      "OPENAI_API_KEY not configured",
      "openai",
      "MISSING_API_KEY"
    );
  }
  
  const url = "https://api.openai.com/v1/embeddings";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
      encoding_format: "float",
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new EmbeddingError(
      `OpenAI embedding failed: ${response.status} ${errorText}`,
      "openai",
      `HTTP_${response.status}`,
      response.status >= 500 || response.status === 429
    );
  }
  
  const data = await response.json() as OpenAIEmbeddingResponse;
  
  // Sort by index to ensure correct order
  const sorted = data.data.sort((a, b) => a.index - b.index);
  return sorted.map(item => item.embedding);
}

// OpenAI types
interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// LOCAL EMBEDDINGS (sentence-transformers microservice)
// =============================================================================

/**
 * Generate embeddings using local sentence-transformers service
 * 
 * Expected API format:
 * POST /embed
 * Body: { "texts": ["text1", "text2"], "model": "all-MiniLM-L6-v2" }
 * Response: { "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]] }
 */
async function embedWithLocal(
  texts: string[],
  model: string,
  localUrl: string
): Promise<number[][]> {
  if (!localUrl) {
    throw new EmbeddingError(
      "LOCAL_EMBEDDING_URL not configured",
      "local",
      "MISSING_CONFIG"
    );
  }
  
  const response = await fetch(localUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts,
      model,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new EmbeddingError(
      `Local embedding service failed: ${response.status} ${errorText}`,
      "local",
      `HTTP_${response.status}`,
      response.status >= 500
    );
  }
  
  const data = await response.json() as LocalEmbeddingResponse;
  
  return data.embeddings;
}

// Local service types
interface LocalEmbeddingResponse {
  embeddings: number[][];
  model?: string;
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
        error instanceof EmbeddingError ? error.retryable : isRetryableError(lastError);
      
      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = Math.min(
        BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500,
        10000
      );
      
      console.warn(
        `[Embeddings] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`
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
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("503")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly provider: EmbeddingProvider,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}
