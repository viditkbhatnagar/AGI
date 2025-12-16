/**
 * Flashcard Generation Pipeline - Express Routes
 * 
 * Route definitions for flashcard API endpoints.
 * Import this into your main routes.ts to register the routes.
 */

import { Router } from "express";
import {
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

const router = Router();

// =============================================================================
// FLASHCARD GENERATION
// =============================================================================

/**
 * POST /api/flashcards/generate
 * 
 * Generate flashcards for a module from retrieved chunks.
 * 
 * Request Body:
 * {
 *   module_id: string,
 *   course_id: string,
 *   module_title: string,
 *   retrieved_chunks: Chunk[],
 *   module_metadata?: ModuleMetadata,
 *   prompt_settings?: PromptSettings
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: StoredFlashcardDeck,
 *   message: string
 * }
 */
router.post("/generate", generateFlashcards);

/**
 * POST /api/flashcards/generate-from-module
 * 
 * Generate flashcards directly from a module (extracts content automatically)
 * 
 * Request Body:
 * {
 *   courseSlug: string,
 *   moduleIndex: number
 * }
 */
router.post("/generate-from-module", generateFlashcardsFromModule);

// =============================================================================
// FLASHCARD RETRIEVAL
// =============================================================================

/**
 * GET /api/flashcards/review-queue
 * 
 * Get all flashcards requiring manual review.
 * 
 * Response:
 * {
 *   success: true,
 *   data: { total_count: number, items: ReviewItem[] }
 * }
 */
router.get("/review-queue", getReviewQueue);

/**
 * GET /api/flashcards/:card_id
 * 
 * Retrieve a single flashcard by ID.
 * 
 * Response:
 * {
 *   success: true,
 *   data: Flashcard,
 *   context: { module_id, module_title, course_id }
 * }
 */
router.get("/:card_id", getFlashcardById);

/**
 * PUT /api/flashcards/:card_id
 * 
 * Update a flashcard (for admin edits).
 * 
 * Request Body: Partial<Flashcard>
 * 
 * Response:
 * {
 *   success: true,
 *   data: Flashcard,
 *   message: string
 * }
 */
router.put("/:card_id", updateFlashcard);

/**
 * DELETE /api/flashcards/:card_id
 * 
 * Delete a flashcard from deck.
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.delete("/:card_id", deleteFlashcard);

/**
 * POST /api/flashcards/:card_id/approve
 * 
 * Approve a flashcard after review.
 * 
 * Request Body: { reviewed_by?: string }
 * 
 * Response:
 * {
 *   success: true,
 *   data: Flashcard,
 *   message: string
 * }
 */
router.post("/:card_id/approve", approveFlashcard);

// =============================================================================
// MODULE-SCOPED ENDPOINTS
// =============================================================================

/**
 * GET /api/modules/:module_id/flashcards
 * 
 * Retrieve cached flashcard deck for a module.
 * 
 * Query Params:
 * - course_id (required): The course ID
 * - include_review (optional): "true" to include cards requiring review
 * 
 * Response:
 * {
 *   success: true,
 *   data: StoredFlashcardDeck
 * }
 */
export const moduleFlashcardsRoute = {
    path: "/api/modules/:module_id/flashcards",
    handler: getModuleFlashcards
};

/**
 * GET /api/modules/:module_id/flashcards/stats
 * 
 * Get statistics for a module's flashcard deck.
 * 
 * Query Params:
 * - course_id (required): The course ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: FlashcardStats
 * }
 */
export const moduleFlashcardStatsRoute = {
    path: "/api/modules/:module_id/flashcards/stats",
    handler: getModuleFlashcardStats
};

export default router;
