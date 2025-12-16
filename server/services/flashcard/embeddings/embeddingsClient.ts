/**
 * Embeddings Client
 * 
 * Unified interface for generating text embeddings using multiple providers:
 * - Gemini (Google): Uses GEMINI_API_KEY
 * - OpenAI: Uses OPENAI_API_KEY  
 * - Local: Calls EMBEDDINGS_LOCAL_URL HTTP endpoint
 * 
 * Provider Selection:
 * Set EMBEDDING_PROVIDER environment variable to 'gemini', 'openai', or 'local'.
 * 
 * Rate Limits & Throughput:
 * - Gemini: ~100 RPM free tier, 1500 RPM paid
 * - OpenAI: ~3000 RPM depending on tier
 * - Local: Depends on your hardware
 * 
 * Token Considerations:
 * - Max input tokens vary by model (typically 8192 for embedding models)
 * - Truncate long texts before embedding to avoid API errors
 * - Batch size affects throughput vs latency tradeoff
 * 
 * Environment Variables:
 * - EMBEDDING_PROVIDER: 'gemini' | 'openai' | 'local' (default: 'gemini')
 * - GEMINI_API_KEY: API key for Gemini
 * - OPENAI_API_KEY: API key for OpenAI
 * - EMBEDDINGS_LOCAL_URL: URL for local embedding service
 * - EMBEDDING_BATCH_SIZE: Batch size for API calls (default: 64)
 * - EMBEDDING_RETRY_ATTEMPTS: Max retry attempts (default: 3)
 * - EMBEDDING_MODEL: Override default model per provider
 */

import { Counter, Histogram } from "prom-client";

// =============================================================================
// TYPES
// =============================================================================

export type EmbeddingProvider = "gemini" | "openai" | "local";

export interface EmbedOptions {
    /** Override the default model */
    model?: string;
    /** Override the provider */
    provider?: EmbeddingProvider;
    /** Job ID for logging */
    jobId?: string;
}

