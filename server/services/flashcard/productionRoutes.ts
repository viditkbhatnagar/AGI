/**
 * Production Flashcard Routes
 * 
 * Complete API for flashcard generation with Google Drive & OneDrive support
 */

import { Router } from "express";
import {
    generateFlashcards,
    quickGenerate,
    getFlashcards,
    getFlashcardStats,
    getModuleContent,
    listModules,
    listCourses,
    listDecks,
    healthCheck,
} from "./productionController";

const router = Router();

// =============================================================================
// HEALTH & INFO
// =============================================================================

// Health check
router.get("/health", healthCheck);

// List all courses
router.get("/courses", listCourses);

// List modules for a course
router.get("/modules/:courseSlug", listModules);

// Get module content info (documents, videos, recordings)
router.get("/content/:courseSlug/:moduleIndex", getModuleContent);

// =============================================================================
// FLASHCARD GENERATION
// =============================================================================

/**
 * Generate flashcards for a module
 * POST /api/flashcards/generate
 * 
 * Body:
 * {
 *   "courseSlug": "introduction-to-accounting",
 *   "moduleIndex": 0,
 *   "isSandbox": false,
 *   "cardCount": 10
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "deck_id": "deck_...",
 *   "cards": [...],
 *   "card_count": 10,
 *   "metadata": {
 *     "documentsProcessed": 3,
 *     "videosProcessed": 2,
 *     "extractionMethods": {"export": 2, "gemini": 3},
 *     "processingTimeMs": 5000
 *   }
 * }
 */
router.post("/generate", generateFlashcards);

/**
 * Quick generate flashcards (simplified)
 * POST /api/flashcards/quick-generate
 */
router.post("/quick-generate", quickGenerate);

// =============================================================================
// FLASHCARD RETRIEVAL
// =============================================================================

/**
 * Get flashcards for a module
 * GET /api/flashcards/:courseSlug/:moduleIndex
 * 
 * Query params:
 * - regenerate: "true" to generate if not found
 */
router.get("/:courseSlug/:moduleIndex", getFlashcards);

/**
 * Get flashcard statistics
 * GET /api/flashcards/:courseSlug/:moduleIndex/stats
 */
router.get("/:courseSlug/:moduleIndex/stats", getFlashcardStats);

/**
 * List all deck versions for a module
 * GET /api/flashcards/decks/:courseSlug/:moduleIndex
 */
router.get("/decks/:courseSlug/:moduleIndex", listDecks);

// =============================================================================
// EXPORT
// =============================================================================

export default router;
