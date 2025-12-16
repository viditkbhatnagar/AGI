/**
 * Flashcard Orchestrator - Module Index
 * 
 * Exports for Stage A/B wrappers, schemas, and utilities.
 */

// Schemas and types
export * from "./schemas";

// Few-shot examples and prompt builders
export {
    STAGE_A_EXAMPLE_CHUNKS,
    STAGE_A_EXAMPLE_OUTPUT,
    STAGE_B_EXAMPLE_OUTPUT,
    STAGE_A_FEW_SHOT_TEXT,
    STAGE_B_FEW_SHOT_TEXT,
    STAGE_A_SYSTEM_PROMPT,
    STAGE_B_SYSTEM_PROMPT,
    formatChunksForPrompt,
    buildStageAPrompt,
    buildStageBPrompt,
} from "./fewShots";

// Stage wrappers
export {
    callStageA,
    callStageB,
    getLLMClient,
    extractJSON,
    isRetryableError,
    withTimeout,
    stageCallsTotal,
    stageLatencySeconds,
    stageTokensUsed,
} from "./stageWrappers";
