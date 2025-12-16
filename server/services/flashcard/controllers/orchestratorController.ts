/**
 * Orchestrator Controller
 * 
 * REST API controllers for flashcard generation, job management, and deck retrieval.
 * 
 * Endpoints:
 * - POST /api/flashcards/orchestrator/generate - Enqueue generation job
 * - GET /api/flashcards/orchestrator/jobs/:job_id - Get job status
 * - GET /api/modules/:module_id/flashcards - Get latest deck for module
 * - GET /api/flashcards/:card_id - Get single card
 * - GET /api/flashcards/review-queue - Get cards needing review (admin)
 * - POST /api/flashcards/:card_id/approve - Approve card (admin)
 * - POST /api/flashcards/:card_id/edit - Edit card (admin)
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { Counter, Histogram } from "prom-client";

// Use native crypto.randomUUID for ESM compatibility
const uuidv4 = (): string => randomUUID();

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Schema for generate job request
 */
export const GenerateJobSchema = z.object({
    mode: z.enum(["single_module", "course", "all_courses"]),
    target: z.object({
        module_id: z.string().optional(),
        course_id: z.string().optional(),
    }),
    settings: z.object({
        regenerate: z.boolean().optional(),
        force_all: z.boolean().optional(),
        card_count: z.number().min(1).max(100).optional(),
        difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional(),
        bloom_levels: z.array(z.string()).optional(),
    }).optional(),
}).refine(
    (data) => {
        if (data.mode === "single_module") {
            return !!data.target.module_id;
        }
        if (data.mode === "course") {
            return !!data.target.course_id;
        }
        return true;
    },
    {
        message: "module_id required for single_module mode, course_id required for course mode",
    }
);

export type GenerateJobInput = z.infer<typeof GenerateJobSchema>;

/**
 * Schema for edit card request
 */
export const EditCardSchema = z.object({
    q: z.string().min(1).max(1000).optional(),
    a: z.string().min(1).max(5000).optional(),
    rationale: z.string().max(2000).optional(),
});

export type EditCardInput = z.infer<typeof EditCardSchema>;

/**
 * Response schemas
 */
export const JobEnqueuedResponse = z.object({
    jobId: z.string(),
    statusUrl: z.string(),
    message: z.string(),
});

export const JobStatusResponse = z.object({
    jobId: z.string(),
    status: z.enum(["pending", "active", "completed", "failed"]),
    progress: z.number().optional(),
    result: z.object({
        generated_count: z.number(),
        verified_count: z.number(),
        deck_id: z.string(),
        warnings: z.array(z.string()),
    }).optional(),
    error: z.string().optional(),
    logs_url: z.string().optional(),
    created_at: z.string(),
    completed_at: z.string().optional(),
});

// =============================================================================
// METRICS
// =============================================================================

export const jobsEnqueuedTotal = new Counter({
    name: "flashcard_jobs_enqueued_total",
    help: "Total number of flashcard generation jobs enqueued",
    labelNames: ["mode"],
});

export const jobStatusRequestsTotal = new Counter({
    name: "api_job_status_requests_total",
    help: "Total job status API requests",
});

export const generateRequestsTotal = new Counter({
    name: "api_generate_requests_total",
    help: "Total generate API requests",
    labelNames: ["status"],
});

export const cardsApprovedTotal = new Counter({
    name: "cards_manually_approved_total",
    help: "Total cards manually approved by admins",
});

export const cardsEditedTotal = new Counter({
    name: "cards_manually_edited_total",
    help: "Total cards manually edited by admins",
});

export const jobsCompletedTotal = new Counter({
    name: "flashcard_jobs_completed_total",
    help: "Total flashcard generation jobs completed",
    labelNames: ["type", "status"],
});

