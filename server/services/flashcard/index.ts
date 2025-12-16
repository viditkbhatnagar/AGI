/**
 * Flashcard Generation Pipeline - Module Index
 * 
 * Exports all flashcard-related types, services, and utilities.
 */

// Types and Schemas
export * from "./types";
export * from "./orchestratorTypes";

// Prompt Templates
export {
    STAGE_A_SYSTEM_PROMPT,
    STAGE_B_SYSTEM_PROMPT,
    VERIFICATION_SYSTEM_PROMPT,
    buildStageAUserPrompt,
    buildStageBUserPrompt,
    buildVerificationUserPrompt,
    buildSupplementaryCardPrompt,
    buildDifficultyAdjustmentPrompt
} from "./prompts";

// Orchestrator Prompts (complete, copy-paste ready)
export {
    ORCHESTRATOR_SYSTEM_PROMPT,
    STAGE_A_SYSTEM_PROMPT_COMPLETE,
    STAGE_B_SYSTEM_PROMPT_COMPLETE,
    VERIFICATION_SYSTEM_PROMPT_COMPLETE,
    REBALANCE_SYSTEM_PROMPT,
    buildStageACompletePrompt,
    buildStageBCompletePrompt,
    buildVerificationPrompt,
    buildRebalancePrompt,
    buildSupplementaryCardPromptComplete,
} from "./orchestratorPrompts";

// Main Service
export {
    FlashcardGenerationService,
    createFlashcardService
} from "./flashcardService";

// Orchestrator Service
export {
    FlashcardOrchestratorService,
    createOrchestratorService,
    handleContentUploadTrigger,
    handleScheduledRefresh,
} from "./orchestratorService";

// Controller Handlers
export {
    generateFlashcards,
    generateFlashcardsFromModule,
    getModuleFlashcards,
    getFlashcardById,
    updateFlashcard,
    deleteFlashcard,
    getReviewQueue,
    approveFlashcard,
    getModuleFlashcardStats
} from "./flashcardController";

// Orchestrator Controller Handlers
export {
    generateBatch,
    getJobStatus,
    listJobs,
    cancelJob,
    getMetrics,
    triggerContentUpdate,
    triggerScheduledRefresh,
    triggerManualRegeneration,
    getModuleDeck,
    healthCheck,
} from "./orchestratorController";

// Routes
export { default as flashcardRoutes } from "./flashcardRoutes";
export { default as orchestratorRoutes } from "./orchestratorRoutes";
export { default as productionFlashcardRoutes } from "./productionRoutes";

// Production Generator (v2 - with Google Drive & OneDrive support)
export {
    generateFlashcardsForModule,
    quickGenerateFlashcards,
} from "./productionGenerator";

// Production Document Extractor
export {
    extractDocumentContent,
    extractVideoContent,
    extractRecordingContent,
    extractAllModuleContent,
    parseGoogleDriveUrl,
    parseOneDriveUrl,
} from "./productionDocumentExtractor";

// Content Fetcher
export {
    fetchModuleContent,
    prepareChunksFromContent,
    prepareChunksWithExtraction,
    listCourseModules,
    listAllCourses,
} from "./contentFetcher";
