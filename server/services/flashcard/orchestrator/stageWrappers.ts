/**
 * Flashcard Orchestrator - Stage Wrappers
 * 
 * Production-ready LLM wrappers for Stage A (summarization) and Stage B (generation).
 * Supports Gemini and OpenAI providers with retry logic, timeout, and Zod validation.
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from "@google/generative-ai";
import { z } from "zod";
import {
    StageAOutputSchema,
    StageBOutputSchema,
    safeParseStageA,
    safeParseStageB,
    type StageAOutput,
    type StageBOutput,
    type StageAParams,
    type StageBParams,
    type StageResult,
    type LLMErrorOutput,
    type ContextChunk,
} from "./schemas";
import {
    STAGE_A_SYSTEM_PROMPT,
    STAGE_B_SYSTEM_PROMPT,
    buildStageAPrompt,
    buildStageBPrompt,
} from "./fewShots";
import {
    storeRawOutput,
    addLogEntry,
    getLogsUrl,
} from "../queue/jobLogger";
import { Counter, Histogram } from "prom-client";

// =============================================================================
// CONFIGURATION
// =============================================================================

const LLM_PROVIDER = process.env.LLM_PROVIDER || "gemini";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const STAGE_TIMEOUT_MS = parseInt(process.env.STAGE_TIMEOUT_MS || "30000", 10);
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 4096;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

// Token limits for context splitting
const MAX_CONTEXT_TOKENS = 12000; // Leave room for prompt and response

// =============================================================================
// METRICS
// =============================================================================

export const stageCallsTotal = new Counter({
    name: "flashcard_stage_calls_total",
    help: "Total LLM stage calls",
    labelNames: ["stage", "provider", "status"] as const,
});

export const stageLatencySeconds = new Histogram({
    name: "flashcard_stage_latency_seconds",
    help: "Stage call latency in seconds",
    labelNames: ["stage", "provider"] as const,
    buckets: [1, 5, 10, 20, 30, 60],
});

export const stageTokensUsed = new Counter({
    name: "flashcard_stage_tokens_total",
    help: "Total tokens used by stage",
    labelNames: ["stage", "provider"] as const,
});

// =============================================================================
// LLM CLIENT FACTORY
// =============================================================================

interface LLMClient {
    call(systemPrompt: string, userPrompt: string, config: GenerationConfig): Promise<{
        text: string;
        tokensUsed?: number;
        promptTokens?: number;
        completionTokens?: number;
    }>;
}

function createGeminiClient(): LLMClient {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    return {
        async call(systemPrompt: string, userPrompt: string, config: GenerationConfig) {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: config,
            });

            // Use chat for conversation context
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "I understand. I will follow the instructions and output valid JSON only." }] },
                ],
            });

            const result = await chat.sendMessage(userPrompt);
            const response = result.response;
            const text = response.text();

            // Extract token usage if available
            const usageMetadata = response.usageMetadata;

            return {
                text,
                tokensUsed: usageMetadata?.totalTokenCount,
                promptTokens: usageMetadata?.promptTokenCount,
                completionTokens: usageMetadata?.candidatesTokenCount,
            };
        },
    };
}

function createOpenAIClient(): LLMClient {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
    }

    return {
        async call(systemPrompt: string, userPrompt: string, config: GenerationConfig) {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                    temperature: config.temperature || DEFAULT_TEMPERATURE,
                    max_tokens: config.maxOutputTokens || DEFAULT_MAX_TOKENS,
                    response_format: { type: "json_object" },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
            }

            const data = await response.json() as {
                choices: Array<{ message: { content: string } }>;
                usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number };
            };

            return {
                text: data.choices[0]?.message?.content || "",
                tokensUsed: data.usage?.total_tokens,
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
            };
        },
    };
}

function getLLMClient(): LLMClient {
    switch (LLM_PROVIDER.toLowerCase()) {
        case "gemini":
            return createGeminiClient();
        case "openai":
            return createOpenAIClient();
        default:
            throw new Error(`Unsupported LLM_PROVIDER: ${LLM_PROVIDER}. Use 'gemini' or 'openai'.`);
    }
}

// =============================================================================
// RETRY & TIMEOUT HELPERS
// =============================================================================

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]);
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
        message.includes("429") ||
        message.includes("rate limit") ||
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("timeout") ||
        message.includes("econnreset") ||
        message.includes("socket hang up")
    );
}

// =============================================================================
// JSON EXTRACTION
// =============================================================================

function extractJSON(text: string): unknown | null {
    // Try direct parse first
    try {
        return JSON.parse(text.trim());
    } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch {
                // Continue
            }
        }

        // Try to find JSON object in text
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            } catch {
                // Continue
            }
        }

        return null;
    }
}

// =============================================================================
// CONTEXT CHUNKING (for large documents)
// =============================================================================

function estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
}

function shouldSplitContext(chunks: ContextChunk[]): boolean {
    const totalTokens = chunks.reduce((sum, c) => sum + (c.tokens_est || estimateTokens(c.text)), 0);
    return totalTokens > MAX_CONTEXT_TOKENS;
}

async function summarizeChunkBatch(
    client: LLMClient,
    chunks: ContextChunk[],
    jobId: string
): Promise<string> {
    const prompt = `Summarize the following content into key points, preserving all important facts and concepts:

${chunks.map(c => `[${c.chunk_id}]: ${c.text}`).join("\n\n")}

Return a concise summary under 500 words.`;

    const config: GenerationConfig = {
        temperature: 0.1,
        maxOutputTokens: 1000,
    };

    const result = await client.call(
        "You are a summarization assistant. Extract key facts and preserve important details.",
        prompt,
        config
    );

    addLogEntry(jobId, "info", "context_split", `Summarized ${chunks.length} chunks (tokens: ${result.tokensUsed || "unknown"})`);

    return result.text;
}

// =============================================================================
// STAGE A: Module Summarization
// =============================================================================

/**
 * Call Stage A (Module Summarization) with configured LLM provider
 */
