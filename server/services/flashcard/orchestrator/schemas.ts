/**
 * Flashcard Orchestrator - Zod Schemas
 * 
 * Production-ready Zod validators for Stage A and Stage B LLM outputs.
 * All LLM responses MUST be validated against these schemas before use.
 */

import { z } from "zod";

// =============================================================================
// STAGE A SCHEMAS (Module Summarization)
// =============================================================================

/**
 * A single summary point with chunk citations
 */
export const SummaryPointSchema = z.object({
    point: z.string().min(10).max(500).describe("Concise statement summarizing a key concept"),
    supports: z.array(z.string()).min(1).describe("Array of chunk_ids that support this point"),
});

/**
 * A key topic extracted from the module content
 */
export const KeyTopicSchema = z.object({
    topic: z.string().min(2).max(100).describe("Topic name or concept"),
    supports: z.array(z.string()).describe("Array of chunk_ids covering this topic"),
});

/**
 * Coverage map entry showing which outline headings are covered
 */
export const CoverageMapEntrySchema = z.object({
    heading: z.string().describe("Outline heading or section title"),
    status: z.enum(["Covered", "Not Covered", "Partially Covered"]),
    supports: z.array(z.string()).describe("Chunk_ids that cover this heading"),
});

/**
 * Complete Stage A Output Schema
 */
export const StageAOutputSchema = z.object({
    module_summary: z.array(SummaryPointSchema)
        .min(6)
        .max(10)
        .describe("6-10 numbered concise bullet points summarizing module concepts"),
    key_topics: z.array(KeyTopicSchema)
        .min(6)
        .max(12)
        .describe("6-12 key topics extracted from the content"),
    coverage_map: z.array(CoverageMapEntrySchema)
        .optional()
        .describe("Optional mapping of outline headings to coverage status"),
});

export type StageAOutput = z.infer<typeof StageAOutputSchema>;

// =============================================================================
// STAGE B SCHEMAS (Flashcard Generation)
// =============================================================================

/**
 * Evidence item linking a card to source content
 */
export const EvidenceSchema = z.object({
    chunk_id: z.string().describe("ID of the source chunk"),
    source_file: z.string().describe("Original file name"),
    loc: z.string().describe("Location: slide number, page, or timestamp range"),
    start_sec: z.number().nullable().optional().describe("Start time in seconds for audio/video"),
    end_sec: z.number().nullable().optional().describe("End time in seconds for audio/video"),
    excerpt: z.string().min(10).max(500).describe("Exact 1-2 sentence excerpt from the chunk"),
});

/**
 * Source reference for a flashcard
 */
export const SourceSchema = z.object({
    type: z.enum(["video", "slides", "pdf", "quiz", "audio", "document", "transcript"]),
    file: z.string().describe("File name"),
    loc: z.string().describe("Location within the file"),
});

/**
 * Bloom's Taxonomy levels for cognitive classification
 */
export const BloomLevelSchema = z.enum([
    "Remember",
    "Understand",
    "Apply",
    "Analyze",
    "Evaluate",
    "Create",
]);

/**
 * Difficulty levels for cards
 */
export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

/**
 * Individual flashcard schema
 */