export const apiLatency = new Histogram({
    name: "flashcard_api_latency_seconds",
    help: "API endpoint latency",
    labelNames: ["endpoint"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

// =============================================================================
// CONTROLLER FUNCTIONS
// =============================================================================

/**
 * POST /api/flashcards/orchestrator/generate
 * 
 * Enqueue a flashcard generation job.
 */
export async function enqueueGenerateJob(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const startTime = Date.now();

    try {
        // Validate request body
        const parseResult = GenerateJobSchema.safeParse(req.body);

        if (!parseResult.success) {
            generateRequestsTotal.inc({ status: "validation_error" });
            res.status(400).json({
                error: "Validation failed",
                details: parseResult.error.errors,
            });
            return;
        }

        const { mode, target, settings } = parseResult.data;

        // Generate job ID
        const jobId = uuidv4();

        // Get user ID from auth (assume req.user is set by auth middleware)
        const userId = (req as any).user?.id || "anonymous";

        // Import queue and logger
        const { enqueueModuleJob } = await import("../queue");
        const { addLogEntry, startJobLog } = await import("../queue/jobLogger");

        // Start job log
        startJobLog(jobId, target.module_id || target.course_id || "all");

        // Build job data
        const jobData = {
            module_id: target.module_id,
            course_id: target.course_id,
            mode,
            settings: {
                ...settings,
                triggered_by: "api",
                user_id: userId,
            },
        };

        // Enqueue job
        await enqueueModuleJob(jobData);

        // Log
        addLogEntry(jobId, "info", "job_enqueued", `Job enqueued via API by user ${userId}`);
        console.log(`[OrchestratorAPI] Job ${jobId} enqueued for mode=${mode}`);

        // Metrics
        jobsEnqueuedTotal.inc({ mode });
        generateRequestsTotal.inc({ status: "success" });
        apiLatency.observe({ endpoint: "generate" }, (Date.now() - startTime) / 1000);

        // Return response
        res.status(202).json({
            jobId,
            statusUrl: `/api/flashcards/orchestrator/jobs/${jobId}`,
            message: "Job enqueued successfully",
        });

    } catch (error) {
        generateRequestsTotal.inc({ status: "error" });
        console.error("[OrchestratorAPI] Enqueue failed:", error);
        next(error);
    }
}

/**
 * GET /api/flashcards/orchestrator/jobs/:job_id
 * 
 * Get job status and result.
 */
export async function getJobStatus(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const startTime = Date.now();

    try {
        const { job_id } = req.params;

        if (!job_id) {
            res.status(400).json({ error: "job_id is required" });
            return;
        }

        // Import queue
        const { getJobById } = await import("../queue");
        const { getLogUrl } = await import("../queue/jobLogger");

        // Get job from queue
        const job = await getJobById(job_id);

        if (!job) {
            res.status(404).json({ error: "Job not found" });
            return;
        }

        // Build response
        const response: z.infer<typeof JobStatusResponse> = {
            jobId: job_id,
            status: mapJobState(job.state),
            progress: job.progress,
            created_at: new Date(job.timestamp).toISOString(),
        };

        // Add result if completed
        if (job.state === "completed" && job.returnvalue) {
            response.result = {
                generated_count: job.returnvalue.generated_count || 0,
                verified_count: job.returnvalue.verified_count || 0,
                deck_id: job.returnvalue.deck_id || "",
                warnings: job.returnvalue.warnings || [],
            };
            response.completed_at = new Date().toISOString();

            // Only include logs_url for admin users
            if ((req as any).user?.role === "admin") {
                response.logs_url = await getLogUrl(job_id);
            }
        }

        // Add error if failed
        if (job.state === "failed") {
            response.error = job.failedReason || "Unknown error";
        }

        // Metrics
        jobStatusRequestsTotal.inc();
        apiLatency.observe({ endpoint: "job_status" }, (Date.now() - startTime) / 1000);

        // Set cache control for polling
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(response);

    } catch (error) {
        console.error("[OrchestratorAPI] Get status failed:", error);
        next(error);
    }
}

function mapJobState(state: string): "pending" | "active" | "completed" | "failed" {
    switch (state) {
        case "waiting":
        case "delayed":
            return "pending";
        case "active":
            return "active";
        case "completed":
            return "completed";
        case "failed":
            return "failed";
        default:
            return "pending";
    }
}

/**
 * GET /api/modules/:module_id/flashcards
 * 
 * Get latest flashcard deck for a module.
 */
export async function getModuleFlashcards(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const startTime = Date.now();

    try {
        const { module_id } = req.params;
        const includeUnverified = req.query.include_unverified === "true";
        const limit = parseInt(req.query.limit as string) || undefined;

        if (!module_id) {
            res.status(400).json({ error: "module_id is required" });
            return;
        }

        // Import deck store
        const { deckStore } = await import("../persistence");

        // Get latest deck
        const deck = await deckStore.readLatestDeck(module_id);

        if (!deck) {
            res.status(404).json({ error: "No deck found for module" });
            return;
        }

        // Filter cards if needed
        let cards = deck.cards;

        if (!includeUnverified) {
            cards = cards.filter(c => c.verified);
        }

        if (limit && limit > 0) {
            cards = cards.slice(0, limit);
        }

        apiLatency.observe({ endpoint: "module_flashcards" }, (Date.now() - startTime) / 1000);

        res.json({
            deck_id: deck.deck_id,
            module_id: deck.module_id,
            module_title: deck.module_title,
            cards,
            card_count: cards.length,
            total_count: deck.cards.length,
            verification_rate: deck.verification_rate,
            generated_at: deck.generated_at,
            warnings: deck.warnings,
        });

    } catch (error) {
        console.error("[OrchestratorAPI] Get module flashcards failed:", error);
        next(error);
    }
}

/**
 * GET /api/flashcards/:card_id
 * 
 * Get a single flashcard by ID.
 */
export async function getCard(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { card_id } = req.params;

        if (!card_id) {
            res.status(400).json({ error: "card_id is required" });
            return;
        }

        // Import deck store
        const { dbDeckStore } = await import("../persistence/dbDeckStore");

        // Get card from DB
        const card = await dbDeckStore.getCardById?.(card_id);

        if (!card) {
            res.status(404).json({ error: "Card not found" });
            return;
        }

        res.json(card);

    } catch (error) {
        console.error("[OrchestratorAPI] Get card failed:", error);
        next(error);
    }
}

/**
 * GET /api/flashcards/review-queue
 * 
 * Get cards requiring manual review (admin only).
 */
export async function getReviewQueue(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const moduleId = req.query.module_id as string;
        const courseId = req.query.course_id as string;

        // Import deck store
        const { dbDeckStore } = await import("../persistence/dbDeckStore");

        // Get cards needing review
        const result = await dbDeckStore.getCardsNeedingReview?.({
            module_id: moduleId,
            course_id: courseId,
            limit,
            offset: (page - 1) * limit,
        }) || { cards: [], total: 0 };

        res.json({
            cards: result.cards,
            total: result.total,
            page,
            limit,
            has_more: result.total > page * limit,
        });

    } catch (error) {
        console.error("[OrchestratorAPI] Get review queue failed:", error);
        next(error);
    }
}

/**
 * POST /api/flashcards/:card_id/approve
 * 
 * Approve a card (admin only).
 */
export async function approveCard(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { card_id } = req.params;
        const userId = (req as any).user?.id || "unknown";

        if (!card_id) {
            res.status(400).json({ error: "card_id is required" });
            return;
        }

        // Import deck store and audit logger
        const { dbDeckStore } = await import("../persistence/dbDeckStore");
        const { addLogEntry } = await import("../queue/jobLogger");

        // Update card
        const updated = await dbDeckStore.updateCard?.(card_id, {
            verified: true,
            review_required: false,
            approved_by: userId,
            approved_at: new Date().toISOString(),
        });

        if (!updated) {
            res.status(404).json({ error: "Card not found" });
            return;
        }

        // Audit log
        addLogEntry("admin-actions", "info", "card_approved", `Card ${card_id} approved by ${userId}`);

        // Metric
        cardsApprovedTotal.inc();

        console.log(`[OrchestratorAPI] Card ${card_id} approved by ${userId}`);

        res.json({
            success: true,
            card_id,
            message: "Card approved successfully",
        });

    } catch (error) {
        console.error("[OrchestratorAPI] Approve card failed:", error);
        next(error);
    }
}

