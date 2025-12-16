/**
 * Flashcard Generation Pipeline - Controller
 * 
 * Express route handlers for flashcard generation endpoints.
 */

import { Request, Response } from "express";
import { createFlashcardService } from "./flashcardService";
import { FlashcardGenerationInputSchema, StoredFlashcardDeck } from "./types";
import { ZodError } from "zod";
import { readLatestDeck, saveDeckToStore } from "./persistence/deckStore";
import { generateFlashcardsForModule } from "./productionGenerator";

// In-memory cache for flashcard decks
const flashcardCache = new Map<string, StoredFlashcardDeck>();

/**
 * POST /api/flashcards/generate
 * 
 * Generate flashcards for a module from retrieved chunks.
 */
export async function generateFlashcards(req: Request, res: Response) {
    try {
        // Validate input
        const input = FlashcardGenerationInputSchema.parse(req.body);

        // Create service and generate deck
        const service = createFlashcardService({
            model_temperature: input.prompt_settings?.model_temperature,
            max_output_tokens: input.prompt_settings?.max_output_tokens,
        });

        const deck = await service.generateFlashcardDeck(input);

        // Cache the deck
        const cacheKey = `${input.course_id}:${input.module_id}`;
        flashcardCache.set(cacheKey, deck);

        res.status(200).json({
            success: true,
            data: deck,
            message: `Generated ${deck.cards.length} flashcards for module "${deck.module_title}"`
        });

    } catch (error) {
        console.error("[FlashcardController] Generation error:", error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                error: "VALIDATION_ERROR",
                details: error.errors
            });
        }

        res.status(500).json({
            success: false,
            error: "GENERATION_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

/**
 * POST /api/flashcards/generate-from-module
 * 
 * Generate flashcards directly from a module (extracts content automatically)
 * This is the endpoint the frontend uses.
 */
export async function generateFlashcardsFromModule(req: Request, res: Response) {
    try {
        const { courseSlug, moduleIndex } = req.body;

        if (!courseSlug || moduleIndex === undefined) {
            return res.status(400).json({
                success: false,
                error: "MISSING_PARAMS",
                message: "courseSlug and moduleIndex are required"
            });
        }

        console.log(`[FlashcardController] Generating flashcards for ${courseSlug}/module-${moduleIndex}`);

        // Use the production generator
        const result = await generateFlashcardsForModule({
            courseSlug,
            moduleIndex: parseInt(moduleIndex, 10),
            cardCount: 10,
        });

        if (!result.success || !result.deck) {
            return res.status(400).json({
                success: false,
                error: "GENERATION_FAILED",
                message: result.error || "Failed to generate flashcards"
            });
        }

        // Save to persistent storage
        const { deck_id } = await saveDeckToStore(result.metadata.module_id, result.deck);

        // Cache for quick access
        const cacheKey = `${courseSlug}:${moduleIndex}`;
        flashcardCache.set(cacheKey, { ...result.deck, id: deck_id });

        // Transform cards to match frontend expected format
        const transformedCards = result.deck.cards.map(card => ({
            card_id: card.card_id,
            front: card.q,
            back: card.a,
            type: getCardType(card.bloom_level),
            difficulty: card.difficulty,
            tags: card.sources.map(s => s.file),
            review_required: card.review_required,
            confidence_score: card.confidence_score
        }));

        res.status(200).json({
            success: true,
            deck_id,
            module_id: result.metadata.module_id,
            course_id: courseSlug,
            cards: transformedCards,
            stats: {
                total_generated: result.deck.cards.length,
                last_updated: result.deck.created_at
            },
            metadata: result.metadata
        });

    } catch (error) {
        console.error("[FlashcardController] Generate from module error:", error);
        res.status(500).json({
            success: false,
            error: "GENERATION_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

/**
 * GET /api/modules/:module_id/flashcards
 * 
 * Retrieve flashcard deck for a module.
 * Module ID format: courseSlug::modules::moduleIndex
 */
export async function getModuleFlashcards(req: Request, res: Response) {
    try {
        const { module_id } = req.params;
        const { course_id } = req.query;

        console.log(`[FlashcardController] GET flashcards for module_id: ${module_id}`);

        // Handle missing module_id
        if (!module_id) {
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: "No flashcard deck found. Click 'Generate Flashcards' to create them."
            });
        }

        // Parse module_id to extract course slug and module index
        // Format: courseSlug::modules::moduleIndex or courseSlug::mbaModules::moduleIndex
        const parts = module_id.split("::");
        let courseSlug: string;
        let moduleIndex: number;

        if (parts.length >= 3) {
            courseSlug = parts[0];
            moduleIndex = parseInt(parts[2], 10);
            console.log(`[FlashcardController] Parsed: courseSlug=${courseSlug}, moduleIndex=${moduleIndex}`);
        } else if (course_id) {
            // Fallback: use course_id from query
            courseSlug = course_id as string;
            moduleIndex = parseInt(module_id, 10) || 0;
            console.log(`[FlashcardController] Using fallback: courseSlug=${courseSlug}, moduleIndex=${moduleIndex}`);
        } else {
            // Return 404 to show "Generate Flashcards" button
            console.log(`[FlashcardController] Could not parse module_id: ${module_id}`);
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: "No flashcard deck found. Click 'Generate Flashcards' to create them."
            });
        }

        // Validate parsed values
        if (!courseSlug || isNaN(moduleIndex)) {
            console.log(`[FlashcardController] Invalid parsed values: courseSlug=${courseSlug}, moduleIndex=${moduleIndex}`);
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: "No flashcard deck found. Click 'Generate Flashcards' to create them."
            });
        }

        // Check memory cache first
        const cacheKey = `${courseSlug}:${moduleIndex}`;
        let deck = flashcardCache.get(cacheKey);

        // If not in cache, try to load from persistent storage
        if (!deck) {
            console.log(`[FlashcardController] Cache miss for ${module_id}, checking storage...`);
            deck = await readLatestDeck(module_id) || undefined;
            if (deck) {
                flashcardCache.set(cacheKey, deck);
                console.log(`[FlashcardController] Loaded deck from storage: ${deck.cards.length} cards`);
            }
        }

        if (!deck) {
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: `No flashcard deck found for module. Generate flashcards first.`
            });
        }

        // Transform cards to match frontend expected format
        const transformedCards = deck.cards.map(card => ({
            card_id: card.card_id,
            front: card.q,  // Frontend expects 'front' not 'q'
            back: card.a,   // Frontend expects 'back' not 'a'
            type: getCardType(card.bloom_level),
            difficulty: card.difficulty,
            tags: card.sources.map(s => s.file),
            review_required: card.review_required,
            confidence_score: card.confidence_score
        }));

        // Filter out cards requiring review for student view
        const studentView = req.query.include_review !== "true";
        const filteredCards = studentView
            ? transformedCards.filter(c => !c.review_required)
            : transformedCards;

        res.status(200).json({
            deck_id: deck.id || `deck_${module_id}`,
            module_id: deck.module_id,
            course_id: deck.course_id,
            cards: filteredCards,
            stats: {
                total_generated: deck.cards.length,
                last_updated: deck.updated_at || deck.created_at
            }
        });

    } catch (error) {
        console.error("[FlashcardController] Retrieval error:", error);
        // Return 404 instead of 500 to show "Generate Flashcards" button
        res.status(404).json({
            success: false,
            error: "NOT_FOUND",
            message: "No flashcard deck found. Click 'Generate Flashcards' to create them."
        });
    }
}

