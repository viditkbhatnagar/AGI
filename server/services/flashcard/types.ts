/**
 * Flashcard Generation Pipeline - Type Definitions
 * 
 * This module defines all TypeScript types and Zod validation schemas
 * for the two-stage flashcard generation pipeline.
 */

import { z } from "zod";

// =============================================================================
// PRECONDITIONS - Input Types (what backend must supply to the prompt)
// =============================================================================

/**
 * Individual chunk from vector DB retrieval
 */
export const ChunkSchema = z.object({
    chunk_id: z.string(),
    source_file: z.string(), // e.g., "HR_fundamentals_slides.pptx" or "recording.mp4"
    provider: z.enum(["google_drive", "onedrive", "local", "cloudinary", "other"]),
    slide_or_page: z.union([z.string(), z.number()]).nullable(),
    start_sec: z.number().nullable(), // For audio/video
    end_sec: z.number().nullable(),   // For audio/video
    heading: z.string().nullable(),   // Nearest heading/topic
    text: z.string(),                 // The chunk text content (cleaned)
    tokens_est: z.number().int(),     // Estimated token size
});

export type Chunk = z.infer<typeof ChunkSchema>;

/**
 * Module metadata (optional context)
 */
export const ModuleMetadataSchema = z.object({
    total_duration_sec: z.number().optional(),
    course_outline_headings: z.array(z.string()).optional(),
    quiz_questions_list: z.array(z.object({
        id: z.string(),
        text: z.string(),
    })).optional(),
    existing_quiz_QAs: z.array(z.object({
        question: z.string(),
        answer: z.string(),
    })).optional(),
});

export type ModuleMetadata = z.infer<typeof ModuleMetadataSchema>;

/**
 * Prompt settings for model configuration
 */
export const PromptSettingsSchema = z.object({
    model_temperature: z.number().min(0).max(1).default(0.1),
    max_output_tokens: z.number().int().default(1500),
    max_context_tokens: z.number().int().default(8000),
});

export type PromptSettings = z.infer<typeof PromptSettingsSchema>;

/**
 * Complete input payload for flashcard generation
 */
export const FlashcardGenerationInputSchema = z.object({
    module_id: z.string(),
    course_id: z.string(),
    module_title: z.string(),
    retrieved_chunks: z.array(ChunkSchema).min(1).max(15),
    module_metadata: ModuleMetadataSchema.optional(),
    prompt_settings: PromptSettingsSchema.optional(),
});

export type FlashcardGenerationInput = z.infer<typeof FlashcardGenerationInputSchema>;

// =============================================================================
// STAGE A - Summary Output Types
// =============================================================================

export const SummaryPointSchema = z.object({
    point: z.string(),
    supports: z.array(z.string()), // chunk_ids
});

export type SummaryPoint = z.infer<typeof SummaryPointSchema>;

export const KeyTopicSchema = z.object({
    topic: z.string(),
    supports: z.array(z.string()), // chunk_ids
});

export type KeyTopic = z.infer<typeof KeyTopicSchema>;

export const CoverageItemSchema = z.object({
    heading: z.string(),
    status: z.enum(["Covered", "Not Covered"]),
    supports: z.array(z.string()), // chunk_ids
});

export type CoverageItem = z.infer<typeof CoverageItemSchema>;

export const StageAOutputSchema = z.object({
    module_summary: z.array(SummaryPointSchema),
    key_topics: z.array(KeyTopicSchema),
    coverage_map: z.array(CoverageItemSchema),
});

export type StageAOutput = z.infer<typeof StageAOutputSchema>;

// =============================================================================
// STAGE B - Flashcard Output Types
// =============================================================================

export const BloomLevelSchema = z.enum([
    "Remember",
    "Understand",
    "Apply",
    "Analyze",
    "Evaluate",
    "Create"
]);

export type BloomLevel = z.infer<typeof BloomLevelSchema>;

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export type Difficulty = z.infer<typeof DifficultySchema>;