/**
 * POST /api/flashcards/:card_id/edit
 * 
 * Edit a card (admin only).
 */
export async function editCard(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { card_id } = req.params;
        const userId = (req as any).user?.id || "unknown";

        // Validate body
        const parseResult = EditCardSchema.safeParse(req.body);

        if (!parseResult.success) {
            res.status(400).json({
                error: "Validation failed",
                details: parseResult.error.errors,
            });
            return;
        }

        const { q, a, rationale } = parseResult.data;

        if (!card_id) {
            res.status(400).json({ error: "card_id is required" });
            return;
        }

        // Import deck store and verification
        const { dbDeckStore } = await import("../persistence/dbDeckStore");
        const { verifyCardEvidence } = await import("../verification/evidenceVerifier");
        const { addLogEntry } = await import("../queue/jobLogger");

        // Get existing card
        const existingCard = await dbDeckStore.getCardById?.(card_id);

        if (!existingCard) {
            res.status(404).json({ error: "Card not found" });
            return;
        }

        // Build update
        const updates: Record<string, unknown> = {
            edited_by: userId,
            edited_at: new Date().toISOString(),
        };

        if (q !== undefined) updates.question = q;
        if (a !== undefined) updates.answer = a;
        if (rationale !== undefined) updates.rationale = rationale;

        // Re-verify if Q or A changed
        if (q !== undefined || a !== undefined) {
            try {
                const verificationResult = await verifyCardEvidence({
                    question: q || existingCard.question,
                    answer: a || existingCard.answer,
                    evidence: existingCard.evidence || [],
                });

                updates.verified = verificationResult.verified;
                updates.verification_note = verificationResult.note;
                updates.review_required = !verificationResult.verified;
            } catch (verifyError) {
                console.warn("[OrchestratorAPI] Re-verification failed:", verifyError);
                // Keep existing verification status
            }
        }

        // Update card
        const updated = await dbDeckStore.updateCard?.(card_id, updates);

        if (!updated) {
            res.status(500).json({ error: "Failed to update card" });
            return;
        }

        // Audit log with diff
        addLogEntry("admin-actions", "info", "card_edited", `Card ${card_id} edited by ${userId}`, {
            card_id,
            user_id: userId,
            changes: { q: !!q, a: !!a, rationale: !!rationale },
        });

        // Metric
        cardsEditedTotal.inc();

        console.log(`[OrchestratorAPI] Card ${card_id} edited by ${userId}`);

        res.json({
            success: true,
            card_id,
            verified: updates.verified,
            message: "Card updated successfully",
        });

    } catch (error) {
        console.error("[OrchestratorAPI] Edit card failed:", error);
        next(error);
    }
}