export async function callStageA(params: StageAParams): Promise<StageResult<StageAOutput>> {
    const startTime = Date.now();
    const { jobId, module_id, module_title, course_id, contextChunks, outlineHeadings, settings } = params;

    addLogEntry(jobId, "info", "stageA_start", `Starting Stage A for module ${module_id}`);

    const config: GenerationConfig = {
        temperature: settings?.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: settings?.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
    };

    let attempt = 0;
    let lastError: Error | null = null;
    let rawOutput = "";

    try {
        const client = getLLMClient();

        // Handle large context by splitting and summarizing
        let effectiveChunks = contextChunks;
        if (shouldSplitContext(contextChunks)) {
            addLogEntry(jobId, "warn", "stageA_split", "Context too large, splitting and summarizing");

            const mid = Math.ceil(contextChunks.length / 2);
            const [firstHalf, secondHalf] = [contextChunks.slice(0, mid), contextChunks.slice(mid)];

            const [summary1, summary2] = await Promise.all([
                summarizeChunkBatch(client, firstHalf, jobId),
                summarizeChunkBatch(client, secondHalf, jobId),
            ]);

            // Create synthetic chunks from summaries
            effectiveChunks = [
                { chunk_id: "summary_1", source_file: "intermediate_summary", text: summary1, tokens_est: estimateTokens(summary1) },
                { chunk_id: "summary_2", source_file: "intermediate_summary", text: summary2, tokens_est: estimateTokens(summary2) },
            ];
        }

        const userPrompt = buildStageAPrompt({
            module_id,
            module_title,
            course_id,
            contextChunks: effectiveChunks,
            outlineHeadings,
        });

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                addLogEntry(jobId, "debug", "stageA_call", `Attempt ${attempt}/${MAX_RETRIES}`);

                const result = await withTimeout(
                    client.call(STAGE_A_SYSTEM_PROMPT, userPrompt, config),
                    STAGE_TIMEOUT_MS,
                    "Stage A"
                );

                rawOutput = result.text;

                // Log token usage
                if (result.tokensUsed) {
                    stageTokensUsed.inc({ stage: "stageA", provider: LLM_PROVIDER }, result.tokensUsed);
                    addLogEntry(jobId, "info", "stageA_tokens", `Tokens used: ${result.tokensUsed}`);
                }

                // Extract and validate JSON
                const parsed = extractJSON(rawOutput);
                if (!parsed) {
                    throw new Error("Failed to extract valid JSON from LLM response");
                }

                const validation = safeParseStageA(parsed);
                if (!validation.success) {
                    storeRawOutput(jobId, "stageA_invalid", { rawOutput, issues: validation.issues });
                    throw new Error(`Schema validation failed: ${validation.error}`);
                }

                // Success!
                const durationMs = Date.now() - startTime;
                stageCallsTotal.inc({ stage: "stageA", provider: LLM_PROVIDER, status: "success" });
                stageLatencySeconds.observe({ stage: "stageA", provider: LLM_PROVIDER }, durationMs / 1000);

                storeRawOutput(jobId, "stageA_output", { rawOutput, parsed: validation.data });
                addLogEntry(jobId, "info", "stageA_complete", `Stage A completed in ${durationMs}ms`);

                return {
                    success: true,
                    data: validation.data,
                    rawLogsUrl: getLogsUrl(jobId),
                    tokensUsed: result.tokensUsed,
                    durationMs,
                };

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                addLogEntry(jobId, "warn", "stageA_retry", `Attempt ${attempt} failed: ${lastError.message}`);

                // Only retry on retryable errors
                if (!isRetryableError(lastError) && attempt >= MAX_RETRIES) {
                    break;
                }

                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }

        // All attempts failed
        stageCallsTotal.inc({ stage: "stageA", provider: LLM_PROVIDER, status: "failed" });
        storeRawOutput(jobId, "stageA_failed", { rawOutput, error: lastError?.message });

        const errorOutput: LLMErrorOutput = {
            error: true,
            errorType: rawOutput ? "INVALID_LLM_OUTPUT" : "API_ERROR",
            details: lastError?.message,
            rawLogsUrl: getLogsUrl(jobId),
            attemptCount: attempt,
        };

        return {
            success: false,
            error: errorOutput,
            rawLogsUrl: getLogsUrl(jobId),
            durationMs: Date.now() - startTime,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stageCallsTotal.inc({ stage: "stageA", provider: LLM_PROVIDER, status: "error" });
        addLogEntry(jobId, "error", "stageA_error", errorMessage);

        return {
            success: false,
            error: {
                error: true,
                errorType: "API_ERROR",
                details: errorMessage,
                rawLogsUrl: getLogsUrl(jobId),
                attemptCount: attempt,
            },
            durationMs: Date.now() - startTime,
        };
    }
}

