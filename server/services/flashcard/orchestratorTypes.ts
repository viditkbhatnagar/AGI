/**
 * Flashcard Orchestrator - Type Definitions
 * 
 * Types for batch flashcard generation across courses/modules.
 */

import { z } from "zod";
import type { Chunk, PipelineConfig, Flashcard, StageAOutput, StoredFlashcardDeck } from "./types";

// =============================================================================
// ORCHESTRATOR INPUT SCHEMA
// =============================================================================

export const OrchestratorModeSchema = z.enum(["single_module", "course", "all_courses"]);
export type OrchestratorMode = z.infer<typeof OrchestratorModeSchema>;

export const OrchestratorTargetSchema = z.object({
    module_id: z.string().optional(),
    course_id: z.string().optional(),
});
export type OrchestratorTarget = z.infer<typeof OrchestratorTargetSchema>;

export const OrchestratorSettingsSchema = z.object({
    retrieval_K: z.number().int().min(4).max(15).default(8),
    target_card_count: z.number().int().min(5).max(20).default(10),
    model: z.enum(["gemini-1.5", "gemini-free", "gemini-1.5-flash", "gemini-1.5-pro"]).default("gemini-1.5-flash"),
    temperature: z.number().min(0).max(0.3).default(0.1),
    max_output_tokens: z.number().int().default(1500),
    dedupe_threshold: z.number().min(0.5).max(0.95).default(0.85),
    difficulty_distribution: z.object({
        easy: z.number().int().default(3),
        medium: z.number().int().default(4),
        hard: z.number().int().default(3),
    }).default({ easy: 3, medium: 4, hard: 3 }),
    min_higher_order_bloom: z.number().int().default(3),
    max_retries: z.number().int().default(3),
    concurrency: z.number().int().min(1).max(10).default(4),
});
export type OrchestratorSettings = z.infer<typeof OrchestratorSettingsSchema>;

export const OrchestratorInputSchema = z.object({
    job_id: z.string().uuid(),
    mode: OrchestratorModeSchema,
    target: OrchestratorTargetSchema,
    settings: OrchestratorSettingsSchema.optional(),
    triggered_by: z.enum(["manual", "scheduled", "content_update", "api"]).default("api"),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
});
export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

// =============================================================================
// ORCHESTRATOR OUTPUT SCHEMA (per module)
// =============================================================================

export const ModuleStatusSchema = z.enum([
    "SUCCESS",
    "PARTIAL",
    "FAILED",
    "NEED_MORE_CONTENT",
    "QUEUED",
    "PROCESSING",
    "SKIPPED"
]);
export type ModuleStatus = z.infer<typeof ModuleStatusSchema>;

export const ModuleMetricsSchema = z.object({
    time_ms: z.number().int(),
    api_calls: z.number().int(),
    cost_estimate: z.number(), // USD
    tokens_used: z.number().int().optional(),
    chunks_retrieved: z.number().int(),
    verification_rate: z.number(), // 0-1
});
export type ModuleMetrics = z.infer<typeof ModuleMetricsSchema>;

export const ModuleResultSchema = z.object({
    module_id: z.string(),
    course_id: z.string(),
    module_title: z.string(),
    status: ModuleStatusSchema,
    generated_count: z.number().int(),
    verified_count: z.number().int(),
    warnings: z.array(z.string()),
    deck_id: z.string().nullable(),
    metrics: ModuleMetricsSchema,
    logs_url: z.string().nullable(),
    error_message: z.string().optional(),
    retry_count: z.number().int().default(0),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
});
export type ModuleResult = z.infer<typeof ModuleResultSchema>;

// =============================================================================
// JOB STATUS SCHEMA
// =============================================================================