// =============================================================================
// GENERATE FROM MODULE (Direct generation from database content)
// =============================================================================

/**
 * POST /api/flashcards/generate-from-module
 * 
 * Generate flashcards directly from a module in the database.
 * This fetches the module content (documents, videos, recordings) and generates flashcards.
 * 
 * Body:
 * {
 *   courseSlug: string,
 *   moduleIndex: number,
 *   isSandbox?: boolean,
 *   settings?: {
 *     cardCount?: number,
 *     includeRecordings?: boolean,
 *     mockMode?: boolean  // For testing without LLM
 *   }
 * }
 */
export async function generateFromModule(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { courseSlug, moduleIndex, isSandbox = false, settings = {} } = req.body;

        // Validate required fields
        if (!courseSlug || moduleIndex === undefined) {
            res.status(400).json({
                success: false,
                error: "courseSlug and moduleIndex are required",
            });
            return;
        }

        console.log(`[OrchestratorAPI] Generating flashcards for ${courseSlug}/module-${moduleIndex}`);

        // Import content fetcher and orchestrator modules dynamically
        const { fetchModuleContent, prepareChunksFromContent } = await import("../contentFetcher");
        const { runStageA, runStageAMock } = await import("../orchestrator/stageA");
        const { runStageB, runStageBMock } = await import("../orchestrator/stageB");
        const { verifyCardsBatch } = await import("../verification/evidenceVerifier");

        // Step 1: Fetch module content from database
        const content = await fetchModuleContent({
            courseSlug,
            moduleIndex,
            isSandbox,
            includeRecordings: settings.includeRecordings ?? true,
        });

        // Step 2: Prepare chunks from content
        const chunks = await prepareChunksFromContent(content, {
            maxChunkTokens: 500,
            includeDocumentMetadata: true,
        });

        if (chunks.length === 0) {
            res.status(400).json({
                success: false,
                error: "No content found in module to generate flashcards from",
                module: {
                    module_id: content.module_id,
                    title: content.module_title,
                    documents: content.documents.length,
                    videos: content.videos.length,
                    recordings: content.recordings.length,
                },
            });
            return;
        }

        console.log(`[OrchestratorAPI] Prepared ${chunks.length} chunks for flashcard generation`);

        // Step 3: Run StageA (content analysis)
        let stageAOutput;
        if (settings.mockMode) {
            stageAOutput = runStageAMock(chunks, content.module_id, content.module_title);
        } else {
            stageAOutput = await runStageA(chunks, content.module_id, content.module_title);
        }

        console.log(`[OrchestratorAPI] StageA complete: ${stageAOutput.learning_objectives.length} objectives`);

        // Step 4: Run StageB (card generation)
        const targetCardCount = settings.cardCount || Math.min(chunks.length * 2, 20);
        let stageBOutput;
        if (settings.mockMode) {
            stageBOutput = runStageBMock(
                chunks,
                content.module_id,
                stageAOutput.learning_objectives,
                targetCardCount
            );
        } else {
            stageBOutput = await runStageB(
                chunks,
                content.module_id,
                stageAOutput.learning_objectives,
                targetCardCount
            );
        }

        console.log(`[OrchestratorAPI] StageB complete: ${stageBOutput.generated_count} cards generated`);

        // Step 5: Verify cards
        const cardsToVerify = stageBOutput.cards.map(card => ({
            question: card.question,
            answer: card.answer,
            evidence: card.evidence,
            rationale: card.rationale,
        }));

        const verificationResults = await verifyCardsBatch(cardsToVerify, "heuristic");

        console.log(`[OrchestratorAPI] Verification complete: ${verificationResults.total_verified}/${verificationResults.results.length} verified`);

        // Step 6: Build response
        const deck = {
            deck_id: `deck::${content.module_id}::${Date.now()}`,
            module_id: content.module_id,
            course_id: content.course_id,
            module_title: content.module_title,
            course_title: content.course_title,
            generated_at: new Date().toISOString(),
            cards: stageBOutput.cards.map((card, index) => ({
                ...card,
                verified: verificationResults.results[index]?.verified ?? false,
                verification_note: verificationResults.results[index]?.note ?? "",
            })),
            metadata: {
                stageA: {
                    summaries: stageAOutput.summaries,
                    learning_objectives: stageAOutput.learning_objectives,
                    key_terms: stageAOutput.key_terms,
                    difficulty: stageAOutput.estimated_difficulty,
                },
                generation: {
                    chunk_count: chunks.length,
                    document_count: content.documents.length,
                    video_count: content.videos.length,
                    recording_count: content.recordings.length,
                    processing_time_ms: stageAOutput.processing_time_ms + stageBOutput.processing_time_ms,
                },
                verification: {
                    total_verified: verificationResults.total_verified,
                    verification_rate: verificationResults.verification_rate,
                },
            },
        };

        // Increment metrics
        jobsCompletedTotal.inc({ type: "generate_from_module", status: "COMPLETED" });

        res.json({
            success: true,
            data: deck,
            message: `Generated ${deck.cards.length} flashcards for ${content.module_title}`,
        });

    } catch (error) {
        console.error("[OrchestratorAPI] Generate from module failed:", error);

        jobsCompletedTotal.inc({ type: "generate_from_module", status: "FAILED" });

        if (error instanceof Error && error.message.includes("not found")) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: "Flashcard generation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * GET /api/flashcards/courses
 * 
 * List all available courses for flashcard generation.
 */
export async function listCourses(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { includeSandbox = false } = req.query;

        const { listAllCourses } = await import("../contentFetcher");
        const courses = await listAllCourses(includeSandbox === "true");

        res.json({
            success: true,
            data: courses,
            total: courses.length,
        });

    } catch (error) {
        console.error("[OrchestratorAPI] List courses failed:", error);
        next(error);
    }
}

/**
 * GET /api/flashcards/courses/:courseSlug/modules
 * 
 * List all modules for a course.
 */
export async function listModules(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { courseSlug } = req.params;
        const { isSandbox = false } = req.query;

        const { listCourseModules } = await import("../contentFetcher");
        const modules = await listCourseModules(courseSlug, isSandbox === "true");

        res.json({
            success: true,
            data: modules,
            total: modules.length,
        });

    } catch (error) {
        console.error("[OrchestratorAPI] List modules failed:", error);

        if (error instanceof Error && error.message.includes("not found")) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }

        next(error);
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    enqueueGenerateJob,
    getJobStatus,
    getModuleFlashcards,
    getCard,
    getReviewQueue,
    approveCard,
    editCard,
    generateFromModule,
    listCourses,
    listModules,
};