// =============================================================================
// STAGE B: Flashcard Generation
// =============================================================================

/**
 * Call Stage B (Flashcard Generation) with configured LLM provider
 */
export async function callStageB(params: StageBParams): Promise<StageResult<StageBOutput>> {
    const startTime = Date.now();
    const { jobId, module_id, module_title, course_id, contextChunks, stageAOutput, settings } = params;

    addLogEntry(jobId, "info", "stageB_start", `Starting Stage B for module ${module_id}`);

    const config: GenerationConfig = {
        temperature: settings?.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: settings?.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
    };

    let attempt = 0;
    let lastError: Error | null = null;
    let rawOutput = "";

    try {
        const client = getLLMClient();

        const userPrompt = buildStageBPrompt({
            module_id,
            module_title,
            course_id,
            contextChunks,
            stageAOutput,
            targetCardCount: settings?.targetCardCount,
            difficultyDistribution: settings?.difficultyDistribution,
        });

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                addLogEntry(jobId, "debug", "stageB_call", `Attempt ${attempt}/${MAX_RETRIES}`);

                const result = await withTimeout(
                    client.call(STAGE_B_SYSTEM_PROMPT, userPrompt, config),
                    STAGE_TIMEOUT_MS,
                    "Stage B"
                );

                rawOutput = result.text;

                // Log token usage
                if (result.tokensUsed) {
                    stageTokensUsed.inc({ stage: "stageB", provider: LLM_PROVIDER }, result.tokensUsed);
                    addLogEntry(jobId, "info", "stageB_tokens", `Tokens used: ${result.tokensUsed}`);
                }

                // Extract and validate JSON
                const parsed = extractJSON(rawOutput);
                if (!parsed) {
                    throw new Error("Failed to extract valid JSON from LLM response");
                }

                const validation = safeParseStageB(parsed);
                if (!validation.success) {
                    storeRawOutput(jobId, "stageB_invalid", { rawOutput, issues: validation.issues });

                    // Try to salvage partial output
                    const partialResult = attemptPartialRecovery(parsed, module_id, module_title);
                    if (partialResult) {
                        addLogEntry(jobId, "warn", "stageB_partial", "Recovered partial output after validation failure");

                        storeRawOutput(jobId, "stageB_partial", { rawOutput, recovered: partialResult });
                        stageCallsTotal.inc({ stage: "stageB", provider: LLM_PROVIDER, status: "partial" });

                        return {
                            success: true,
                            data: partialResult,
                            rawLogsUrl: getLogsUrl(jobId),
                            tokensUsed: result.tokensUsed,
                            durationMs: Date.now() - startTime,
                        };
                    }

                    throw new Error(`Schema validation failed: ${validation.error}`);
                }

                // Success!
                const durationMs = Date.now() - startTime;
                stageCallsTotal.inc({ stage: "stageB", provider: LLM_PROVIDER, status: "success" });
                stageLatencySeconds.observe({ stage: "stageB", provider: LLM_PROVIDER }, durationMs / 1000);

                storeRawOutput(jobId, "stageB_output", { rawOutput, parsed: validation.data });
                addLogEntry(jobId, "info", "stageB_complete", `Stage B completed in ${durationMs}ms, ${validation.data.generated_count} cards`);

                return {
                    success: true,
                    data: validation.data,
                    rawLogsUrl: getLogsUrl(jobId),
                    tokensUsed: result.tokensUsed,
                    durationMs,
                };

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                addLogEntry(jobId, "warn", "stageB_retry", `Attempt ${attempt} failed: ${lastError.message}`);

                if (!isRetryableError(lastError) && attempt >= MAX_RETRIES) {
                    break;
                }

                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }

        // All attempts failed
        stageCallsTotal.inc({ stage: "stageB", provider: LLM_PROVIDER, status: "failed" });
        storeRawOutput(jobId, "stageB_failed", { rawOutput, error: lastError?.message });

        const errorOutput: LLMErrorOutput = {
            error: true,
            errorType: rawOutput ? "INVALID_LLM_OUTPUT" : "API_ERROR",
            details: lastError?.message,
            rawLogsUrl: getLogsUrl(jobId),
            attemptCount: attempt,
        };

        return {
            success: false,
            error: errorOutput,
            rawLogsUrl: getLogsUrl(jobId),
            durationMs: Date.now() - startTime,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stageCallsTotal.inc({ stage: "stageB", provider: LLM_PROVIDER, status: "error" });
        addLogEntry(jobId, "error", "stageB_error", errorMessage);

        return {
            success: false,
            error: {
                error: true,
                errorType: "API_ERROR",
                details: errorMessage,
                rawLogsUrl: getLogsUrl(jobId),
                attemptCount: attempt,
            },
            durationMs: Date.now() - startTime,
        };
    }
}

