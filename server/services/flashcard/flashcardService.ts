/**
 * Flashcard Generation Pipeline - Main Service
 * 
 * Orchestrates the two-stage flashcard generation process:
 * - Stage A: Module Summarization
 * - Stage B: Flashcard Generation
 * - Verification: Evidence Validation
 * - Post-Processing: Quality Assurance
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
    FlashcardGenerationInput,
    StageAOutput,
    StageBOutput,
    Flashcard,
    VerificationResult,
    PipelineConfig,
    Chunk,
    StoredFlashcardDeck,
    CoverageAnalysis,
    DifficultyBalance,
    BloomDistribution
} from "./types";
import {
    StageAOutputSchema,
    StageBOutputSchema,
    VerificationResultSchema,
    FlashcardSchema,
    PipelineConfigSchema
} from "./types";
import {
    STAGE_A_SYSTEM_PROMPT,
    STAGE_B_SYSTEM_PROMPT,
    VERIFICATION_SYSTEM_PROMPT,
    buildStageAUserPrompt,
    buildStageBUserPrompt,
    buildVerificationUserPrompt,
    buildSupplementaryCardPrompt,
    buildDifficultyAdjustmentPrompt
} from "./prompts";

// Default pipeline configuration
const DEFAULT_CONFIG: PipelineConfig = {
    retrieval_K: 8,
    model_temperature: 0.1,
    max_output_tokens: 1500,
    embedding_similarity_threshold: 0.85,
    evidence_excerpt_min_chars: 20,
    evidence_excerpt_max_chars: 250,
    max_answer_words: 40,
    max_answer_chars: 300,
    target_card_count: 10,
    difficulty_distribution: { easy: 3, medium: 4, hard: 3 },
    min_higher_order_bloom: 3
};

export class FlashcardGenerationService {
    private genAI: GoogleGenerativeAI;
    private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
    private config: PipelineConfig;

    constructor(apiKey: string, config?: Partial<PipelineConfig>) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.model = this.genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-1.0-pro",
            generationConfig: {
                temperature: this.config.model_temperature,
                maxOutputTokens: this.config.max_output_tokens,
            }
        });
    }

    /**
     * Main entry point - generates flashcard deck from module content
     */
    async generateFlashcardDeck(input: FlashcardGenerationInput): Promise<StoredFlashcardDeck> {
        console.log(`[FlashcardService] Starting generation for module: ${input.module_id}`);

        try {
            // Stage A: Summarization
            console.log("[FlashcardService] Stage A: Generating summary...");
            const stageAOutput = await this.runStageA(input);

            // Stage B: Flashcard Generation
            console.log("[FlashcardService] Stage B: Generating flashcards...");
            const stageBOutput = await this.runStageB(input, stageAOutput);

            // Verification: Validate each card
            console.log("[FlashcardService] Verification: Validating evidence...");
            const verifiedCards = await this.runVerification(
                stageBOutput.cards,
                input.retrieved_chunks
            );

            // Post-Processing: Quality assurance
            console.log("[FlashcardService] Post-processing: Quality assurance...");
            const processedDeck = await this.runPostProcessing(
                verifiedCards,
                stageBOutput,
                stageAOutput,
                input
            );

            // Build final deck
            const finalDeck: StoredFlashcardDeck = {
                course_id: input.course_id,
                module_id: input.module_id,
                module_title: input.module_title,
                cards: processedDeck.cards,
                stage_a_output: stageAOutput,
                warnings: [...stageBOutput.warnings, ...processedDeck.warnings],
                generation_metadata: stageBOutput.generation_metadata,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                reviewed_by: null,
                review_status: "pending"
            };

            console.log(`[FlashcardService] Generation complete: ${finalDeck.cards.length} cards`);
            return finalDeck;

        } catch (error) {
            console.error("[FlashcardService] Generation failed:", error);
            throw error;
        }
    }

    // ===========================================================================
    // STAGE A: Module Summarization
    // ===========================================================================

    private async runStageA(input: FlashcardGenerationInput): Promise<StageAOutput> {
        const userPrompt = buildStageAUserPrompt({
            module_id: input.module_id,
            module_title: input.module_title,
            course_id: input.course_id,
            contextChunks: input.retrieved_chunks,
            module_metadata: input.module_metadata
        });

        // Use chat session for multi-turn conversation
        const chat = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: STAGE_A_SYSTEM_PROMPT }]
                },
                {
                    role: "model",
                    parts: [{ text: "I understand. I will analyze the ContextChunks and produce a structured JSON summary with citations." }]
                }
            ]
        });

        const result = await chat.sendMessage(userPrompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Stage A: Failed to extract JSON from response");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const validated = StageAOutputSchema.parse(parsed);

        console.log(`[StageA] Generated ${validated.module_summary.length} summary points, ${validated.key_topics.length} topics`);

        return validated;
    }

    // ===========================================================================
    // STAGE B: Flashcard Generation
    // ===========================================================================

    private async runStageB(
        input: FlashcardGenerationInput,
        stageAOutput: StageAOutput
    ): Promise<StageBOutput> {
        const userPrompt = buildStageBUserPrompt({
            module_id: input.module_id,
            module_title: input.module_title,
            course_id: input.course_id,
            contextChunks: input.retrieved_chunks,
            stageAOutput
        });

        // Use chat session for multi-turn conversation
        const chat = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: STAGE_B_SYSTEM_PROMPT }]
                },
                {
                    role: "model",
                    parts: [{ text: "I understand. I will generate exactly 10 flashcards with proper evidence citations in JSON format." }]
                }
            ]
        });

        const result = await chat.sendMessage(userPrompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Stage B: Failed to extract JSON from response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Check for error response
        if (parsed.error === "RULE_VIOLATION") {
            throw new Error(`Stage B Rule Violation: ${parsed.details}`);
        }

        const validated = StageBOutputSchema.parse(parsed);

        console.log(`[StageB] Generated ${validated.generated_count} flashcards`);

        return validated;
    }

    // ===========================================================================
    // VERIFICATION: Evidence Validation
    // ===========================================================================

    private async runVerification(
        cards: Flashcard[],
        contextChunks: Chunk[]
    ): Promise<Flashcard[]> {
        const verifiedCards: Flashcard[] = [];

        for (const card of cards) {
            try {
                const verificationResult = await this.verifyCard(card, contextChunks);

                // Update card based on verification
                const updatedCard: Flashcard = {
                    ...card,
                    review_required: !verificationResult.verified,
                    confidence_score: verificationResult.verified
                        ? Math.max(card.confidence_score, verificationResult.confidence)
                        : Math.min(0.3, verificationResult.confidence)
                };

                // Apply any corrections
                if (verificationResult.corrections.length > 0) {
                    for (const correction of verificationResult.corrections) {
                        if (correction.corrected_excerpt && updatedCard.evidence[correction.evidence_index]) {
                            updatedCard.evidence[correction.evidence_index].excerpt = correction.corrected_excerpt;
                        }
                    }
                }

                verifiedCards.push(updatedCard);

            } catch (error) {
                console.warn(`[Verification] Failed for card ${card.card_id}:`, error);
                // Mark as requiring review if verification fails
                verifiedCards.push({
                    ...card,
                    review_required: true,
                    confidence_score: 0.0
                });
            }
        }

        const verifiedCount = verifiedCards.filter(c => !c.review_required).length;
        console.log(`[Verification] ${verifiedCount}/${cards.length} cards verified`);

        return verifiedCards;
    }

    private async verifyCard(card: Flashcard, contextChunks: Chunk[]): Promise<VerificationResult> {
        // First, do programmatic verification for exact excerpts
        const programmaticResult = this.programmaticVerify(card, contextChunks);

        // If programmatic verification passes, skip model verification
        if (programmaticResult.verified && programmaticResult.corrections.length === 0) {
            return programmaticResult;
        }

        // Fall back to model verification for complex cases
        const userPrompt = buildVerificationUserPrompt({ card, contextChunks });

        // Use chat session for multi-turn conversation
        const chat = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: VERIFICATION_SYSTEM_PROMPT }]
                },
                {
                    role: "model",
                    parts: [{ text: "I understand. I will verify each evidence excerpt against the chunks." }]
                }
            ]
        });

        const result = await chat.sendMessage(userPrompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return programmaticResult; // Fall back to programmatic result
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return VerificationResultSchema.parse(parsed);
    }

    private programmaticVerify(card: Flashcard, contextChunks: Chunk[]): VerificationResult {
        const corrections: VerificationResult["corrections"] = [];
        let allVerified = true;

        for (let i = 0; i < card.evidence.length; i++) {
            const evidence = card.evidence[i];
            const chunk = contextChunks.find(c => c.chunk_id === evidence.chunk_id);

            if (!chunk) {
                corrections.push({
                    evidence_index: i,
                    original_excerpt: evidence.excerpt,
                    reason: `chunk_id "${evidence.chunk_id}" not found in context`
                });
                allVerified = false;
                continue;
            }

            // Check if excerpt exists in chunk text
            const normalizedChunkText = chunk.text.toLowerCase().replace(/\s+/g, ' ').trim();
            const normalizedExcerpt = evidence.excerpt.toLowerCase().replace(/\s+/g, ' ').trim();

            if (!normalizedChunkText.includes(normalizedExcerpt)) {
                // Try to find a similar sentence
                const sentences = chunk.text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
                const similarSentence = sentences.find(s =>
                    this.calculateSimilarity(s.toLowerCase(), normalizedExcerpt) > 0.7
                );

                corrections.push({
                    evidence_index: i,
                    original_excerpt: evidence.excerpt,
                    corrected_excerpt: similarSentence || undefined,
                    reason: similarSentence ? "excerpt modified to match chunk" : "excerpt not found in chunk"
                });
                allVerified = similarSentence ? true : false;
            }
        }

        return {
            card_id: card.card_id,
            verified: allVerified,
            confidence: allVerified ? 0.95 : 0.3,
            corrections
        };
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size; // Jaccard similarity
    }

    // ===========================================================================
    // POST-PROCESSING: Quality Assurance
    // ===========================================================================

    private async runPostProcessing(
        cards: Flashcard[],
        stageBOutput: StageBOutput,
        stageAOutput: StageAOutput,
        input: FlashcardGenerationInput
    ): Promise<{ cards: Flashcard[]; warnings: string[] }> {
        const warnings: string[] = [];
        let processedCards = [...cards];

        // 1. Enforce answer length limits
        processedCards = this.enforceAnswerLimits(processedCards);

        // 2. Check for duplicate questions
        const { cards: dedupedCards, duplicatesRemoved } = this.removeDuplicates(processedCards);
        processedCards = dedupedCards;
        if (duplicatesRemoved > 0) {
            warnings.push(`Removed ${duplicatesRemoved} duplicate questions`);
        }

        // 3. Analyze topic coverage
        const coverage = this.analyzeCoverage(processedCards, stageAOutput.key_topics);
        if (coverage.uncovered_topics.length > 0) {
            warnings.push(`Topics not covered: ${coverage.uncovered_topics.join(", ")}`);

            // Try to generate supplementary cards for uncovered topics
            for (const topic of coverage.uncovered_topics.slice(0, 3)) {
                try {
                    const supplementaryCard = await this.generateSupplementaryCard(
                        topic,
                        input,
                        processedCards
                    );
                    if (supplementaryCard) {
                        processedCards.push(supplementaryCard);
                    }
                } catch (error) {
                    console.warn(`[PostProcess] Failed to generate card for topic: ${topic}`);
                }
            }
        }

        // 4. Balance difficulty distribution
        const difficultyBalance = this.analyzeDifficultyBalance(processedCards);
        if (!difficultyBalance.isBalanced) {
            warnings.push(`Difficulty imbalance: easy=${difficultyBalance.easy}, medium=${difficultyBalance.medium}, hard=${difficultyBalance.hard}`);
            // Could add difficulty adjustment logic here
        }

        // 5. Check Bloom's taxonomy distribution
        const bloomDist = this.analyzeBloomDistribution(processedCards);
        if (!bloomDist.meetsRequirement) {
            warnings.push(`Insufficient higher-order questions: ${bloomDist.higher_order}/${this.config.min_higher_order_bloom} required`);
        }

        // 6. Trim to target count if needed
        if (processedCards.length > this.config.target_card_count) {
            // Keep cards with highest confidence, balanced by difficulty
            processedCards = this.selectBestCards(processedCards, this.config.target_card_count);
        }

        // 7. Mark cards with insufficient evidence for review
        processedCards = processedCards.map(card => ({
            ...card,
            review_required: card.review_required ||
                card.evidence.length === 0 ||
                card.confidence_score < 0.5
        }));

        const reviewCount = processedCards.filter(c => c.review_required).length;
        if (reviewCount > 0) {
            warnings.push(`${reviewCount} cards flagged for manual review`);
        }

        return { cards: processedCards, warnings };
    }

    private enforceAnswerLimits(cards: Flashcard[]): Flashcard[] {
        return cards.map(card => {
            const words = card.a.split(/\s+/);
            if (words.length > this.config.max_answer_words) {
                return {
                    ...card,
                    a: words.slice(0, this.config.max_answer_words).join(" ") + "..."
                };
            }
            if (card.a.length > this.config.max_answer_chars) {
                return {
                    ...card,
                    a: card.a.substring(0, this.config.max_answer_chars - 3) + "..."
                };
            }
            return card;
        });
    }

    private removeDuplicates(cards: Flashcard[]): { cards: Flashcard[]; duplicatesRemoved: number } {
        const unique: Flashcard[] = [];
        const seen: Set<string> = new Set();
        let removed = 0;

        for (const card of cards) {
            // Simple normalization for comparison
            const normalizedQ = card.q.toLowerCase().replace(/[^\w\s]/g, "").trim();

            // Check for exact or near duplicates
            let isDuplicate = false;
            for (const seenQ of seen) {
                if (this.calculateSimilarity(normalizedQ, seenQ) > this.config.embedding_similarity_threshold) {
                    isDuplicate = true;
                    removed++;
                    break;
                }
            }

            if (!isDuplicate) {
                seen.add(normalizedQ);
                unique.push(card);
            }
        }

        return { cards: unique, duplicatesRemoved: removed };
    }

    private analyzeCoverage(cards: Flashcard[], keyTopics: StageAOutput["key_topics"]): CoverageAnalysis {
        const topicNames = keyTopics.map(t => t.topic.toLowerCase());
        const coveredTopics: string[] = [];
        const uncoveredTopics: string[] = [];

        for (const topic of topicNames) {
            const isCovered = cards.some(card =>
                card.q.toLowerCase().includes(topic) ||
                card.a.toLowerCase().includes(topic) ||
                card.rationale.toLowerCase().includes(topic)
            );

            if (isCovered) {
                coveredTopics.push(topic);
            } else {
                uncoveredTopics.push(topic);
            }
        }

        return {
            covered_topics: coveredTopics,
            uncovered_topics: uncoveredTopics,
            coverage_percentage: topicNames.length > 0
                ? (coveredTopics.length / topicNames.length) * 100
                : 100
        };
    }

    private analyzeDifficultyBalance(cards: Flashcard[]): DifficultyBalance {
        const counts = {
            easy: cards.filter(c => c.difficulty === "easy").length,
            medium: cards.filter(c => c.difficulty === "medium").length,
            hard: cards.filter(c => c.difficulty === "hard").length
        };

        // Consider balanced if within 2 of target
        const isBalanced =
            Math.abs(counts.easy - this.config.difficulty_distribution.easy) <= 2 &&
            Math.abs(counts.medium - this.config.difficulty_distribution.medium) <= 2 &&
            Math.abs(counts.hard - this.config.difficulty_distribution.hard) <= 2;

        return { ...counts, isBalanced };
    }

    private analyzeBloomDistribution(cards: Flashcard[]): BloomDistribution {
        const higherOrderLevels = ["Apply", "Analyze", "Evaluate", "Create"];
        const lowerOrderLevels = ["Remember", "Understand"];

        const higher_order = cards.filter(c => higherOrderLevels.includes(c.bloom_level)).length;
        const lower_order = cards.filter(c => lowerOrderLevels.includes(c.bloom_level)).length;

        return {
            lower_order,
            higher_order,
            meetsRequirement: higher_order >= this.config.min_higher_order_bloom
        };
    }

    private async generateSupplementaryCard(
        topic: string,
        input: FlashcardGenerationInput,
        existingCards: Flashcard[]
    ): Promise<Flashcard | null> {
        const prompt = buildSupplementaryCardPrompt({
            module_id: input.module_id,
            module_title: input.module_title,
            uncovered_topic: topic,
            contextChunks: input.retrieved_chunks,
            existing_cards: existingCards
        });

        if (prompt.startsWith("NO_RELEVANT_CHUNKS")) {
            return null;
        }

        // Use chat session for multi-turn conversation
        const chat = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: STAGE_B_SYSTEM_PROMPT }]
                },
                {
                    role: "model",
                    parts: [{ text: "I will generate 1 supplementary flashcard for the specified topic." }]
                }
            ]
        });

        const result = await chat.sendMessage(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) return null;

        return FlashcardSchema.parse(parsed);
    }

    private selectBestCards(cards: Flashcard[], count: number): Flashcard[] {
        // Sort by confidence (descending), then by difficulty variety
        const sorted = [...cards].sort((a, b) => {
            // Prioritize verified cards
            if (!a.review_required && b.review_required) return -1;
            if (a.review_required && !b.review_required) return 1;
            // Then by confidence
            return b.confidence_score - a.confidence_score;
        });

        // Select while maintaining difficulty balance
        const selected: Flashcard[] = [];
        const dCount = { easy: 0, medium: 0, hard: 0 };
        const target = this.config.difficulty_distribution;

        // First pass: fill each difficulty bucket
        for (const card of sorted) {
            if (selected.length >= count) break;

            if (dCount[card.difficulty] < target[card.difficulty]) {
                selected.push(card);
                dCount[card.difficulty]++;
            }
        }

        // Second pass: fill remaining with highest confidence
        for (const card of sorted) {
            if (selected.length >= count) break;
            if (!selected.includes(card)) {
                selected.push(card);
            }
        }

        return selected.slice(0, count);
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createFlashcardService(config?: Partial<PipelineConfig>): FlashcardGenerationService {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable");
    }

    return new FlashcardGenerationService(apiKey, config);
}