export const JobStatusSchema = z.enum([
    "queued",
    "processing",
    "completed",
    "completed_with_errors",
    "failed",
    "cancelled"
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobResultSchema = z.object({
    job_id: z.string().uuid(),
    status: JobStatusSchema,
    mode: OrchestratorModeSchema,
    modules_total: z.number().int(),
    modules_completed: z.number().int(),
    modules_failed: z.number().int(),
    modules_skipped: z.number().int(),
    estimated_time_minutes: z.number().optional(),
    started_at: z.string(),
    completed_at: z.string().optional(),
    module_results: z.array(ModuleResultSchema),
    aggregate_metrics: z.object({
        total_time_ms: z.number().int(),
        total_api_calls: z.number().int(),
        total_cost_estimate: z.number(),
        average_verification_rate: z.number(),
        total_cards_generated: z.number().int(),
        total_cards_verified: z.number().int(),
    }).optional(),
});
export type JobResult = z.infer<typeof JobResultSchema>;

// =============================================================================
// QUEUE RESPONSE SCHEMA
// =============================================================================

export const JobQueueResponseSchema = z.object({
    job_id: z.string().uuid(),
    status: z.literal("queued"),
    estimated_time_minutes: z.number(),
    modules_to_process: z.number().int(),
    position_in_queue: z.number().int().optional(),
});
export type JobQueueResponse = z.infer<typeof JobQueueResponseSchema>;

// =============================================================================
// VERIFICATION TYPES
// =============================================================================

export const VerificationCorrectionStatusSchema = z.enum(["ok", "corrected", "missing"]);

export const CardVerificationResultSchema = z.object({
    card_id: z.string(),
    verified: z.boolean(),
    confidence: z.number().min(0).max(1),
    corrections: z.array(z.object({
        evidence_index: z.number().int(),
        status: VerificationCorrectionStatusSchema,
        corrected_excerpt: z.string().nullable(),
        reason: z.string().optional(),
    })),
});
export type CardVerificationResult = z.infer<typeof CardVerificationResultSchema>;

// =============================================================================
// BATCH PROCESSING TYPES
// =============================================================================

export interface ModuleToProcess {
    module_id: string;
    course_id: string;
    module_title: string;
    content_checksum?: string;
    last_generated_at?: string;
    needs_regeneration: boolean;
    reason?: string;
}

export interface BatchJobContext {
    job_id: string;
    settings: OrchestratorSettings;
    modules: ModuleToProcess[];
    started_at: Date;
    current_module_index: number;
    results: ModuleResult[];
    cancelled: boolean;
}

// =============================================================================
// CONTENT CHUNK RETRIEVAL TYPES
// =============================================================================

export interface ChunkRetrievalResult {
    success: boolean;
    chunks: Chunk[];
    total_tokens: number;
    error?: string;
    needs_more_content: boolean;
}

// =============================================================================
// TRIGGER TYPES
// =============================================================================

export const GenerationTriggerSchema = z.object({
    type: z.enum(["content_upload", "content_modify", "scheduled", "manual", "review_refresh"]),
    module_id: z.string().optional(),
    course_id: z.string().optional(),
    file_changed: z.string().optional(),
    triggered_by_user: z.string().optional(),
    scheduled_run_id: z.string().optional(),
});
export type GenerationTrigger = z.infer<typeof GenerationTriggerSchema>;

// =============================================================================
// MONITORING METRICS TYPES
// =============================================================================

export interface OrchestratorMetrics {
    decks_generated_total: number;
    decks_failed_total: number;
    decks_partial_total: number;
    average_generation_time_ms: number;
    average_cards_verified_rate: number;
    cards_flagged_for_review: number;
    cost_per_deck_estimate: number;
    jobs_in_queue: number;
    jobs_processing: number;
    last_successful_run: string | null;
    last_failed_run: string | null;
}

// =============================================================================
// REVIEW QUEUE TYPES
// =============================================================================

export interface ReviewQueueItem {
    card_id: string;
    module_id: string;
    course_id: string;
    module_title: string;
    question: string;
    answer: string;
    evidence: Flashcard["evidence"];
    sources: Flashcard["sources"];
    confidence_score: number;
    verification_issues: string[];
    flagged_at: string;
    deck_id: string;
}

export interface ReviewQueueStats {
    total_pending: number;
    by_course: Record<string, number>;
    oldest_pending_days: number;
    avg_pending_days: number;
}

// =============================================================================
// REBALANCE TYPES
// =============================================================================

export interface RebalanceRequest {
    module_id: string;
    course_id: string;
    current_cards: Flashcard[];
    target_difficulty_distribution: OrchestratorSettings["difficulty_distribution"];
    cards_to_adjust: string[]; // card_ids
    target_bloom_level?: string;
    target_difficulty?: "easy" | "medium" | "hard";
}

export interface RebalanceResult {
    success: boolean;
    adjusted_cards: Flashcard[];
    failed_adjustments: string[];
    warnings: string[];
}
