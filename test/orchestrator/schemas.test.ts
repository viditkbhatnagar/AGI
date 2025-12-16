/**
 * Orchestrator Schemas Unit Tests
 * 
 * Tests Zod validators for Stage A and Stage B outputs.
 * 
 * Run: npm run test:run -- test/orchestrator/schemas.test.ts
 */

import { describe, it, expect } from "vitest";
import {
    StageAOutputSchema,
    StageBOutputSchema,
    FlashcardSchema,
    ContextChunkSchema,
    CardVerificationResultSchema,
    safeParseStageA,
    safeParseStageB,
    validateFlashcard,
    type StageAOutput,
    type StageBOutput,
    type Flashcard,
} from "../../server/services/flashcard/orchestrator/schemas";
import {
    STAGE_A_EXAMPLE_OUTPUT,
    STAGE_B_EXAMPLE_OUTPUT,
} from "../../server/services/flashcard/orchestrator/fewShots";

// =============================================================================
// STAGE A SCHEMA TESTS
// =============================================================================

describe("StageAOutputSchema", () => {
    it("should validate the example Stage A output", () => {
        const result = StageAOutputSchema.safeParse(STAGE_A_EXAMPLE_OUTPUT);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.module_summary.length).toBeGreaterThanOrEqual(6);
            expect(result.data.key_topics.length).toBeGreaterThanOrEqual(6);
        }
    });

    it("should validate a minimal valid Stage A output", () => {
        const minimalInput: StageAOutput = {
            module_summary: [
                { point: "First key concept explained clearly", supports: ["c1"] },
                { point: "Second key concept explained clearly", supports: ["c2"] },
                { point: "Third key concept explained clearly", supports: ["c1"] },
                { point: "Fourth key concept explained clearly", supports: ["c2"] },
                { point: "Fifth key concept explained clearly", supports: ["c1", "c2"] },
                { point: "Sixth key concept explained clearly", supports: ["c2"] },
            ],
            key_topics: [
                { topic: "Topic 1", supports: ["c1"] },
                { topic: "Topic 2", supports: ["c2"] },
                { topic: "Topic 3", supports: ["c1"] },
                { topic: "Topic 4", supports: ["c2"] },
                { topic: "Topic 5", supports: ["c1"] },
                { topic: "Topic 6", supports: ["c2"] },
            ],
            coverage_map: [],
        };

        const result = StageAOutputSchema.safeParse(minimalInput);
        expect(result.success).toBe(true);
    });

    it("should reject Stage A with too few summary points", () => {
        const invalidInput = {
            module_summary: [
                { point: "Only one point here", supports: ["c1"] },
            ],
            key_topics: [
                { topic: "Topic 1", supports: ["c1"] },
                { topic: "Topic 2", supports: ["c2"] },
                { topic: "Topic 3", supports: ["c1"] },
                { topic: "Topic 4", supports: ["c2"] },
                { topic: "Topic 5", supports: ["c1"] },
                { topic: "Topic 6", supports: ["c2"] },
            ],
        };

        const result = StageAOutputSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
    });

    it("should reject summary points without supports array", () => {
        const invalidInput = {
            module_summary: [
                { point: "Point without supports" },
                { point: "Another point", supports: ["c1"] },
                { point: "Third point", supports: ["c2"] },
                { point: "Fourth point", supports: ["c1"] },
                { point: "Fifth point", supports: ["c2"] },
                { point: "Sixth point", supports: ["c1"] },
            ],
            key_topics: [
                { topic: "Topic 1", supports: ["c1"] },
                { topic: "Topic 2", supports: ["c2"] },
                { topic: "Topic 3", supports: ["c1"] },
                { topic: "Topic 4", supports: ["c2"] },
                { topic: "Topic 5", supports: ["c1"] },
                { topic: "Topic 6", supports: ["c2"] },
            ],
        };

        const result = StageAOutputSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
    });

    it("should use safeParseStageA for detailed error info", () => {
        const result = safeParseStageA({ module_summary: [], key_topics: [] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.issues.length).toBeGreaterThan(0);
        }
    });
});

// =============================================================================
// STAGE B SCHEMA TESTS
// =============================================================================

