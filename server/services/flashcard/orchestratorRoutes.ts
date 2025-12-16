/**
 * Flashcard Orchestrator - Routes
 * 
 * Route definitions for batch flashcard generation and orchestration.
 */

import { Router } from "express";
import {
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

const router = Router();

// =============================================================================
// BATCH GENERATION ROUTES
// =============================================================================

/**
 * POST /api/flashcards/orchestrator/generate-batch
 * 
 * Queue a batch job for flashcard generation.
 * 
 * Body:
 * {
 *   job_id?: string (UUID)
 *   mode: "single_module" | "course" | "all_courses"
 *   target: { module_id?: string, course_id?: string }
 *   settings?: OrchestratorSettings
 * }
 */
router.post("/generate-batch", generateBatch);

// =============================================================================
// JOB MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /api/flashcards/orchestrator/jobs
 * 
 * List all jobs (with optional status filter).
 * Query params: status, limit
 */
router.get("/jobs", listJobs);

/**
 * GET /api/flashcards/orchestrator/jobs/:job_id
 * 
 * Get status of a specific job.
 */
router.get("/jobs/:job_id", getJobStatus);

/**
 * POST /api/flashcards/orchestrator/jobs/:job_id/cancel
 * 
 * Cancel a running or queued job.
 */
router.post("/jobs/:job_id/cancel", cancelJob);

// =============================================================================
// TRIGGER ROUTES
// =============================================================================

/**
 * POST /api/flashcards/orchestrator/trigger/content-update
 * 
 * Trigger regeneration due to content update.
 * Body: { module_id, course_id, file_changed? }
 */
router.post("/trigger/content-update", triggerContentUpdate);

/**
 * POST /api/flashcards/orchestrator/trigger/scheduled
 * 
 * Trigger scheduled refresh (called by cron job).
 */
router.post("/trigger/scheduled", triggerScheduledRefresh);

/**
 * POST /api/flashcards/orchestrator/trigger/manual
 * 
 * Manually trigger regeneration for a module.
 * Body: { module_id, course_id, force? }
 */
router.post("/trigger/manual", triggerManualRegeneration);

// =============================================================================
// METRICS & HEALTH ROUTES
// =============================================================================

/**
 * GET /api/flashcards/orchestrator/metrics
 * 
 * Get orchestrator metrics.
 */
router.get("/metrics", getMetrics);

/**
 * GET /api/flashcards/orchestrator/health
 * 
 * Health check for orchestrator service.
 */
router.get("/health", healthCheck);

// =============================================================================
// DECK RETRIEVAL ROUTES
// =============================================================================

/**
 * GET /api/flashcards/orchestrator/decks/:course_id/:module_id
 * 
 * Get the stored deck for a module.
 */
router.get("/decks/:course_id/:module_id", getModuleDeck);

export default router;