/**
 * Map Bloom's taxonomy level to card type
 */
function getCardType(bloomLevel: string): "concept" | "application" | "scenario" {
    switch (bloomLevel) {
        case "Remember":
        case "Understand":
            return "concept";
        case "Apply":
        case "Analyze":
            return "application";
        case "Evaluate":
        case "Create":
            return "scenario";
        default:
            return "concept";
    }
}

/**
 * GET /api/flashcards/:card_id
 * 
 * Retrieve a single flashcard by ID.
 */
export async function getFlashcardById(req: Request, res: Response) {
    try {
        const { card_id } = req.params;

        // Search through all cached decks
        for (const deck of flashcardCache.values()) {
            const card = deck.cards.find(c => c.card_id === card_id);
            if (card) {
                return res.status(200).json({
                    success: true,
                    data: card,
                    context: {
                        module_id: deck.module_id,
                        module_title: deck.module_title,
                        course_id: deck.course_id
                    }
                });
            }
        }

        res.status(404).json({
            success: false,
            error: "NOT_FOUND",
            message: `Flashcard ${card_id} not found`
        });

    } catch (error) {
        console.error("[FlashcardController] Card retrieval error:", error);
        res.status(500).json({
            success: false,
            error: "RETRIEVAL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

/**
 * PUT /api/flashcards/:card_id
 * 
 * Update a flashcard (for admin edits).
 */
export async function updateFlashcard(req: Request, res: Response) {
    try {
        const { card_id } = req.params;
        const updates = req.body;

        // Find and update the card
        for (const [key, deck] of flashcardCache.entries()) {
            const cardIndex = deck.cards.findIndex(c => c.card_id === card_id);
            if (cardIndex !== -1) {
                // Apply updates
                deck.cards[cardIndex] = {
                    ...deck.cards[cardIndex],
                    ...updates,
                    // Track the edit
                    review_required: false // Clear review flag after edit
                };
                deck.updated_at = new Date().toISOString();
                deck.reviewed_by = updates.reviewed_by || deck.reviewed_by;

                flashcardCache.set(key, deck);

                return res.status(200).json({
                    success: true,
                    data: deck.cards[cardIndex],
                    message: "Flashcard updated successfully"
                });
            }
        }

        res.status(404).json({
            success: false,
            error: "NOT_FOUND",
            message: `Flashcard ${card_id} not found`
        });

    } catch (error) {
        console.error("[FlashcardController] Update error:", error);
        res.status(500).json({
            success: false,
            error: "UPDATE_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

/**
 * DELETE /api/flashcards/:card_id
 * 
 * Delete a flashcard from deck.
 */
export async function deleteFlashcard(req: Request, res: Response) {
    try {
        const { card_id } = req.params;

        for (const [key, deck] of flashcardCache.entries()) {
            const cardIndex = deck.cards.findIndex(c => c.card_id === card_id);
            if (cardIndex !== -1) {
                deck.cards.splice(cardIndex, 1);
                deck.updated_at = new Date().toISOString();

                flashcardCache.set(key, deck);

                return res.status(200).json({
                    success: true,
                    message: `Flashcard ${card_id} deleted successfully`
                });
            }
        }

        res.status(404).json({
            success: false,
            error: "NOT_FOUND",
            message: `Flashcard ${card_id} not found`
        });

    } catch (error) {
        console.error("[FlashcardController] Delete error:", error);
        res.status(500).json({
            success: false,
            error: "DELETE_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

/**
 * GET /api/flashcards/review-queue
 * 
 * Get all flashcards requiring manual review.
 */
export async function getReviewQueue(req: Request, res: Response) {
    try {
        const reviewItems: Array<{
            card: StoredFlashcardDeck["cards"][0];
            deck_info: {
                module_id: string;
                module_title: string;
                course_id: string;
            };
        }> = [];

        for (const deck of flashcardCache.values()) {
            const cardsNeedingReview = deck.cards.filter(c => c.review_required);
            for (const card of cardsNeedingReview) {
                reviewItems.push({
                    card,
                    deck_info: {
                        module_id: deck.module_id,
                        module_title: deck.module_title,
                        course_id: deck.course_id
                    }
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                total_count: reviewItems.length,
                items: reviewItems
            }
        });

    } catch (error) {
        console.error("[FlashcardController] Review queue error:", error);
        res.status(500).json({
            success: false,
            error: "RETRIEVAL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

/**
 * POST /api/flashcards/:card_id/approve
 * 
 * Approve a flashcard after review.
 */
export async function approveFlashcard(req: Request, res: Response) {
    try {
        const { card_id } = req.params;
        const { reviewed_by } = req.body;

        for (const [key, deck] of flashcardCache.entries()) {
            const cardIndex = deck.cards.findIndex(c => c.card_id === card_id);
            if (cardIndex !== -1) {
                deck.cards[cardIndex].review_required = false;
                deck.cards[cardIndex].confidence_score = Math.max(
                    deck.cards[cardIndex].confidence_score,
                    0.9
                );
                deck.updated_at = new Date().toISOString();
                deck.reviewed_by = reviewed_by;
                deck.review_status = "approved";

                flashcardCache.set(key, deck);

                return res.status(200).json({
                    success: true,
                    data: deck.cards[cardIndex],
                    message: "Flashcard approved"
                });
            }
        }

        res.status(404).json({
            success: false,
            error: "NOT_FOUND",
            message: `Flashcard ${card_id} not found`
        });

    } catch (error) {
        console.error("[FlashcardController] Approve error:", error);
        res.status(500).json({
            success: false,
            error: "APPROVE_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

/**
 * GET /api/modules/:module_id/flashcards/stats
 * 
 * Get statistics for a module's flashcard deck.
 */
export async function getModuleFlashcardStats(req: Request, res: Response) {
    try {
        const { module_id } = req.params;
        const { course_id } = req.query;

        if (!course_id) {
            return res.status(400).json({
                success: false,
                error: "MISSING_PARAM",
                message: "course_id query parameter is required"
            });
        }

        const cacheKey = `${course_id}:${module_id}`;
        const deck = flashcardCache.get(cacheKey);

        if (!deck) {
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: `No flashcard deck found for module ${module_id}`
            });
        }

        const stats = {
            total_cards: deck.cards.length,
            verified_cards: deck.cards.filter(c => !c.review_required).length,
            pending_review: deck.cards.filter(c => c.review_required).length,
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
            warnings: deck.warnings,
            key_topics_count: deck.stage_a_output.key_topics.length,
            summary_points_count: deck.stage_a_output.module_summary.length,
            generated_at: deck.generation_metadata.timestamp,
            review_status: deck.review_status
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error("[FlashcardController] Stats error:", error);
        res.status(500).json({
            success: false,
            error: "RETRIEVAL_FAILED",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}