describe("StageBOutputSchema", () => {
    it("should validate the example Stage B output", () => {
        const result = StageBOutputSchema.safeParse(STAGE_B_EXAMPLE_OUTPUT);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.cards.length).toBe(3);
            expect(result.data.generated_count).toBe(3);
        }
    });

    it("should validate a minimal valid Stage B output", () => {
        const minimalInput: StageBOutput = {
            module_id: "mod-test-001",
            module_title: "Test Module",
            generated_count: 1,
            cards: [
                {
                    card_id: "Mmod-test-001_C1",
                    q: "What is the main concept?",
                    a: "The main concept is a fundamental idea that forms the basis of understanding.",
                    difficulty: "easy",
                    bloom_level: "Remember",
                    evidence: [
                        {
                            chunk_id: "c1",
                            source_file: "test.pdf",
                            loc: "p.1",
                            excerpt: "The main concept is a fundamental idea that forms the basis.",
                        },
                    ],
                    sources: [{ type: "pdf", file: "test.pdf", loc: "p.1" }],
                    confidence_score: 0.9,
                    rationale: "Core definition",
                    review_required: false,
                },
            ],
            warnings: [],
        };

        const result = StageBOutputSchema.safeParse(minimalInput);
        expect(result.success).toBe(true);
    });

    it("should reject cards with invalid card_id format", () => {
        const invalidInput = {
            module_id: "mod-test",
            module_title: "Test",
            generated_count: 1,
            cards: [
                {
                    card_id: "invalid-format", // Should be M<id>_C<num>
                    q: "Question?",
                    a: "Answer here",
                    difficulty: "easy",
                    bloom_level: "Remember",
                    evidence: [{ chunk_id: "c1", source_file: "test.pdf", loc: "p.1", excerpt: "Some text here" }],
                    sources: [{ type: "pdf", file: "test.pdf", loc: "p.1" }],
                    confidence_score: 0.9,
                    rationale: "Test",
                    review_required: false,
                },
            ],
            warnings: [],
        };

        const result = StageBOutputSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
    });

    it("should reject cards with invalid difficulty", () => {
        const invalidInput = {
            module_id: "mod-test",
            module_title: "Test",
            generated_count: 1,
            cards: [
                {
                    card_id: "Mmod-test_C1",
                    q: "Question?",
                    a: "Answer here",
                    difficulty: "super-hard", // Invalid
                    bloom_level: "Remember",
                    evidence: [{ chunk_id: "c1", source_file: "test.pdf", loc: "p.1", excerpt: "Some text here" }],
                    sources: [{ type: "pdf", file: "test.pdf", loc: "p.1" }],
                    confidence_score: 0.9,
                    rationale: "Test",
                    review_required: false,
                },
            ],
            warnings: [],
        };

        const result = StageBOutputSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
    });

    it("should use safeParseStageB for detailed error info", () => {
        const result = safeParseStageB({ module_id: "test", cards: [] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.issues.length).toBeGreaterThan(0);
        }
    });
});

// =============================================================================
// FLASHCARD SCHEMA TESTS
// =============================================================================

describe("FlashcardSchema", () => {
    it("should validate a complete flashcard", () => {
        const card: Flashcard = {
            card_id: "Mmod-hr-101_C1",
            q: "What is organizational culture?",
            a: "A system of shared values and beliefs.",
            difficulty: "easy",
            bloom_level: "Remember",
            evidence: [
                {
                    chunk_id: "c1",
                    source_file: "culture.pptx",
                    loc: "slide 2",
                    excerpt: "Organizational culture is a system of shared values.",
                },
            ],
            sources: [{ type: "slides", file: "culture.pptx", loc: "slide 2" }],
            confidence_score: 0.95,
            rationale: "Core definition for understanding workplace dynamics.",
            review_required: false,
        };

        const result = FlashcardSchema.safeParse(card);
        expect(result.success).toBe(true);
    });

    it("should reject flashcard with too short question", () => {
        const card = {
            card_id: "Mmod-test_C1",
            q: "What?", // Too short
            a: "A valid answer here.",
            difficulty: "easy",
            bloom_level: "Remember",
            evidence: [{ chunk_id: "c1", source_file: "test.pdf", loc: "p.1", excerpt: "Some text" }],
            sources: [{ type: "pdf", file: "test.pdf", loc: "p.1" }],
            confidence_score: 0.9,
            rationale: "Test",
            review_required: false,
        };

        const result = FlashcardSchema.safeParse(card);
        expect(result.success).toBe(false);
    });

    it("should validate using validateFlashcard helper", () => {
        const validCard = STAGE_B_EXAMPLE_OUTPUT.cards[0];
        const result = validateFlashcard(validCard);
        expect(result.valid).toBe(true);
        expect(result.card).toBeDefined();
    });

    it("should return errors for invalid card using validateFlashcard", () => {
        const invalidCard = { card_id: "bad", q: "x" };
        const result = validateFlashcard(invalidCard);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
    });
});

// =============================================================================
// CONTEXT CHUNK SCHEMA TESTS
// =============================================================================

describe("ContextChunkSchema", () => {
    it("should validate a complete context chunk", () => {
        const chunk = {
            chunk_id: "c1",
            source_file: "lecture.mp4",
            provider: "google_drive",
            slide_or_page: null,
            start_sec: 120.5,
            end_sec: 180.0,
            heading: "Introduction",
            text: "This is the content of the chunk explaining the topic.",
            tokens_est: 50,
        };

        const result = ContextChunkSchema.safeParse(chunk);
        expect(result.success).toBe(true);
    });

    it("should validate minimal context chunk", () => {
        const chunk = {
            chunk_id: "c1",
            source_file: "doc.pdf",
            text: "Some text content here.",
        };

        const result = ContextChunkSchema.safeParse(chunk);
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// VERIFICATION RESULT SCHEMA TESTS
// =============================================================================

describe("CardVerificationResultSchema", () => {
    it("should validate a verification result with corrections", () => {
        const result = {
            card_id: "Mmod-test_C1",
            verified: false,
            confidence: 0.75,
            corrections: [
                {
                    evidence_index: 0,
                    status: "corrected",
                    corrected_excerpt: "The corrected text from the chunk",
                    reason: "Minor whitespace difference",
                    similarity_score: 0.92,
                },
                {
                    evidence_index: 1,
                    status: "ok",
                    corrected_excerpt: null,
                },
            ],
        };

        const parseResult = CardVerificationResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
    });

    it("should validate a fully verified result", () => {
        const result = {
            card_id: "Mmod-test_C1",
            verified: true,
            confidence: 1.0,
            corrections: [
                { evidence_index: 0, status: "ok", corrected_excerpt: null },
            ],
        };

        const parseResult = CardVerificationResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
    });
});
