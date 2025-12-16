/**
 * Flashcard Orchestrator - Main Service
 * 
 * Orchestrates batch flashcard generation across courses/modules.
 * Handles job queue, retry logic, rate limiting, and monitoring.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "crypto";

// Use native crypto.randomUUID for ESM compatibility
const uuidv4 = (): string => randomUUID();
import type {
    Chunk,
    StageAOutput,
    StageBOutput,
    Flashcard,
    StoredFlashcardDeck,
} from "./types";
import {
    StageAOutputSchema,
    StageBOutputSchema,
    FlashcardSchema,
} from "./types";
import type {
    OrchestratorInput,
    OrchestratorSettings,
    ModuleResult,
    JobResult,
    JobStatus,
    ModuleStatus,
    ModuleToProcess,
    BatchJobContext,
    ChunkRetrievalResult,
    OrchestratorMetrics,
    CardVerificationResult,
    RebalanceRequest,
    RebalanceResult,
    JobQueueResponse,
} from "./orchestratorTypes";
import {
    OrchestratorInputSchema,
    OrchestratorSettingsSchema,
    CardVerificationResultSchema,
} from "./orchestratorTypes";
import {
    STAGE_A_SYSTEM_PROMPT_COMPLETE,
    STAGE_B_SYSTEM_PROMPT_COMPLETE,
    VERIFICATION_SYSTEM_PROMPT_COMPLETE,
    REBALANCE_SYSTEM_PROMPT,
    ORCHESTRATOR_SYSTEM_PROMPT,
    buildStageACompletePrompt,
    buildStageBCompletePrompt,
    buildVerificationPrompt,
    buildRebalancePrompt,
    buildSupplementaryCardPromptComplete,
} from "./orchestratorPrompts";

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_SETTINGS: OrchestratorSettings = {
    retrieval_K: 8,
    target_card_count: 10,
    model: "gemini-1.5-flash",
    temperature: 0.1,
    max_output_tokens: 1500,
    dedupe_threshold: 0.85,
    difficulty_distribution: { easy: 3, medium: 4, hard: 3 },
    min_higher_order_bloom: 3,
    max_retries: 3,
    concurrency: 4,
};

// Retry configuration
const RETRY_CONFIG = {
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    maxRetries: 3,
};

// Cost estimation (approximate per 1K tokens)
const COST_PER_1K_TOKENS = {
    "gemini-1.5-flash": 0.000075,
    "gemini-1.5-pro": 0.00125,
    "gemini-1.5": 0.000075,
    "gemini-free": 0.0,
};

// =============================================================================
// JOB STORAGE (In-memory - replace with Redis/DB in production)
// =============================================================================

interface JobStore {
    jobs: Map<string, JobResult>;
    moduleDecks: Map<string, StoredFlashcardDeck>;
    metrics: OrchestratorMetrics;
}

const store: JobStore = {
    jobs: new Map(),
    moduleDecks: new Map(),
    metrics: {
        decks_generated_total: 0,
        decks_failed_total: 0,
        decks_partial_total: 0,
        average_generation_time_ms: 0,
        average_cards_verified_rate: 0,
        cards_flagged_for_review: 0,
        cost_per_deck_estimate: 0,
        jobs_in_queue: 0,
        jobs_processing: 0,
        last_successful_run: null,
        last_failed_run: null,
    },
};

// =============================================================================
// ORCHESTRATOR SERVICE CLASS
// =============================================================================

export class FlashcardOrchestratorService {
    private genAI: GoogleGenerativeAI;
    private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
    private settings: OrchestratorSettings;

    constructor(apiKey: string, settings?: Partial<OrchestratorSettings>) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.model = this.genAI.getGenerativeModel({
            model: this.settings.model,
            generationConfig: {
                temperature: this.settings.temperature,
                maxOutputTokens: this.settings.max_output_tokens,
            },
        });
    }

    // ===========================================================================
    // PUBLIC: Queue a batch job
    // ===========================================================================

    async queueJob(input: OrchestratorInput): Promise<JobQueueResponse> {
        // Validate input
        const validated = OrchestratorInputSchema.parse(input);

        // Get modules to process
        const modules = await this.getModulesToProcess(validated);

        // Estimate time (rough: 30 seconds per module)
        const estimatedTimeMinutes = Math.ceil((modules.length * 30) / 60);

        // Create job record
        const jobResult: JobResult = {
            job_id: validated.job_id,
            status: "queued",
            mode: validated.mode,
            modules_total: modules.length,
            modules_completed: 0,
            modules_failed: 0,
            modules_skipped: 0,
            started_at: new Date().toISOString(),
            module_results: [],
        };

        store.jobs.set(validated.job_id, jobResult);
        store.metrics.jobs_in_queue++;

        // Start processing in background (non-blocking)
        this.processJobAsync(validated, modules).catch(err => {
            console.error(`[Orchestrator] Job ${validated.job_id} failed:`, err);
        });

        return {
            job_id: validated.job_id,
            status: "queued",
            estimated_time_minutes: estimatedTimeMinutes,
            modules_to_process: modules.length,
            position_in_queue: store.metrics.jobs_in_queue,
        };
    }

    // ===========================================================================
    // PUBLIC: Get job status
    // ===========================================================================

    getJobStatus(jobId: string): JobResult | null {
        return store.jobs.get(jobId) || null;
    }

    // ===========================================================================
    // PUBLIC: Get metrics
    // ===========================================================================

    getMetrics(): OrchestratorMetrics {
        return { ...store.metrics };
    }

    // ===========================================================================
    // PUBLIC: Get module deck
    // ===========================================================================

    getModuleDeck(moduleId: string, courseId: string): StoredFlashcardDeck | null {
        const key = `${courseId}:${moduleId}`;
        return store.moduleDecks.get(key) || null;
    }

    // ===========================================================================
    // PRIVATE: Process job asynchronously
    // ===========================================================================

    private async processJobAsync(
        input: OrchestratorInput,
        modules: ModuleToProcess[]
    ): Promise<void> {
        const job = store.jobs.get(input.job_id)!;
        job.status = "processing";
        store.metrics.jobs_in_queue--;
        store.metrics.jobs_processing++;

        const settings = { ...this.settings, ...input.settings };
        const startTime = Date.now();
        let totalCost = 0;
        let totalApiCalls = 0;
        let totalCards = 0;
        let totalVerified = 0;
        let totalTimeMs = 0;

        // Process modules with concurrency control
        const results: ModuleResult[] = [];

        for (let i = 0; i < modules.length; i += settings.concurrency) {
            const batch = modules.slice(i, i + settings.concurrency);
            const batchPromises = batch.map(module =>
                this.processModule(module, settings)
            );

            const batchResults = await Promise.allSettled(batchPromises);

            for (const result of batchResults) {
                if (result.status === "fulfilled") {
                    results.push(result.value);

                    // Update job progress
                    if (result.value.status === "SUCCESS") {
                        job.modules_completed++;
                        store.metrics.decks_generated_total++;
                    } else if (result.value.status === "PARTIAL") {
                        job.modules_completed++;
                        store.metrics.decks_partial_total++;
                    } else if (result.value.status === "FAILED") {
                        job.modules_failed++;
                        store.metrics.decks_failed_total++;
                    } else if (result.value.status === "SKIPPED" || result.value.status === "NEED_MORE_CONTENT") {
                        job.modules_skipped++;
                    }

                    // Aggregate metrics
                    totalCost += result.value.metrics.cost_estimate;
                    totalApiCalls += result.value.metrics.api_calls;
                    totalCards += result.value.generated_count;
                    totalVerified += result.value.verified_count;
                    totalTimeMs += result.value.metrics.time_ms;
                } else {
                    // Promise rejected - create failure result
                    job.modules_failed++;
                    store.metrics.decks_failed_total++;
                    results.push({
                        module_id: batch[batchResults.indexOf(result)]?.module_id || "unknown",
                        course_id: batch[batchResults.indexOf(result)]?.course_id || "unknown",
                        module_title: batch[batchResults.indexOf(result)]?.module_title || "Unknown",
                        status: "FAILED",
                        generated_count: 0,
                        verified_count: 0,
                        warnings: [],
                        deck_id: null,
                        metrics: { time_ms: 0, api_calls: 0, cost_estimate: 0, chunks_retrieved: 0, verification_rate: 0 },
                        logs_url: null,
                        error_message: result.reason?.message || "Unknown error",
                        retry_count: 0,
                    });
                }
            }

            // Update job state
            job.module_results = results;
        }

        // Finalize job
        job.completed_at = new Date().toISOString();
        job.status = job.modules_failed > 0
            ? (job.modules_completed > 0 ? "completed_with_errors" : "failed")
            : "completed";
        job.aggregate_metrics = {
            total_time_ms: Date.now() - startTime,
            total_api_calls: totalApiCalls,
            total_cost_estimate: totalCost,
            average_verification_rate: totalCards > 0 ? totalVerified / totalCards : 0,
            total_cards_generated: totalCards,
            total_cards_verified: totalVerified,
        };

        // Update global metrics
        store.metrics.jobs_processing--;
        if (job.status === "completed") {
            store.metrics.last_successful_run = job.completed_at;
        } else {
            store.metrics.last_failed_run = job.completed_at;
        }

        // Update running averages
        const decksTotal = store.metrics.decks_generated_total + store.metrics.decks_partial_total;
        if (decksTotal > 0) {
            store.metrics.average_generation_time_ms =
                (store.metrics.average_generation_time_ms * (decksTotal - job.modules_completed) + totalTimeMs) / decksTotal;
            store.metrics.cost_per_deck_estimate = totalCost / Math.max(1, job.modules_completed);
        }

        console.log(`[Orchestrator] Job ${input.job_id} completed: ${job.status}`);
    }

    // ===========================================================================
    // PRIVATE: Process single module
    // ===========================================================================

    private async processModule(
        module: ModuleToProcess,
        settings: OrchestratorSettings
    ): Promise<ModuleResult> {
        const startTime = Date.now();
        let apiCalls = 0;
        const warnings: string[] = [];
        let retryCount = 0;

        console.log(`[Orchestrator] Processing module: ${module.module_id}`);

        try {
            // Step 1: Retrieve chunks
            const chunkResult = await this.retrieveChunks(module, settings.retrieval_K);

            if (chunkResult.needs_more_content || chunkResult.chunks.length < 4) {
                return this.createModuleResult(module, "NEED_MORE_CONTENT", startTime, {
                    chunks_retrieved: chunkResult.chunks.length,
                    warnings: ["Insufficient content chunks for generation"],
                });
            }

            // Step 2: Stage A - Summarization
            let stageAOutput: StageAOutput;
            try {
                stageAOutput = await this.runStageAWithRetry(module, chunkResult.chunks, settings);
                apiCalls++;
            } catch (error) {
                return this.createModuleResult(module, "FAILED", startTime, {
                    apiCalls,
                    error: `Stage A failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    chunks_retrieved: chunkResult.chunks.length,
                });
            }

            // Step 3: Stage B - Flashcard Generation
            let stageBOutput: StageBOutput;
            try {
                stageBOutput = await this.runStageBWithRetry(
                    module,
                    chunkResult.chunks,
                    stageAOutput,
                    settings
                );
                apiCalls++;
                warnings.push(...stageBOutput.warnings);
            } catch (error) {
                return this.createModuleResult(module, "FAILED", startTime, {
                    apiCalls,
                    error: `Stage B failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    chunks_retrieved: chunkResult.chunks.length,
                });
            }

            // Step 4: Verification
            const { cards: verifiedCards, verifiedCount, totalApiCalls: verificationCalls } =
                await this.runVerificationBatch(stageBOutput.cards, chunkResult.chunks);
            apiCalls += verificationCalls;

            // Step 5: Post-processing
            const { cards: processedCards, warnings: postWarnings } =
                this.runPostProcessing(verifiedCards, stageAOutput, settings);
            warnings.push(...postWarnings);

            // Step 6: Coverage check - generate supplementary cards if needed
            const { cards: finalCards, apiCalls: coverageCalls, warnings: coverageWarnings } =
                await this.ensureCoverage(
                    processedCards,
                    stageAOutput.key_topics,
                    chunkResult.chunks,
                    module,
                    settings
                );
            apiCalls += coverageCalls;
            warnings.push(...coverageWarnings);

            // Step 7: Save deck
            const deck = this.saveDeck(module, finalCards, stageAOutput, stageBOutput, warnings);

            // Count review required
            const reviewCount = finalCards.filter(c => c.review_required).length;
            if (reviewCount > 0) {
                warnings.push(`${reviewCount} cards flagged for review`);
                store.metrics.cards_flagged_for_review += reviewCount;
            }

            // Determine status
            const status: ModuleStatus =
                finalCards.length === 0 ? "FAILED" :
                    finalCards.length < settings.target_card_count || reviewCount > 0 ? "PARTIAL" :
                        "SUCCESS";

            const timeMs = Date.now() - startTime;
            const costEstimate = this.estimateCost(apiCalls, settings.model);

            return {
                module_id: module.module_id,
                course_id: module.course_id,
                module_title: module.module_title,
                status,
                generated_count: finalCards.length,
                verified_count: verifiedCount,
                warnings,
                deck_id: deck.id || `deck_${module.module_id}_${Date.now()}`,
                metrics: {
                    time_ms: timeMs,
                    api_calls: apiCalls,
                    cost_estimate: costEstimate,
                    chunks_retrieved: chunkResult.chunks.length,
                    verification_rate: finalCards.length > 0 ? verifiedCount / finalCards.length : 0,
                },
                logs_url: `/api/logs/modules/${module.module_id}`,
                retry_count: 0,
                completed_at: new Date().toISOString(),
            };

        } catch (error) {
            console.error(`[Orchestrator] Module ${module.module_id} failed:`, error);
            return this.createModuleResult(module, "FAILED", startTime, {
                apiCalls,
                error: error instanceof Error ? error.message : 'Unknown error',
                chunks_retrieved: 0,
            });
        }
    }

    // ===========================================================================
    // PRIVATE: Retrieve chunks from vector DB (placeholder)
    // ===========================================================================

    private async retrieveChunks(
        module: ModuleToProcess,
        topK: number
    ): Promise<ChunkRetrievalResult> {
        // TODO: Replace with actual vector DB query
        // This is a placeholder that should integrate with your vector store

        console.log(`[Orchestrator] Retrieving ${topK} chunks for module: ${module.module_id}`);

        // Placeholder: return empty for now - implement actual retrieval
        return {
            success: true,
            chunks: [], // Would come from vector DB
            total_tokens: 0,
            needs_more_content: true, // Would be false if chunks found
        };
    }

    // ===========================================================================
    // PRIVATE: Stage A with retry
    // ===========================================================================

    private async runStageAWithRetry(
        module: ModuleToProcess,
        chunks: Chunk[],
        settings: OrchestratorSettings
    ): Promise<StageAOutput> {
        return this.withRetry(async () => {
            const userPrompt = buildStageACompletePrompt({
                module_id: module.module_id,
                module_title: module.module_title,
                course_id: module.course_id,
                contextChunks: chunks,
            });

            const chat = this.model.startChat({
                history: [
                    { role: "user", parts: [{ text: STAGE_A_SYSTEM_PROMPT_COMPLETE }] },
                    { role: "model", parts: [{ text: "I understand. I will analyze the chunks and produce JSON output." }] },
                ],
            });

            const result = await chat.sendMessage(userPrompt);
            const responseText = result.response.text();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("Stage A: Failed to extract JSON from response");
            }

            return StageAOutputSchema.parse(JSON.parse(jsonMatch[0]));
        }, "Stage A");
    }

    // ===========================================================================
    // PRIVATE: Stage B with retry
    // ===========================================================================

    private async runStageBWithRetry(
        module: ModuleToProcess,
        chunks: Chunk[],
        stageAOutput: StageAOutput,
        settings: OrchestratorSettings
    ): Promise<StageBOutput> {
        return this.withRetry(async () => {
            const userPrompt = buildStageBCompletePrompt({
                module_id: module.module_id,
                module_title: module.module_title,
                course_id: module.course_id,
                contextChunks: chunks,
                module_summary: stageAOutput.module_summary,
                key_topics: stageAOutput.key_topics,
                settings: {
                    target_card_count: settings.target_card_count,
                    difficulty_distribution: settings.difficulty_distribution,
                },
            });

            const chat = this.model.startChat({
                history: [
                    { role: "user", parts: [{ text: STAGE_B_SYSTEM_PROMPT_COMPLETE }] },
                    { role: "model", parts: [{ text: "I understand. I will generate flashcards with proper evidence." }] },
                ],
            });

            const result = await chat.sendMessage(userPrompt);
            const responseText = result.response.text();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("Stage B: Failed to extract JSON from response");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error) {
                throw new Error(`Stage B error: ${parsed.details}`);
            }

            return StageBOutputSchema.parse(parsed);
        }, "Stage B");
    }

    // ===========================================================================
    // PRIVATE: Batch verification
    // ===========================================================================

    private async runVerificationBatch(
        cards: Flashcard[],
        chunks: Chunk[]
    ): Promise<{ cards: Flashcard[]; verifiedCount: number; totalApiCalls: number }> {
        const verifiedCards: Flashcard[] = [];
        let verifiedCount = 0;
        let apiCalls = 0;

        for (const card of cards) {
            // First try programmatic verification
            const programmaticResult = this.programmaticVerify(card, chunks);

            if (programmaticResult.verified) {
                verifiedCards.push({
                    ...card,
                    review_required: false,
                    confidence_score: Math.max(card.confidence_score, programmaticResult.confidence),
                });
                verifiedCount++;
                continue;
            }

            // Fall back to model verification
            try {
                const modelResult = await this.runModelVerification(card, chunks);
                apiCalls++;

                verifiedCards.push({
                    ...card,
                    review_required: !modelResult.verified,
                    confidence_score: modelResult.confidence,
                });

                if (modelResult.verified) verifiedCount++;
            } catch (error) {
                console.warn(`[Verification] Failed for ${card.card_id}:`, error);
                verifiedCards.push({
                    ...card,
                    review_required: true,
                    confidence_score: 0.0,
                });
            }
        }

        return { cards: verifiedCards, verifiedCount, totalApiCalls: apiCalls };
    }

    // ===========================================================================
    // PRIVATE: Programmatic verification
    // ===========================================================================

    private programmaticVerify(card: Flashcard, chunks: Chunk[]): CardVerificationResult {
        const corrections: CardVerificationResult["corrections"] = [];
        let allVerified = true;

        for (let i = 0; i < card.evidence.length; i++) {
            const evidence = card.evidence[i];
            const chunk = chunks.find(c => c.chunk_id === evidence.chunk_id);

            if (!chunk) {
                corrections.push({
                    evidence_index: i,
                    status: "missing",
                    corrected_excerpt: null,
                    reason: `Chunk ${evidence.chunk_id} not found`,
                });
                allVerified = false;
                continue;
            }

            const normalizedChunk = chunk.text.toLowerCase().replace(/\s+/g, ' ').trim();
            const normalizedExcerpt = evidence.excerpt.toLowerCase().replace(/\s+/g, ' ').trim();

            if (normalizedChunk.includes(normalizedExcerpt)) {
                corrections.push({ evidence_index: i, status: "ok", corrected_excerpt: null });
            } else {
                // Try to find similar sentence
                const sentences = chunk.text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
                const similar = sentences.find(s =>
                    this.calculateSimilarity(s.toLowerCase(), normalizedExcerpt) > 0.6
                );

                if (similar) {
                    corrections.push({
                        evidence_index: i,
                        status: "corrected",
                        corrected_excerpt: similar,
                        reason: "Excerpt adjusted to match chunk",
                    });
                } else {
                    corrections.push({
                        evidence_index: i,
                        status: "missing",
                        corrected_excerpt: null,
                        reason: "No matching text found in chunk",
                    });
                    allVerified = false;
                }
            }
        }

        return {
            card_id: card.card_id,
            verified: allVerified,
            confidence: allVerified ? 0.95 : 0.3,
            corrections,
        };
    }

    // ===========================================================================
    // PRIVATE: Model-based verification
    // ===========================================================================

    private async runModelVerification(
        card: Flashcard,
        chunks: Chunk[]
    ): Promise<CardVerificationResult> {
        const userPrompt = buildVerificationPrompt({ card, contextChunks: chunks });

        const chat = this.model.startChat({
            history: [
                { role: "user", parts: [{ text: VERIFICATION_SYSTEM_PROMPT_COMPLETE }] },
                { role: "model", parts: [{ text: "I will verify the evidence excerpts." }] },
            ],
        });

        const result = await chat.sendMessage(userPrompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Verification: Failed to extract JSON");
        }

        return CardVerificationResultSchema.parse(JSON.parse(jsonMatch[0]));
    }

    // ===========================================================================
    // PRIVATE: Post-processing
    // ===========================================================================

    private runPostProcessing(
        cards: Flashcard[],
        stageAOutput: StageAOutput,
        settings: OrchestratorSettings
    ): { cards: Flashcard[]; warnings: string[] } {
        const warnings: string[] = [];
        let processedCards = [...cards];

        // 1. Enforce answer limits
        processedCards = processedCards.map(card => {
            const words = card.a.split(/\s+/);
            if (words.length > 40) {
                return { ...card, a: words.slice(0, 40).join(" ") + "..." };
            }
            if (card.a.length > 300) {
                return { ...card, a: card.a.substring(0, 297) + "..." };
            }
            return card;
        });

        // 2. Deduplicate
        const { cards: dedupedCards, removed } = this.deduplicateCards(processedCards, settings.dedupe_threshold);
        processedCards = dedupedCards;
        if (removed > 0) {
            warnings.push(`Removed ${removed} duplicate questions`);
        }

        // 3. Check difficulty balance
        const diffs = {
            easy: processedCards.filter(c => c.difficulty === "easy").length,
            medium: processedCards.filter(c => c.difficulty === "medium").length,
            hard: processedCards.filter(c => c.difficulty === "hard").length,
        };
        const target = settings.difficulty_distribution;
        if (Math.abs(diffs.easy - target.easy) > 2 ||
            Math.abs(diffs.medium - target.medium) > 2 ||
            Math.abs(diffs.hard - target.hard) > 2) {
            warnings.push(`Difficulty imbalance: easy=${diffs.easy}, medium=${diffs.medium}, hard=${diffs.hard}`);
        }

        // 4. Check Bloom distribution
        const higherOrder = processedCards.filter(c =>
            ["Apply", "Analyze", "Evaluate", "Create"].includes(c.bloom_level)
        ).length;
        if (higherOrder < settings.min_higher_order_bloom) {
            warnings.push(`Low higher-order Bloom: ${higherOrder}/${settings.min_higher_order_bloom} required`);
        }

        return { cards: processedCards, warnings };
    }

    // ===========================================================================
    // PRIVATE: Ensure topic coverage
    // ===========================================================================

    private async ensureCoverage(
        cards: Flashcard[],
        keyTopics: StageAOutput["key_topics"],
        chunks: Chunk[],
        module: ModuleToProcess,
        settings: OrchestratorSettings
    ): Promise<{ cards: Flashcard[]; apiCalls: number; warnings: string[] }> {
        const warnings: string[] = [];
        let apiCalls = 0;
        const resultCards = [...cards];

        const coveredTopics = new Set<string>();
        for (const card of cards) {
            for (const topic of keyTopics) {
                if (card.q.toLowerCase().includes(topic.topic.toLowerCase()) ||
                    card.a.toLowerCase().includes(topic.topic.toLowerCase())) {
                    coveredTopics.add(topic.topic);
                }
            }
        }

        const uncoveredTopics = keyTopics
            .filter(t => !coveredTopics.has(t.topic))
            .map(t => t.topic);

        if (uncoveredTopics.length > 0) {
            warnings.push(`Uncovered topics: ${uncoveredTopics.join(", ")}`);

            // Try to generate supplementary cards (max 3)
            for (const topic of uncoveredTopics.slice(0, 3)) {
                try {
                    const supplementaryCard = await this.generateSupplementaryCard(
                        module,
                        topic,
                        chunks,
                        resultCards,
                        settings
                    );
                    if (supplementaryCard) {
                        resultCards.push(supplementaryCard);
                        apiCalls++;
                    }
                } catch (error) {
                    console.warn(`[Coverage] Failed to generate card for: ${topic}`);
                }
            }
        }

        return { cards: resultCards, apiCalls, warnings };
    }

    // ===========================================================================
    // PRIVATE: Generate supplementary card
    // ===========================================================================

    private async generateSupplementaryCard(
        module: ModuleToProcess,
        topic: string,
        chunks: Chunk[],
        existingCards: Flashcard[],
        settings: OrchestratorSettings
    ): Promise<Flashcard | null> {
        const prompt = buildSupplementaryCardPromptComplete({
            module_id: module.module_id,
            module_title: module.module_title,
            uncovered_topic: topic,
            contextChunks: chunks,
            existing_questions: existingCards.map(c => c.q),
            card_number: existingCards.length + 1,
        });

        if (prompt.startsWith("ERROR:")) {
            return null;
        }

        const chat = this.model.startChat({
            history: [
                { role: "user", parts: [{ text: STAGE_B_SYSTEM_PROMPT_COMPLETE }] },
                { role: "model", parts: [{ text: "I will generate a supplementary card." }] },
            ],
        });

        const result = await chat.sendMessage(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) return null;

        return FlashcardSchema.parse(parsed);
    }

    // ===========================================================================
    // PRIVATE: Save deck
    // ===========================================================================

    private saveDeck(
        module: ModuleToProcess,
        cards: Flashcard[],
        stageAOutput: StageAOutput,
        stageBOutput: StageBOutput,
        warnings: string[]
    ): StoredFlashcardDeck {
        const deck: StoredFlashcardDeck = {
            id: `deck_${module.module_id}_${Date.now()}`,
            course_id: module.course_id,
            module_id: module.module_id,
            module_title: module.module_title,
            cards,
            stage_a_output: stageAOutput,
            warnings,
            generation_metadata: stageBOutput.generation_metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reviewed_by: null,
            review_status: cards.some(c => c.review_required) ? "pending" : "approved",
        };

        const key = `${module.course_id}:${module.module_id}`;
        store.moduleDecks.set(key, deck);

        return deck;
    }

    // ===========================================================================
    // PRIVATE: Helper methods
    // ===========================================================================

    private async getModulesToProcess(input: OrchestratorInput): Promise<ModuleToProcess[]> {
        // TODO: Replace with actual DB query based on mode
        // This is a placeholder

        if (input.mode === "single_module" && input.target.module_id && input.target.course_id) {
            return [{
                module_id: input.target.module_id,
                course_id: input.target.course_id,
                module_title: "Module Title", // Would come from DB
                needs_regeneration: true,
            }];
        }

        // For course/all_courses modes, query DB for modules
        return [];
    }

    private createModuleResult(
        module: ModuleToProcess,
        status: ModuleStatus,
        startTime: number,
        opts: {
            apiCalls?: number;
            error?: string;
            warnings?: string[];
            chunks_retrieved?: number;
        }
    ): ModuleResult {
        return {
            module_id: module.module_id,
            course_id: module.course_id,
            module_title: module.module_title,
            status,
            generated_count: 0,
            verified_count: 0,
            warnings: opts.warnings || [],
            deck_id: null,
            metrics: {
                time_ms: Date.now() - startTime,
                api_calls: opts.apiCalls || 0,
                cost_estimate: 0,
                chunks_retrieved: opts.chunks_retrieved || 0,
                verification_rate: 0,
            },
            logs_url: null,
            error_message: opts.error,
            retry_count: 0,
            completed_at: new Date().toISOString(),
        };
    }

    private async withRetry<T>(
        fn: () => Promise<T>,
        stageName: string
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Check if it's a rate limit error
                const isRateLimit = lastError.message.includes("429") ||
                    lastError.message.includes("rate limit");

                if (attempt < RETRY_CONFIG.maxRetries - 1) {
                    const delay = Math.min(
                        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
                        RETRY_CONFIG.maxDelayMs
                    );
                    console.warn(`[${stageName}] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new Error(`${stageName} failed after ${RETRY_CONFIG.maxRetries} attempts`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private estimateCost(apiCalls: number, model: string): number {
        // Rough estimate: assume ~2000 tokens per call
        const tokensPerCall = 2000;
        const costPer1K = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS] || 0.0001;
        return (apiCalls * tokensPerCall / 1000) * costPer1K;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }

    private deduplicateCards(
        cards: Flashcard[],
        threshold: number
    ): { cards: Flashcard[]; removed: number } {
        const unique: Flashcard[] = [];
        const seenQuestions: string[] = [];
        let removed = 0;

        for (const card of cards) {
            const normalized = card.q.toLowerCase().replace(/[^\w\s]/g, "").trim();

            let isDuplicate = false;
            for (const seen of seenQuestions) {
                if (this.calculateSimilarity(normalized, seen) > threshold) {
                    isDuplicate = true;
                    removed++;
                    break;
                }
            }

            if (!isDuplicate) {
                seenQuestions.push(normalized);
                unique.push(card);
            }
        }

        return { cards: unique, removed };
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createOrchestratorService(
    config?: Partial<OrchestratorSettings>
): FlashcardOrchestratorService {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable");
    }

    return new FlashcardOrchestratorService(apiKey, config);
}

// =============================================================================
// TRIGGER HANDLERS
// =============================================================================

export async function handleContentUploadTrigger(
    moduleId: string,
    courseId: string,
    changedFile: string
): Promise<string> {
    const orchestrator = createOrchestratorService();
    const jobId = uuidv4();

    await orchestrator.queueJob({
        job_id: jobId,
        mode: "single_module",
        target: { module_id: moduleId, course_id: courseId },
        triggered_by: "content_update",
        priority: "normal",
    });

    console.log(`[Trigger] Queued regeneration for ${moduleId} due to file change: ${changedFile}`);
    return jobId;
}

export async function handleScheduledRefresh(): Promise<string> {
    const orchestrator = createOrchestratorService();
    const jobId = uuidv4();

    await orchestrator.queueJob({
        job_id: jobId,
        mode: "all_courses",
        target: {},
        triggered_by: "scheduled",
        priority: "low",
    });

    console.log(`[Trigger] Started scheduled refresh job: ${jobId}`);
    return jobId;
}
