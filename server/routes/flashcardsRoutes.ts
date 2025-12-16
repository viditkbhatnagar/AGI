/**
 * Flashcard API Routes
 * 
 * REST API routes for flashcard generation, management, and review.
 * 
 * Routes:
 * - POST /api/flashcards/orchestrator/generate - Enqueue generation job
 * - GET /api/flashcards/orchestrator/jobs/:job_id - Get job status
 * - GET /api/modules/:module_id/flashcards - Get module deck
 * - GET /api/flashcards/:card_id - Get single card
 * - GET /api/flashcards/review-queue - Admin review queue
 * - POST /api/flashcards/:card_id/approve - Admin approve card
 * - POST /api/flashcards/:card_id/edit - Admin edit card
 */

import { Router, Request, Response, NextFunction } from "express";
import {
    enqueueGenerateJob,
    getJobStatus,
    getModuleFlashcards,
    getCard,
    getReviewQueue,
    approveCard,
    editCard,
} from "../services/flashcard/controllers/orchestratorController";

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Simple rate limiter for API endpoints.
 * Uses in-memory store (use Redis in production for distributed rate limiting).
 */
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function createRateLimiter(maxRequests: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();

        const entry = rateLimitStore.get(key);

        if (!entry || now > entry.resetAt) {
            // New window
            rateLimitStore.set(key, {
                count: 1,
                resetAt: now + windowMs,
            });
            next();
            return;
        }

        if (entry.count >= maxRequests) {
            res.status(429).json({
                error: "Too many requests",
                retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            });
            return;
        }

        entry.count++;
        next();
    };
}

// Rate limit configuration from env vars
const RATE_LIMIT_GENERATE_PER_MIN = parseInt(
    process.env.RATE_LIMIT_GENERATE_PER_MIN || "5",
    10
);
const RATE_LIMIT_STATUS_PER_MIN = parseInt(
    process.env.RATE_LIMIT_STATUS_PER_MIN || "60",
    10
);
const RATE_LIMIT_MEDIA_PER_MIN = parseInt(
    process.env.RATE_LIMIT_MEDIA_PER_MIN || "60",
    10
);

const generateRateLimit = createRateLimiter(RATE_LIMIT_GENERATE_PER_MIN, 60000);
const statusRateLimit = createRateLimiter(RATE_LIMIT_STATUS_PER_MIN, 60000);

/**
 * Placeholder auth middleware - replace with your actual implementation.
 * Assumes req.user is populated by upstream auth middleware.
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
    // In production, verify JWT/session and populate req.user
    // For now, check if Authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader && process.env.NODE_ENV === "production") {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    // Mock user for development
    if (!(req as any).user) {
        (req as any).user = {
            id: "dev-user",
            role: "user",
        };
    }

    next();
}

/**
 * Admin-only middleware.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
    }

    next();
}

/**
 * Async handler wrapper for Express error handling.
 */
function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// =============================================================================
// ROUTER
// =============================================================================

const router = Router();

// -----------------------------------------------------------------------------
// Orchestrator endpoints
// -----------------------------------------------------------------------------

/**
 * POST /api/flashcards/orchestrator/generate
 * Enqueue a flashcard generation job.
 */
router.post(
    "/orchestrator/generate",
    requireAuth,
    generateRateLimit,
    asyncHandler(enqueueGenerateJob)
);

/**
 * GET /api/flashcards/orchestrator/jobs/:job_id
 * Get job status and result.
 */
router.get(
    "/orchestrator/jobs/:job_id",
    requireAuth,
    statusRateLimit,
    asyncHandler(getJobStatus)
);

/**
 * POST /api/flashcards/generate-from-module
 * Generate flashcards directly from a module in the database.
 */
router.post(
    "/generate-from-module",
    requireAuth,
    generateRateLimit,
    asyncHandler(async (req, res, next) => {
        const { generateFromModule } = await import("../services/flashcard/controllers/orchestratorController");
        return generateFromModule(req, res, next);
    })
);

/**
 * GET /api/flashcards/courses
 * List all available courses for flashcard generation.
 */
router.get(
    "/courses",
    requireAuth,
    asyncHandler(async (req, res, next) => {
        const { listCourses } = await import("../services/flashcard/controllers/orchestratorController");
        return listCourses(req, res, next);
    })
);

/**
 * GET /api/flashcards/courses/:courseSlug/modules
 * List all modules for a course.
 */
router.get(
    "/courses/:courseSlug/modules",
    requireAuth,
    asyncHandler(async (req, res, next) => {
        const { listModules } = await import("../services/flashcard/controllers/orchestratorController");
        return listModules(req, res, next);
    })
);

// -----------------------------------------------------------------------------
// Deck & card endpoints
// -----------------------------------------------------------------------------

/**
 * GET /api/flashcards/review-queue
 * Get cards needing review (admin only).
 * Note: This must be before /:card_id to avoid route conflict.
 */
router.get(
    "/review-queue",
    requireAuth,
    requireAdmin,
    asyncHandler(getReviewQueue)
);

/**
 * GET /api/flashcards/:card_id
 * Get a single flashcard.
 */
router.get(
    "/:card_id",
    requireAuth,
    asyncHandler(getCard)
);

/**
 * POST /api/flashcards/:card_id/approve
 * Approve a card (admin only).
 */
router.post(
    "/:card_id/approve",
    requireAuth,
    requireAdmin,
    asyncHandler(approveCard)
);

/**
 * POST /api/flashcards/:card_id/edit
 * Edit a card (admin only).
 */
router.post(
    "/:card_id/edit",
    requireAuth,
    requireAdmin,
    asyncHandler(editCard)
);

// =============================================================================
// MODULE ROUTES (separate router for /api/modules)
// =============================================================================

const modulesRouter = Router();

/**
 * GET /api/modules/:module_id/flashcards
 * Get latest flashcard deck for a module.
 */
modulesRouter.get(
    "/:module_id/flashcards",
    requireAuth,
    asyncHandler(getModuleFlashcards)
);

// =============================================================================
// ERROR HANDLER
// =============================================================================

function flashcardErrorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("[FlashcardAPI] Error:", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    router as flashcardsRouter,
    modulesRouter,
    flashcardErrorHandler,
    requireAuth,
    requireAdmin,
    createRateLimiter,
    asyncHandler,
};

export default router;
