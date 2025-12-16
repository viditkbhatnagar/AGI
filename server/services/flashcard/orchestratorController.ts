/**
 * Flashcard Orchestrator - Controller
 * 
 * API endpoints for batch flashcard generation and job management.
 */

import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { createOrchestratorService } from "./orchestratorService";
import { OrchestratorInputSchema } from "./orchestratorTypes";
import { ZodError } from "zod";

// Use native crypto.randomUUID for ESM compatibility
const uuidv4 = (): string => randomUUID();

// =============================================================================
// BATCH GENERATION ENDPOINTS
// =============================================================================

/**
 * POST /api/flashcards/generate-batch
 * 
 * Queue a batch job for flashcard generation.
 * 
 * Request Body:
 * {
 *   job_id?: string (UUID, auto-generated if not provided)
 *   mode: "single_module" | "course" | "all_courses"
 *   target: { module_id?: string, course_id?: string }
 *   settings?: OrchestratorSettings
 * }
 */
export async function generateBatch(req: Request, res: Response) {
    try {
        // Auto-generate job_id if not provided
        const input = {
            job_id: req.body.job_id || uuidv4(),
            ...req.body,
        };

        // Validate input
        const validated = OrchestratorInputSchema.parse(input);

        // Validate target based on mode
        if (validated.mode === "single_module") {
            if (!validated.target.module_id || !validated.target.course_id) {
                return res.status(400).json({
                    success: false,
                    error: "VALIDATION_ERROR",
                    message: "single_module mode requires both module_id and course_id in target",
                });
            }
        } else if (validated.mode === "course") {
            if (!validated.target.course_id) {
                return res.status(400).json({
                    success: false,
                    error: "VALIDATION_ERROR",
                    message: "course mode requires course_id in target",
                });
            }
        }

        // Create orchestrator and queue job
        const orchestrator = createOrchestratorService(validated.settings);
        const response = await orchestrator.queueJob(validated);

        res.status(202).json({
            success: true,
            data: response,
            message: `Job queued for processing`,
        });

    } catch (error) {
        console.error("[OrchestratorController] generateBatch error:", error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                error: "VALIDATION_ERROR",
                details: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            error: "QUEUE_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * GET /api/flashcards/jobs/:job_id
 * 
 * Get status of a batch job.
 */
export async function getJobStatus(req: Request, res: Response) {
    try {
        const { job_id } = req.params;

        const orchestrator = createOrchestratorService();
        const job = orchestrator.getJobStatus(job_id);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: `Job ${job_id} not found`,
            });
        }

        res.status(200).json({
            success: true,
            data: job,
        });

    } catch (error) {
        console.error("[OrchestratorController] getJobStatus error:", error);
        res.status(500).json({
            success: false,
            error: "RETRIEVAL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * GET /api/flashcards/jobs
 * 
 * List all jobs (with optional status filter).
 */
export async function listJobs(req: Request, res: Response) {
    try {
        const { status, limit = 50 } = req.query;

        // Note: In production, this would query a database
        // For now, the in-memory store doesn't support listing

        res.status(200).json({
            success: true,
            data: {
                jobs: [],
                total: 0,
                message: "Job listing requires database integration",
            },
        });

    } catch (error) {
        console.error("[OrchestratorController] listJobs error:", error);
        res.status(500).json({
            success: false,
            error: "RETRIEVAL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * POST /api/flashcards/jobs/:job_id/cancel
 * 
 * Cancel a running or queued job.
 */
export async function cancelJob(req: Request, res: Response) {
    try {
        const { job_id } = req.params;

        // Note: Actual cancellation logic would require job queue integration
        // For now, return a placeholder response

        res.status(200).json({
            success: true,
            message: `Cancel request sent for job ${job_id}`,
            note: "Job cancellation requires background worker integration",
        });

    } catch (error) {
        console.error("[OrchestratorController] cancelJob error:", error);
        res.status(500).json({
            success: false,
            error: "CANCEL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

// =============================================================================
// METRICS ENDPOINTS
// =============================================================================

/**
 * GET /api/flashcards/metrics
 * 
 * Get orchestrator metrics.
 */
export async function getMetrics(req: Request, res: Response) {
    try {
        const orchestrator = createOrchestratorService();
        const metrics = orchestrator.getMetrics();

        res.status(200).json({
            success: true,
            data: metrics,
        });

    } catch (error) {
        console.error("[OrchestratorController] getMetrics error:", error);
        res.status(500).json({
            success: false,
            error: "RETRIEVAL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

// =============================================================================
// TRIGGER ENDPOINTS
// =============================================================================

/**
 * POST /api/flashcards/trigger/content-update
 * 
 * Trigger regeneration due to content update.
 */
export async function triggerContentUpdate(req: Request, res: Response) {
    try {
        const { module_id, course_id, file_changed } = req.body;

        if (!module_id || !course_id) {
            return res.status(400).json({
                success: false,
                error: "VALIDATION_ERROR",
                message: "module_id and course_id are required",
            });
        }

        const jobId = uuidv4();
        const orchestrator = createOrchestratorService();

        await orchestrator.queueJob({
            job_id: jobId,
            mode: "single_module",
            target: { module_id, course_id },
            triggered_by: "content_update",
            priority: "high",
        });

        res.status(202).json({
            success: true,
            data: {
                job_id: jobId,
                status: "queued",
                trigger: "content_update",
                file_changed,
            },
        });

    } catch (error) {
        console.error("[OrchestratorController] triggerContentUpdate error:", error);
        res.status(500).json({
            success: false,
            error: "TRIGGER_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * POST /api/flashcards/trigger/scheduled
 * 
 * Trigger scheduled refresh (called by cron job).
 */
export async function triggerScheduledRefresh(req: Request, res: Response) {
    try {
        const jobId = uuidv4();
        const orchestrator = createOrchestratorService();

        await orchestrator.queueJob({
            job_id: jobId,
            mode: "all_courses",
            target: {},
            triggered_by: "scheduled",
            priority: "low",
        });

        res.status(202).json({
            success: true,
            data: {
                job_id: jobId,
                status: "queued",
                trigger: "scheduled",
            },
        });

    } catch (error) {
        console.error("[OrchestratorController] triggerScheduledRefresh error:", error);
        res.status(500).json({
            success: false,
            error: "TRIGGER_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * POST /api/flashcards/trigger/manual
 * 
 * Manually trigger regeneration for a module.
 */
export async function triggerManualRegeneration(req: Request, res: Response) {
    try {
        const { module_id, course_id, force = false } = req.body;

        if (!module_id || !course_id) {
            return res.status(400).json({
                success: false,
                error: "VALIDATION_ERROR",
                message: "module_id and course_id are required",
            });
        }

        const jobId = uuidv4();
        const orchestrator = createOrchestratorService();

        await orchestrator.queueJob({
            job_id: jobId,
            mode: "single_module",
            target: { module_id, course_id },
            triggered_by: "manual",
            priority: "high",
        });

        res.status(202).json({
            success: true,
            data: {
                job_id: jobId,
                status: "queued",
                trigger: "manual",
                module_id,
                course_id,
            },
        });

    } catch (error) {
        console.error("[OrchestratorController] triggerManualRegeneration error:", error);
        res.status(500).json({
            success: false,
            error: "TRIGGER_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

// =============================================================================
// MODULE DECK ENDPOINTS
// =============================================================================

/**
 * GET /api/flashcards/decks/:course_id/:module_id
 * 
 * Get the stored deck for a module.
 */
export async function getModuleDeck(req: Request, res: Response) {
    try {
        const { course_id, module_id } = req.params;

        const orchestrator = createOrchestratorService();
        const deck = orchestrator.getModuleDeck(module_id, course_id);

        if (!deck) {
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: `No deck found for module ${module_id} in course ${course_id}`,
            });
        }

        res.status(200).json({
            success: true,
            data: deck,
        });

    } catch (error) {
        console.error("[OrchestratorController] getModuleDeck error:", error);
        res.status(500).json({
            success: false,
            error: "RETRIEVAL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /api/flashcards/orchestrator/health
 * 
 * Health check for orchestrator service.
 */
export async function healthCheck(req: Request, res: Response) {
    try {
        const orchestrator = createOrchestratorService();
        const metrics = orchestrator.getMetrics();

        res.status(200).json({
            success: true,
            status: "healthy",
            data: {
                jobs_in_queue: metrics.jobs_in_queue,
                jobs_processing: metrics.jobs_processing,
                last_successful_run: metrics.last_successful_run,
                last_failed_run: metrics.last_failed_run,
                uptime: process.uptime(),
            },
        });

    } catch (error) {
        console.error("[OrchestratorController] healthCheck error:", error);
        res.status(503).json({
            success: false,
            status: "unhealthy",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