export interface EmbeddingResult {
    /** Generated embeddings */
    embeddings: number[][];
    /** Model used */
    model: string;
    /** Provider used */
    provider: EmbeddingProvider;
    /** Token usage if available */
    tokenUsage?: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_PROVIDER: EmbeddingProvider =
    (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || "gemini";

const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || "64", 10);
const MAX_RETRIES = parseInt(process.env.EMBEDDING_RETRY_ATTEMPTS || "3", 10);
const RETRY_BASE_DELAY_MS = 1000;

const DEFAULT_MODELS: Record<EmbeddingProvider, string> = {
    gemini: "embedding-001",
    openai: "text-embedding-3-small",
    local: "default",
};

// Embedding dimensions by model (for validation)
const EMBEDDING_DIMENSIONS: Record<string, number> = {
    "embedding-001": 768,
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
};

// =============================================================================
// METRICS
// =============================================================================

export const embeddingCallsTotal = new Counter({
    name: "flashcard_embedding_calls_total",
    help: "Total number of embedding API calls",
    labelNames: ["provider", "status"],
});

export const embeddingLatencySeconds = new Histogram({
    name: "flashcard_embedding_latency_seconds",
    help: "Embedding API call latency in seconds",
    labelNames: ["provider"],
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const embeddingTokensTotal = new Counter({
    name: "flashcard_embedding_tokens_total",
    help: "Total tokens processed for embeddings",
    labelNames: ["provider"],
});

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate embeddings for an array of texts.
 * 
 * @param texts - Array of strings to embed
 * @param options - Optional configuration
 * @returns Array of embedding vectors (number[][])
 * 
 * @example
 * const embeddings = await embedTexts([
 *   "What is organizational culture?",
 *   "Define talent acquisition.",
 * ]);
 * console.log(embeddings[0].length); // 768 for Gemini, 1536 for OpenAI
 */
export async function embedTexts(
    texts: string[],
    options: EmbedOptions = {}
): Promise<number[][]> {
    // Handle empty input
    if (!texts || texts.length === 0) {
        return [];
    }

    // Validate inputs
    const validTexts = texts.filter(t => typeof t === "string" && t.trim().length > 0);
    if (validTexts.length === 0) {
        console.warn("[Embeddings] All input texts are empty or invalid");
        return [];
    }

    if (validTexts.length !== texts.length) {
        console.warn(`[Embeddings] Filtered ${texts.length - validTexts.length} empty texts`);
    }

    const provider = options.provider || DEFAULT_PROVIDER;
    const model = options.model || DEFAULT_MODELS[provider];

    console.log(`[Embeddings] Embedding ${validTexts.length} texts with ${provider}/${model}`);

    // Process in batches
    const allEmbeddings: number[][] = [];
    const batches = chunkArray(validTexts, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[Embeddings] Processing batch ${i + 1}/${batches.length} (${batch.length} texts)`);

        const startTime = Date.now();

        try {
            const embeddings = await embedBatchWithRetry(batch, provider, model, options.jobId);
            allEmbeddings.push(...embeddings);

            const duration = (Date.now() - startTime) / 1000;
            embeddingLatencySeconds.observe({ provider }, duration);
            embeddingCallsTotal.inc({ provider, status: "success" });

        } catch (error) {
            embeddingCallsTotal.inc({ provider, status: "error" });
            throw error;
        }
    }

    return allEmbeddings;
}

// =============================================================================
// BATCH WITH RETRY
// =============================================================================

async function embedBatchWithRetry(
    texts: string[],
    provider: EmbeddingProvider,
    model: string,
    jobId?: string
): Promise<number[][]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await embedBatch(texts, provider, model);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Check if retryable
            const isRetryable = isTransientError(error);

            if (!isRetryable || attempt === MAX_RETRIES) {
                console.error(`[Embeddings] Failed after ${attempt} attempts:`, lastError.message);
                throw lastError;
            }

            // Exponential backoff
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(`[Embeddings] Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    throw lastError || new Error("Embedding failed with no error details");
}

function isTransientError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("timeout") ||
            message.includes("econnreset") ||
            message.includes("rate limit") ||
            message.includes("429") ||
            message.includes("500") ||
            message.includes("502") ||
            message.includes("503") ||
            message.includes("504")
        );
    }
    return false;
}

// =============================================================================
// PROVIDER IMPLEMENTATIONS
// =============================================================================

async function embedBatch(
    texts: string[],
    provider: EmbeddingProvider,
    model: string
): Promise<number[][]> {
    switch (provider) {
        case "gemini":
            return await embedWithGemini(texts, model);
        case "openai":
            return await embedWithOpenAI(texts, model);
        case "local":
            return await embedWithLocal(texts, model);
        default:
            throw new Error(`Unknown embedding provider: ${provider}`);
    }
}

// =============================================================================
// GEMINI EMBEDDINGS
// =============================================================================

async function embedWithGemini(texts: string[], model: string): Promise<number[][]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY not set. Please set it in your environment variables."
        );
    }

    try {
        // Dynamic import to avoid requiring the package if not used
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const embeddingModel = genAI.getGenerativeModel({ model: `models/${model}` });

        // Gemini embedContent for single text, batchEmbedContents for multiple
        const embeddings: number[][] = [];

        // Process each text (Gemini's batch API might vary)
        for (const text of texts) {
            const result = await embeddingModel.embedContent(text);
            const embedding = result.embedding.values;
            embeddings.push(normalizeEmbedding(embedding));
        }

        return embeddings;

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Gemini embedding failed: ${message}`);
    }
}

// =============================================================================
// OPENAI EMBEDDINGS
// =============================================================================

async function embedWithOpenAI(texts: string[], model: string): Promise<number[][]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error(
            "OPENAI_API_KEY not set. Please set it in your environment variables."
        );
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            input: texts,
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI embedding failed (${response.status}): ${errorData}`);
    }

    const data = await response.json() as {
        data: Array<{ embedding: number[]; index: number }>;
        usage: { prompt_tokens: number; total_tokens: number };
    };

    // Track token usage
    if (data.usage) {
        embeddingTokensTotal.inc({ provider: "openai" }, data.usage.total_tokens);
    }

    // Sort by index to ensure correct order
    const sortedData = data.data.sort((a, b) => a.index - b.index);

    return sortedData.map(item => normalizeEmbedding(item.embedding));
}

// =============================================================================
// LOCAL EMBEDDINGS
// =============================================================================

async function embedWithLocal(texts: string[], model: string): Promise<number[][]> {
    const localUrl = process.env.EMBEDDINGS_LOCAL_URL;
    if (!localUrl) {
        throw new Error(`
Local embedding service URL not configured.

To use local embeddings:
1. Set EMBEDDINGS_LOCAL_URL environment variable
2. Run a local embedding service (e.g., sentence-transformers HTTP server)

Example using sentence-transformers:
  pip install sentence-transformers flask
  # Create a simple Flask server that accepts POST /embed with { texts: string[] }
  # and returns { embeddings: number[][] }

Or use an existing service:
  - Ollama: https://ollama.ai (supports embedding models)
  - LocalAI: https://localai.io

Set: export EMBEDDINGS_LOCAL_URL=http://localhost:8080/embed
    `.trim());
    }

    const response = await fetch(localUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, model }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Local embedding service failed (${response.status}): ${errorData}`);
    }

    const data = await response.json() as { embeddings: number[][] };

    if (!Array.isArray(data.embeddings)) {
        throw new Error("Local embedding service returned invalid response format");
    }

    return data.embeddings.map(normalizeEmbedding);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Split array into chunks of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Normalize embedding to float32 array
 */
function normalizeEmbedding(embedding: number[]): number[] {
    return embedding.map(v => {
        const num = Number(v);
        return Number.isFinite(num) ? num : 0;
    });
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    DEFAULT_PROVIDER,
    DEFAULT_MODELS,
    BATCH_SIZE,
    MAX_RETRIES,
    EMBEDDING_DIMENSIONS,
    chunkArray,
    normalizeEmbedding,
};