// =============================================================================
// PARTIAL RECOVERY HELPERS
// =============================================================================

/**
 * Attempt to recover partial valid cards from a partially-valid response
 */
function attemptPartialRecovery(
    parsed: unknown,
    module_id: string,
    module_title: string
): StageBOutput | null {
    if (!parsed || typeof parsed !== "object") {
        return null;
    }

    const obj = parsed as Record<string, unknown>;
    const cards = obj.cards;

    if (!Array.isArray(cards) || cards.length === 0) {
        return null;
    }

    // Try to validate each card individually
    const validCards = [];
    const warnings: string[] = ["PARTIAL_RECOVERY: Some cards failed validation"];

    for (let i = 0; i < cards.length; i++) {
        try {
            const cardResult = z.object({
                card_id: z.string(),
                q: z.string(),
                a: z.string(),
                difficulty: z.enum(["easy", "medium", "hard"]),
                bloom_level: z.enum(["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]),
                evidence: z.array(z.any()).optional().default([]),
                sources: z.array(z.any()).optional().default([]),
                confidence_score: z.number().optional().default(0.5),
                rationale: z.string().optional().default(""),
                review_required: z.boolean().optional().default(true),
            }).safeParse(cards[i]);

            if (cardResult.success) {
                validCards.push({
                    ...cardResult.data,
                    review_required: true, // Mark all recovered cards for review
                });
            } else {
                warnings.push(`Card ${i + 1} failed validation`);
            }
        } catch {
            warnings.push(`Card ${i + 1} caused exception during validation`);
        }
    }

    if (validCards.length === 0) {
        return null;
    }

    return {
        module_id,
        module_title,
        generated_count: validCards.length,
        cards: validCards as StageBOutput["cards"],
        warnings,
        generation_metadata: {
            model: LLM_PROVIDER,
            temperature: DEFAULT_TEMPERATURE,
            timestamp: new Date().toISOString(),
        },
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    getLLMClient,
    extractJSON,
    isRetryableError,
    withTimeout,
};