export const EvidenceItemSchema = z.object({
    chunk_id: z.string(),
    source_file: z.string(),
    loc: z.string(), // "slide 3" or "p.12" or "00:03:12-00:03:35"
    start_sec: z.number().nullable(),
    end_sec: z.number().nullable(),
    excerpt: z.string().max(300), // Exact snippet from chunk
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const SourceCitationSchema = z.object({
    type: z.enum(["video", "slides", "pdf", "audio", "quiz"]),
    file: z.string(),
    loc: z.string(),
});

export type SourceCitation = z.infer<typeof SourceCitationSchema>;

export const FlashcardSchema = z.object({
    card_id: z.string(), // Format: M<module_id>_C<num>
    q: z.string(),       // Question (single clear sentence)
    a: z.string(),       // Answer (max 40 words)
    difficulty: DifficultySchema,
    bloom_level: BloomLevelSchema,
    evidence: z.array(EvidenceItemSchema),
    sources: z.array(SourceCitationSchema),
    confidence_score: z.number().min(0).max(1),
    rationale: z.string(),
    review_required: z.boolean().default(false),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

export const GenerationMetadataSchema = z.object({
    model: z.string(),
    temperature: z.number(),
    timestamp: z.string(), // ISO8601
});

export type GenerationMetadata = z.infer<typeof GenerationMetadataSchema>;

export const StageBOutputSchema = z.object({
    module_id: z.string(),
    module_title: z.string(),
    generated_count: z.number().int(),
    cards: z.array(FlashcardSchema),
    warnings: z.array(z.string()),
    generation_metadata: GenerationMetadataSchema,
});

export type StageBOutput = z.infer<typeof StageBOutputSchema>;

// =============================================================================
// VERIFICATION Types
// =============================================================================

export const VerificationCorrectionSchema = z.object({
    evidence_index: z.number().int(),
    original_excerpt: z.string(),
    corrected_excerpt: z.string().optional(),
    reason: z.string(),
});

export type VerificationCorrection = z.infer<typeof VerificationCorrectionSchema>;

export const VerificationResultSchema = z.object({
    card_id: z.string(),
    verified: z.boolean(),
    confidence: z.number().min(0).max(1),
    corrections: z.array(VerificationCorrectionSchema),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// =============================================================================
// DATABASE Types (for storage)
// =============================================================================

export const StoredFlashcardDeckSchema = z.object({
    id: z.string().optional(), // DB-generated
    course_id: z.string(),
    module_id: z.string(),
    module_title: z.string(),
    cards: z.array(FlashcardSchema),
    stage_a_output: StageAOutputSchema,
    warnings: z.array(z.string()),
    generation_metadata: GenerationMetadataSchema,
    created_at: z.string(), // ISO8601
    updated_at: z.string(), // ISO8601
    reviewed_by: z.string().nullable(),
    review_status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export type StoredFlashcardDeck = z.infer<typeof StoredFlashcardDeckSchema>;

// =============================================================================
// PIPELINE Configuration
// =============================================================================

export const PipelineConfigSchema = z.object({
    retrieval_K: z.number().int().min(4).max(15).default(8),
    model_temperature: z.number().min(0).max(0.3).default(0.1),
    max_output_tokens: z.number().int().default(1500),
    embedding_similarity_threshold: z.number().min(0.5).max(0.95).default(0.85),
    evidence_excerpt_min_chars: z.number().int().default(20),
    evidence_excerpt_max_chars: z.number().int().default(250),
    max_answer_words: z.number().int().default(40),
    max_answer_chars: z.number().int().default(300),
    target_card_count: z.number().int().default(10),
    difficulty_distribution: z.object({
        easy: z.number().int().default(3),
        medium: z.number().int().default(4),
        hard: z.number().int().default(3),
    }),
    min_higher_order_bloom: z.number().int().default(3), // Apply/Analyze/Evaluate/Create
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

// =============================================================================
// ERROR Types
// =============================================================================

export const PipelineErrorSchema = z.object({
    error: z.literal("RULE_VIOLATION"),
    details: z.string(),
    stage: z.enum(["stage_a", "stage_b", "verification", "post_processing"]),
    timestamp: z.string(),
});

export type PipelineError = z.infer<typeof PipelineErrorSchema>;

// =============================================================================
// HELPER Types for Post-Processing
// =============================================================================

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    similarity: number;
    matchingCardId?: string;
}

export interface CoverageAnalysis {
    covered_topics: string[];
    uncovered_topics: string[];
    coverage_percentage: number;
}

export interface DifficultyBalance {
    easy: number;
    medium: number;
    hard: number;
    isBalanced: boolean;
}

export interface BloomDistribution {
    lower_order: number;  // Remember, Understand
    higher_order: number; // Apply, Analyze, Evaluate, Create
    meetsRequirement: boolean;
}
