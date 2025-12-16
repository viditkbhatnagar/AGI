/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides robust retry logic for API calls that may fail due to:
 * - Rate limiting (429)
 * - Temporary server errors (500, 502, 503, 504)
 * - Network issues
 * 
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry count and delays
 * - Respects Retry-After headers
 * - Circuit breaker pattern
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in milliseconds (default: 1000) */
    initialDelayMs?: number;
    /** Maximum delay in milliseconds (default: 60000) */
    maxDelayMs?: number;
    /** Backoff multiplier (default: 2) */
    backoffMultiplier?: number;
    /** Add random jitter to delays (default: true) */
    jitter?: boolean;
    /** Retryable status codes (default: [429, 500, 502, 503, 504]) */
    retryableStatusCodes?: number[];
    /** Callback on retry (for logging/metrics) */
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
    /** Timeout for each attempt in milliseconds (default: 30000) */
    timeoutMs?: number;
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    totalDelayMs: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry" | "abortSignal">> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitter: true,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    timeoutMs: 30000,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);

        if (signal) {
            signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(new Error("Aborted"));
            });
        }
    });
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
    attempt: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number,
    jitter: boolean
): number {
    // Exponential backoff: initialDelay * multiplier^attempt
    let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

    // Add jitter (±25%)
    if (jitter) {
        const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
        delay *= jitterFactor;
    }

    // Cap at maximum delay
    return Math.min(delay, maxDelayMs);
}

/**
 * Extract Retry-After header value in milliseconds
 */
function extractRetryAfter(error: any): number | null {
    // Check for Retry-After in error details
    if (error?.errorDetails) {
        for (const detail of error.errorDetails) {
            if (detail["@type"]?.includes("RetryInfo") && detail.retryDelay) {
                const delayStr = detail.retryDelay;
                // Parse duration like "9s" or "9.5s"
                const match = delayStr.match(/^(\d+(?:\.\d+)?)\s*s$/);
                if (match) {
                    return Math.ceil(parseFloat(match[1]) * 1000);
                }
            }
        }
    }

    // Check for status code 429 with message
    if (error?.message?.includes("retry in")) {
        const match = error.message.match(/retry in (\d+(?:\.\d+)?)/i);
        if (match) {
            return Math.ceil(parseFloat(match[1]) * 1000);
        }
    }

    return null;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableCodes: number[]): boolean {
    // Check status code
    if (error?.status && retryableCodes.includes(error.status)) {
        return true;
    }

    // Check for network errors
    const retryableMessages = [
        "ECONNRESET",
        "ETIMEDOUT",
        "ECONNREFUSED",
        "ENETUNREACH",
        "fetch failed",
        "socket hang up",
        "Too Many Requests",
        "rate limit",
        "quota exceeded",
        "temporarily unavailable",
        "service unavailable",
        "internal error",
        "bad gateway",
        "gateway timeout",
    ];

    const errorMessage = error?.message?.toLowerCase() || "";
    for (const msg of retryableMessages) {
        if (errorMessage.includes(msg.toLowerCase())) {
            return true;
        }
    }

    return false;
}

// =============================================================================
// MAIN RETRY FUNCTION
// =============================================================================

