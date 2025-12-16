/**
 * Production Flashcard Controller
 * 
 * Handles flashcard generation with proper Google Drive & OneDrive integration
 */

import { Request, Response } from "express";
import { generateFlashcardsForModule, quickGenerateFlashcards } from "./productionGenerator";
import { saveDeckToStore, readLatestDeck, listDecksForModule } from "./persistence/deckStore";
import { fetchModuleContent, listCourseModules, listAllCourses } from "./contentFetcher";
import type { StoredFlashcardDeck } from "./types";

// In-memory cache for quick access
const deckCache = new Map<string, StoredFlashcardDeck>();

// =============================================================================
// GENERATE FLASHCARDS
// =============================================================================

/**
 * Generate flashcards for a module
 * POST /api/flashcards/generate
 * 
 * Body: { courseSlug, moduleIndex, isSandbox?, cardCount? }
 */
export async function generateFlashcards(req: Request, res: Response): Promise<void> {
    try {
        const { courseSlug, moduleIndex, isSandbox = false, cardCount = 10 } = req.body;

        if (!courseSlug || moduleIndex === undefined) {
            res.status(400).json({
                success: false,
                error: "courseSlug and moduleIndex are required",
            });
            return;
        }

        console.log(`[Controller] Generating flashcards for ${courseSlug}/module-${moduleIndex}`);

        // Generate flashcards
        const result = await generateFlashcardsForModule({
            courseSlug,
            moduleIndex: parseInt(moduleIndex, 10),
            isSandbox,
            cardCount: parseInt(cardCount, 10),
        });

        if (!result.success || !result.deck) {
            res.status(400).json({
                success: false,
                error: result.error || "Generation failed",
                metadata: result.metadata,
            });
            return;
        }

        // Save to persistent storage
        const { deck_id, path } = await saveDeckToStore(result.metadata.module_id, result.deck);

        // Cache for quick access
        const cacheKey = `${courseSlug}:${moduleIndex}`;
        deckCache.set(cacheKey, { ...result.deck, id: deck_id });

        res.json({
            success: true,
            deck_id,
            cards: result.deck.cards,
            card_count: result.deck.cards.length,
            metadata: result.metadata,
        });

    } catch (error) {
        console.error("[Controller] Generation error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

/**
 * Quick generate flashcards (simplified endpoint)
 * POST /api/flashcards/quick-generate
 */
export async function quickGenerate(req: Request, res: Response): Promise<void> {
    try {
        const { courseSlug, moduleIndex, cardCount = 10 } = req.body;

        if (!courseSlug || moduleIndex === undefined) {
            res.status(400).json({
                success: false,
                error: "courseSlug and moduleIndex are required",
            });
            return;
        }

        const cards = await quickGenerateFlashcards(
            courseSlug,
            parseInt(moduleIndex, 10),
            { cardCount: parseInt(cardCount, 10) }
        );

        res.json({
            success: true,
            cards,
            count: cards.length,
        });

    } catch (error) {
        console.error("[Controller] Quick generate error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

// =============================================================================
// GET FLASHCARDS
// =============================================================================

/**
 * Get flashcards for a module
 * GET /api/flashcards/:courseSlug/:moduleIndex
 */
export async function getFlashcards(req: Request, res: Response): Promise<void> {
    try {
        const { courseSlug, moduleIndex } = req.params;
        const { regenerate } = req.query;

        const cacheKey = `${courseSlug}:${moduleIndex}`;
        const module_id = `${courseSlug}::modules::${moduleIndex}`;

        // Check cache first
        let deck: StoredFlashcardDeck | null | undefined = deckCache.get(cacheKey);

        // If not in cache, try to load from storage
        if (!deck) {
            deck = await readLatestDeck(module_id);
            if (deck) {
                deckCache.set(cacheKey, deck);
            }
        }

        // If still no deck and regenerate is requested, generate new
        if (!deck && regenerate === "true") {
            const result = await generateFlashcardsForModule({
                courseSlug,
                moduleIndex: parseInt(moduleIndex, 10),
            });

            if (result.success && result.deck) {
                await saveDeckToStore(module_id, result.deck);
                deck = result.deck;
                deckCache.set(cacheKey, deck);
            }
        }

        if (!deck) {
            res.status(404).json({
                success: false,
                error: "No flashcards found for this module. Use POST /api/flashcards/generate to create them.",
                module_id,
            });
            return;
        }

        res.json({
            success: true,
            deck_id: deck.id,
            module_title: deck.module_title,
            cards: deck.cards,
            card_count: deck.cards.length,
            created_at: deck.created_at,
            review_status: deck.review_status,
        });

    } catch (error) {
        console.error("[Controller] Get flashcards error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

/**
 * Get flashcard statistics for a module
 * GET /api/flashcards/:courseSlug/:moduleIndex/stats
 */
export async function getFlashcardStats(req: Request, res: Response): Promise<void> {
    try {
        const { courseSlug, moduleIndex } = req.params;
        const module_id = `${courseSlug}::modules::${moduleIndex}`;

        const deck = await readLatestDeck(module_id);

        if (!deck) {
            res.status(404).json({
                success: false,
                error: "No flashcards found for this module",
            });
            return;
        }

        const stats = {
            total_cards: deck.cards.length,
            difficulty_distribution: {
                easy: deck.cards.filter(c => c.difficulty === "easy").length,
                medium: deck.cards.filter(c => c.difficulty === "medium").length,
                hard: deck.cards.filter(c => c.difficulty === "hard").length,
            },
            bloom_distribution: {
                remember: deck.cards.filter(c => c.bloom_level === "Remember").length,
                understand: deck.cards.filter(c => c.bloom_level === "Understand").length,
                apply: deck.cards.filter(c => c.bloom_level === "Apply").length,
                analyze: deck.cards.filter(c => c.bloom_level === "Analyze").length,
                evaluate: deck.cards.filter(c => c.bloom_level === "Evaluate").length,
                create: deck.cards.filter(c => c.bloom_level === "Create").length,
            },
            average_confidence: deck.cards.length > 0
                ? deck.cards.reduce((sum, c) => sum + c.confidence_score, 0) / deck.cards.length
                : 0,
            cards_needing_review: deck.cards.filter(c => c.review_required).length,
            key_topics_count: deck.stage_a_output?.key_topics?.length || 0,
            created_at: deck.created_at,
            review_status: deck.review_status,
        };

        res.json({
            success: true,
            stats,
        });

    } catch (error) {
        console.error("[Controller] Stats error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

// =============================================================================
// MODULE CONTENT INFO
// =============================================================================

/**
 * Get module content info (documents, videos, recordings)
 * GET /api/flashcards/content/:courseSlug/:moduleIndex
 */
export async function getModuleContent(req: Request, res: Response): Promise<void> {
    try {
        const { courseSlug, moduleIndex } = req.params;
        const { isSandbox = "false" } = req.query;

        const content = await fetchModuleContent({
            courseSlug,
            moduleIndex: parseInt(moduleIndex, 10),
            isSandbox: isSandbox === "true",
            includeRecordings: true,
        });

        res.json({
            success: true,
            module_id: content.module_id,
            module_title: content.module_title,
            course_title: content.course_title,
            documents: content.documents.map(d => ({
                id: d.id,
                title: d.title,
                provider: d.provider,
                type: d.type,
            })),
            videos: content.videos.map(v => ({
                id: v.id,
                title: v.title,
                provider: v.provider,
                duration: v.duration,
            })),
            recordings: content.recordings.map(r => ({
                id: r.id,
                title: r.title,
                date: r.date,
            })),
            totals: {
                documents: content.documents.length,
                videos: content.videos.length,
                recordings: content.recordings.length,
            },
        });

    } catch (error) {
        console.error("[Controller] Content info error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

/**
 * List all modules for a course
 * GET /api/flashcards/modules/:courseSlug
 */
export async function listModules(req: Request, res: Response): Promise<void> {
    try {
        const { courseSlug } = req.params;
        const { isSandbox = "false" } = req.query;

        const modules = await listCourseModules(courseSlug, isSandbox === "true");

        res.json({
            success: true,
            course_slug: courseSlug,
            modules,
            total: modules.length,
        });

    } catch (error) {
        console.error("[Controller] List modules error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

/**
 * List all courses
 * GET /api/flashcards/courses
 */
export async function listCourses(req: Request, res: Response): Promise<void> {
    try {
        const { includeSandbox = "false" } = req.query;

        const courses = await listAllCourses(includeSandbox === "true");

        res.json({
            success: true,
            courses,
            total: courses.length,
        });

    } catch (error) {
        console.error("[Controller] List courses error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

// =============================================================================
// DECK MANAGEMENT
// =============================================================================

/**
 * List all deck versions for a module
 * GET /api/flashcards/decks/:courseSlug/:moduleIndex
 */
export async function listDecks(req: Request, res: Response): Promise<void> {
    try {
        const { courseSlug, moduleIndex } = req.params;
        const module_id = `${courseSlug}::modules::${moduleIndex}`;

        const decks = await listDecksForModule(module_id);

        res.json({
            success: true,
            module_id,
            decks,
            total: decks.length,
        });

    } catch (error) {
        console.error("[Controller] List decks error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Health check endpoint
 * GET /api/flashcards/health
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;

    res.json({
        success: true,
        service: "flashcard-generator",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        config: {
            gemini_configured: hasGeminiKey,
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        },
    });
}

export default {
    generateFlashcards,
    quickGenerate,
    getFlashcards,
    getFlashcardStats,
    getModuleContent,
    listModules,
    listCourses,
    listDecks,
    healthCheck,
};