export const FlashcardSchema = z.object({
    card_id: z.string().regex(/^M[\w-]+_C\d+$/).describe("Card ID in format M<module_id>_C<number>"),
    q: z.string().min(10).max(300).describe("Clear, specific question"),
    a: z.string().min(5).max(300).describe("Concise answer, max 40 words or 300 chars"),
    difficulty: DifficultySchema,
    bloom_level: BloomLevelSchema,
    evidence: z.array(EvidenceSchema).min(1).max(3).describe("1-3 evidence items with citations"),
    sources: z.array(SourceSchema).min(1).describe("Source references"),
    confidence_score: z.number().min(0).max(1).describe("Model's confidence in accuracy (0-1)"),
    rationale: z.string().max(200).describe("Brief explanation of card's importance"),
    review_required: z.boolean().default(false).describe("Whether card needs human review"),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

/**
 * Generation metadata for tracking model usage
 */
export const GenerationMetadataSchema = z.object({
    model: z.string(),
    temperature: z.number(),
    timestamp: z.string().datetime(),
    tokens_used: z.number().int().optional(),
    prompt_tokens: z.number().int().optional(),
    completion_tokens: z.number().int().optional(),
});

/**
 * Complete Stage B Output Schema
 */
export const StageBOutputSchema = z.object({
    module_id: z.string(),
    module_title: z.string(),
    generated_count: z.number().int().min(0).max(20),
    cards: z.array(FlashcardSchema).describe("Generated flashcards"),
    warnings: z.array(z.string()).describe("Any warnings during generation"),
    generation_metadata: GenerationMetadataSchema.optional(),
});

export type StageBOutput = z.infer<typeof StageBOutputSchema>;

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

/**
 * Error output when LLM returns invalid response
 */
export const LLMErrorOutputSchema = z.object({
    error: z.literal(true),
    errorType: z.enum([
        "INVALID_LLM_OUTPUT",
        "SCHEMA_VALIDATION_FAILED",
        "TIMEOUT",
        "RATE_LIMITED",
        "API_ERROR",
        "INSUFFICIENT_CONTEXT",
    ]),
    details: z.string().optional(),
    rawLogsUrl: z.string().optional(),
    attemptCount: z.number().int(),
});

export type LLMErrorOutput = z.infer<typeof LLMErrorOutputSchema>;

// =============================================================================
// VERIFICATION SCHEMAS
// =============================================================================

/**
 * Verification correction status
 */
export const CorrectionStatusSchema = z.enum(["ok", "corrected", "missing"]);

/**
 * Single evidence verification correction
 */
export const EvidenceCorrectionSchema = z.object({
    evidence_index: z.number().int(),
    status: CorrectionStatusSchema,
    corrected_excerpt: z.string().nullable(),
    reason: z.string().optional(),
    similarity_score: z.number().min(0).max(1).optional(),
});

/**
 * Card verification result
 */
export const CardVerificationResultSchema = z.object({
    card_id: z.string(),
    verified: z.boolean(),
    confidence: z.number().min(0).max(1),
    corrections: z.array(EvidenceCorrectionSchema),
});

export type CardVerificationResult = z.infer<typeof CardVerificationResultSchema>;

// =============================================================================
// CONTEXT CHUNK SCHEMA
// =============================================================================

/**
 * ContextChunk as passed to LLM
 */
export const ContextChunkSchema = z.object({
    chunk_id: z.string(),
    source_file: z.string(),
    provider: z.enum(["google_drive", "onedrive", "local", "other"]).optional(),
    slide_or_page: z.string().nullable().optional(),
    start_sec: z.number().nullable().optional(),
    end_sec: z.number().nullable().optional(),
    heading: z.string().nullable().optional(),
    text: z.string(),
    tokens_est: z.number().int().optional(),
});

export type ContextChunk = z.infer<typeof ContextChunkSchema>;

// =============================================================================
// STAGE WRAPPER TYPES
// =============================================================================

export interface StageAParams {
    jobId: string;
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: ContextChunk[];
    outlineHeadings?: string[];
    settings?: {
        temperature?: number;
        maxOutputTokens?: number;
    };
}

export interface StageBParams {
    jobId: string;
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: ContextChunk[];
    stageAOutput: StageAOutput;
    settings?: {
        temperature?: number;
        maxOutputTokens?: number;
        targetCardCount?: number;
        difficultyDistribution?: { easy: number; medium: number; hard: number };
    };
}

export interface StageResult<T> {
    success: boolean;
    data?: T;
    error?: LLMErrorOutput;
    rawLogsUrl?: string;
    tokensUsed?: number;
    durationMs?: number;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Safe parse with detailed error info
 */
export function safeParseStageA(data: unknown): { success: true; data: StageAOutput } | { success: false; error: string; issues: z.ZodIssue[] } {
    const result = StageAOutputSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        error: "Stage A output validation failed",
        issues: result.error.issues,
    };
}

/**
 * Safe parse Stage B with detailed error info
 */
export function safeParseStageB(data: unknown): { success: true; data: StageBOutput } | { success: false; error: string; issues: z.ZodIssue[] } {
    const result = StageBOutputSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        error: "Stage B output validation failed",
        issues: result.error.issues,
    };
}

/**
 * Validate a single flashcard
 */
export function validateFlashcard(card: unknown): { valid: boolean; card?: Flashcard; errors?: z.ZodIssue[] } {
    const result = FlashcardSchema.safeParse(card);
    if (result.success) {
        return { valid: true, card: result.data };
    }
    return { valid: false, errors: result.error.issues };
}