/**
 * Execute a function with retry logic
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Result with success status, data/error, and metadata
 * 
 * @example
 * const result = await withRetry(
 *   () => callGeminiAPI(prompt),
 *   { maxRetries: 5, onRetry: (attempt, err) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<RetryResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let lastError: Error | undefined;
    let totalDelayMs = 0;
    let attempt = 0;

    while (attempt <= opts.maxRetries) {
        try {
            // Check for abort
            if (opts.abortSignal?.aborted) {
                throw new Error("Aborted");
            }

            // Execute the function
            const data = await fn();

            return {
                success: true,
                data,
                attempts: attempt + 1,
                totalDelayMs,
            };

        } catch (error: any) {
            lastError = error;

            // Check if we should retry
            const shouldRetry =
                attempt < opts.maxRetries &&
                isRetryableError(error, opts.retryableStatusCodes) &&
                !opts.abortSignal?.aborted;

            if (!shouldRetry) {
                break;
            }

            // Calculate delay (use Retry-After if available)
            let delayMs = extractRetryAfter(error);
            if (!delayMs) {
                delayMs = calculateDelay(
                    attempt,
                    opts.initialDelayMs,
                    opts.maxDelayMs,
                    opts.backoffMultiplier,
                    opts.jitter
                );
            }

            // Notify callback
            if (opts.onRetry) {
                opts.onRetry(attempt + 1, error, delayMs);
            }

            console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);

            // Wait before retrying
            await sleep(delayMs, opts.abortSignal);
            totalDelayMs += delayMs;

            attempt++;
        }
    }

    return {
        success: false,
        error: lastError,
        attempts: attempt + 1,
        totalDelayMs,
    };
}

/**
 * Execute a function with retry and throw on failure
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @throws Error if all retries fail
 */
export async function withRetryThrow<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const result = await withRetry(fn, options);

    if (!result.success) {
        const error = result.error || new Error("All retry attempts failed");
        (error as any).attempts = result.attempts;
        (error as any).totalDelayMs = result.totalDelayMs;
        throw error;
    }

    return result.data!;
}

// =============================================================================
// SPECIALIZED RETRY FUNCTIONS
// =============================================================================

/**
 * Retry options optimized for Gemini API calls
 */
export const GEMINI_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 5,
    initialDelayMs: 2000,
    maxDelayMs: 120000, // 2 minutes max
    backoffMultiplier: 2,
    jitter: true,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: (attempt, error, delayMs) => {
        console.log(`[Gemini] Retry attempt ${attempt} after ${delayMs}ms - ${error.message?.substring(0, 100)}`);
    },
};

/**
 * Retry options for embedding API calls
 */
export const EMBEDDING_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Retry options for document fetch operations
 */
export const DOCUMENT_FETCH_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitter: false,
    retryableStatusCodes: [429, 500, 502, 503, 504],
};

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

interface CircuitBreakerState {
    failures: number;
    lastFailure: number | null;
    state: "closed" | "open" | "half-open";
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Execute with circuit breaker pattern
 */
export async function withCircuitBreaker<T>(
    key: string,
    fn: () => Promise<T>,
    options: {
        failureThreshold?: number;
        resetTimeMs?: number;
    } = {}
): Promise<T> {
    const { failureThreshold = 5, resetTimeMs = 60000 } = options;

    let breaker = circuitBreakers.get(key);
    if (!breaker) {
        breaker = { failures: 0, lastFailure: null, state: "closed" };
        circuitBreakers.set(key, breaker);
    }

    // Check if circuit is open
    if (breaker.state === "open") {
        const timeSinceLastFailure = Date.now() - (breaker.lastFailure || 0);
        if (timeSinceLastFailure < resetTimeMs) {
            throw new Error(`Circuit breaker open for ${key}. Try again in ${Math.ceil((resetTimeMs - timeSinceLastFailure) / 1000)}s`);
        }
        // Move to half-open state
        breaker.state = "half-open";
    }

    try {
        const result = await fn();

        // Success - reset circuit
        breaker.failures = 0;
        breaker.state = "closed";

        return result;

    } catch (error) {
        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.failures >= failureThreshold) {
            breaker.state = "open";
            console.warn(`[CircuitBreaker] Circuit opened for ${key} after ${breaker.failures} failures`);
        }

        throw error;
    }
}

/**
 * Reset a circuit breaker
 */
export function resetCircuitBreaker(key: string): void {
    circuitBreakers.delete(key);
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(key: string): CircuitBreakerState | null {
    return circuitBreakers.get(key) || null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    withRetry,
    withRetryThrow,
    withCircuitBreaker,
    resetCircuitBreaker,
    getCircuitBreakerStatus,
    GEMINI_RETRY_OPTIONS,
    EMBEDDING_RETRY_OPTIONS,
    DOCUMENT_FETCH_RETRY_OPTIONS,
};
