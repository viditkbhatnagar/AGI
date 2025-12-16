/**
 * Evidence Verification Unit Tests
 * 
 * Tests the verifyCardEvidence function for different matching scenarios.
 * 
 * Run: npm run test:run -- test/orchestrator/verifyCardEvidence.test.ts
 */

import { describe, it, expect } from "vitest";
import {
    verifyCardEvidence,
    verifyCardsEvidence,
    applyCorrections,
    normalizeWhitespace,
    extractSentences,
    calculateSimilarity,
    levenshteinDistance,
} from "../../server/services/flashcard/verification/verifyCardEvidence";
import type { Flashcard, ContextChunk } from "../../server/services/flashcard/orchestrator/schemas";

// =============================================================================
// TEST DATA
// =============================================================================

const sampleChunks: ContextChunk[] = [
    {
        chunk_id: "c1",
        source_file: "culture.pptx",
        text: "Organizational culture is a system of shared assumptions, values, and beliefs that governs how people behave in organizations. Every organization develops its own unique culture.",
        tokens_est: 40,
    },
    {
        chunk_id: "c2",
        source_file: "recruitment.pdf",
        text: "The recruitment process consists of five key stages: job analysis, sourcing candidates, screening applications, interviewing, and selection. Effective recruitment ensures organizational fit.",
        tokens_est: 45,
    },
];

const createCard = (evidence: Flashcard["evidence"]): Flashcard => ({
    card_id: "Mtest_C1",
    q: "Test question with enough characters?",
    a: "Test answer",
    difficulty: "easy",
    bloom_level: "Remember",
    evidence,
    sources: [{ type: "pdf", file: "test.pdf", loc: "p.1" }],
    confidence_score: 0.9,
    rationale: "Test rationale",
    review_required: false,
});

// =============================================================================
// EXACT MATCH TESTS
// =============================================================================

describe("verifyCardEvidence - Exact Match", () => {
    it("should verify exact excerpt match", () => {
        const card = createCard([
            {
                chunk_id: "c1",
                source_file: "culture.pptx",
                loc: "slide 1",
                excerpt: "Organizational culture is a system of shared assumptions, values, and beliefs",
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks);

        expect(result.verified).toBe(true);
        expect(result.confidence).toBe(1);
        expect(result.corrections[0].status).toBe("ok");
    });

    it("should verify multiple evidence items", () => {
        const card = createCard([
            {
                chunk_id: "c1",
                source_file: "culture.pptx",
                loc: "slide 1",
                excerpt: "Organizational culture is a system",
            },
            {
                chunk_id: "c2",
                source_file: "recruitment.pdf",
                loc: "p.1",
                excerpt: "five key stages",
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks);

        expect(result.verified).toBe(true);
        expect(result.corrections).toHaveLength(2);
        expect(result.corrections.every(c => c.status === "ok")).toBe(true);
    });
});

// =============================================================================
// WHITESPACE NORMALIZED TESTS
// =============================================================================

describe("verifyCardEvidence - Whitespace Normalization", () => {
    it("should verify excerpt with extra whitespace", () => {
        const card = createCard([
            {
                chunk_id: "c1",
                source_file: "culture.pptx",
                loc: "slide 1",
                excerpt: "Organizational  culture  is  a  system", // Extra spaces
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks);

        expect(result.verified).toBe(true);
        expect(result.corrections[0].status).toBe("ok");
    });

    it("should verify excerpt with newlines converted to spaces", () => {
        const card = createCard([
            {
                chunk_id: "c1",
                source_file: "culture.pptx",
                loc: "slide 1",
                excerpt: "Organizational\nculture\nis\na\nsystem",
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks);

        expect(result.verified).toBe(true);
    });
});

// =============================================================================
// CASE INSENSITIVE TESTS
// =============================================================================

describe("verifyCardEvidence - Case Insensitive", () => {
    it("should correct excerpt with case differences", () => {
        const card = createCard([
            {
                chunk_id: "c1",
                source_file: "culture.pptx",
                loc: "slide 1",
                excerpt: "ORGANIZATIONAL CULTURE IS A SYSTEM",
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks);

        expect(result.corrections[0].status).toBe("corrected");
        expect(result.corrections[0].corrected_excerpt).toContain("Organizational culture is a system");
    });
});

// =============================================================================
// SENTENCE LEVEL SEARCH TESTS
// =============================================================================

describe("verifyCardEvidence - Sentence Level Search", () => {
    it("should find similar sentence when excerpt has minor differences", () => {
        const card = createCard([
            {
                chunk_id: "c1",
                source_file: "culture.pptx",
                loc: "slide 1",
                // Very similar to actual text with minor word differences
                excerpt: "Every organization develops its own unique organizational culture",
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks, { minSimilarity: 0.5 });

        // Should find via fuzzy match or sentence match
        expect(["corrected", "ok"]).toContain(result.corrections[0].status);
        if (result.corrections[0].similarity_score !== undefined) {
            expect(result.corrections[0].similarity_score).toBeGreaterThan(0.3);
        }
    });
});

// =============================================================================
// MISSING EVIDENCE TESTS
// =============================================================================

describe("verifyCardEvidence - Missing Evidence", () => {
    it("should mark as missing when chunk not found", () => {
        const card = createCard([
            {
                chunk_id: "c999", // Non-existent chunk
                source_file: "unknown.pdf",
                loc: "p.1",
                excerpt: "Some longer text that is at least 10 chars",
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks);

        expect(result.verified).toBe(false);
        expect(result.corrections[0].status).toBe("missing");
        expect(result.corrections[0].reason).toContain("not found");
    });

    it("should mark as missing when excerpt not in chunk", () => {
        const card = createCard([
            {
                chunk_id: "c1",
                source_file: "culture.pptx",
                loc: "slide 1",
                excerpt: "XYZ quantum computing blockchain cryptocurrency neural networks",
            },
        ]);

        const result = verifyCardEvidence(card, sampleChunks, {
            maxLevenshteinDistance: 5,  // Strict fuzzy matching
            minSimilarity: 0.9,         // High similarity threshold
        });

        expect(result.verified).toBe(false);
        expect(result.corrections[0].status).toBe("missing");
    });
});

// =============================================================================
// BATCH VERIFICATION TESTS
// =============================================================================

describe("verifyCardsEvidence - Batch Processing", () => {
    it("should verify multiple cards and return summary", () => {
        const cards: Flashcard[] = [
            createCard([
                { chunk_id: "c1", source_file: "a.pdf", loc: "p.1", excerpt: "Organizational culture is a system" },
            ]),
            createCard([
                { chunk_id: "c2", source_file: "b.pdf", loc: "p.1", excerpt: "recruitment process consists" },
            ]),
            createCard([
                { chunk_id: "c999", source_file: "c.pdf", loc: "p.1", excerpt: "this text does not exist in any chunk" },
            ]),
        ];

        const { results, summary } = verifyCardsEvidence(cards, sampleChunks);

        expect(results).toHaveLength(3);
        expect(summary.total).toBe(3);
        expect(summary.verified).toBe(2);
        expect(summary.failed).toBe(1);
        expect(summary.averageConfidence).toBeGreaterThan(0.5);
    });

    it("should return empty results for no cards", () => {
        const { results, summary } = verifyCardsEvidence([], sampleChunks);

        expect(results).toHaveLength(0);
        expect(summary.total).toBe(0);
    });
});

// =============================================================================
// APPLY CORRECTIONS TESTS
// =============================================================================

describe("applyCorrections", () => {
    it("should update evidence excerpts with corrections", () => {
        const cards: Flashcard[] = [
            createCard([
                { chunk_id: "c1", source_file: "a.pdf", loc: "p.1", excerpt: "ORGANIZATIONAL CULTURE" },
            ]),
        ];

        const verificationResults = verifyCardsEvidence(cards, sampleChunks).results;
        const correctedCards = applyCorrections(cards, verificationResults);

        expect(correctedCards[0].evidence[0].excerpt).not.toBe("ORGANIZATIONAL CULTURE");
        expect(correctedCards[0].evidence[0].excerpt.toLowerCase()).toContain("organizational culture");
    });

    it("should mark cards for review when not verified", () => {
        const cards: Flashcard[] = [
            createCard([
                { chunk_id: "c999", source_file: "a.pdf", loc: "p.1", excerpt: "this text is missing from chunks" },
            ]),
        ];

        const verificationResults = verifyCardsEvidence(cards, sampleChunks).results;
        const correctedCards = applyCorrections(cards, verificationResults);

        expect(correctedCards[0].review_required).toBe(true);
    });
});

// =============================================================================
// STRING UTILITY TESTS
// =============================================================================

describe("normalizeWhitespace", () => {
    it("should collapse multiple spaces", () => {
        expect(normalizeWhitespace("hello   world")).toBe("hello world");
    });

    it("should trim and normalize newlines", () => {
        expect(normalizeWhitespace("  hello\n\nworld  ")).toBe("hello world");
    });

    it("should handle tabs", () => {
        expect(normalizeWhitespace("hello\t\tworld")).toBe("hello world");
    });
});

describe("extractSentences", () => {
    it("should split on sentence boundaries", () => {
        const text = "First sentence. Second sentence! Third sentence?";
        const sentences = extractSentences(text);
        expect(sentences).toHaveLength(3);
        expect(sentences[0]).toBe("First sentence.");
        expect(sentences[1]).toBe("Second sentence!");
        expect(sentences[2]).toBe("Third sentence?");
    });

    it("should filter out short segments", () => {
        const text = "Good sentence here. Hi. Another good sentence.";
        const sentences = extractSentences(text);
        expect(sentences).toHaveLength(2); // "Hi." should be filtered
    });
});

describe("calculateSimilarity", () => {
    it("should return 1.0 for identical strings", () => {
        expect(calculateSimilarity("hello world", "hello world")).toBe(1.0);
    });

    it("should return 0.0 for completely different strings", () => {
        expect(calculateSimilarity("abc def", "xyz uvw")).toBe(0.0);
    });

    it("should return partial match for overlapping words", () => {
        const sim = calculateSimilarity("the quick brown fox", "the lazy brown dog");
        expect(sim).toBeGreaterThan(0.3);
        expect(sim).toBeLessThan(0.7);
    });

    it("should be case insensitive", () => {
        expect(calculateSimilarity("Hello World", "hello world")).toBe(1.0);
    });
});

describe("levenshteinDistance", () => {
    it("should return 0 for identical strings", () => {
        expect(levenshteinDistance("hello", "hello")).toBe(0);
    });

    it("should count single character differences", () => {
        expect(levenshteinDistance("hello", "hallo")).toBe(1);
    });

    it("should count insertions", () => {
        expect(levenshteinDistance("hello", "helloo")).toBe(1);
    });

    it("should count deletions", () => {
        expect(levenshteinDistance("hello", "helo")).toBe(1);
    });

    it("should handle empty strings", () => {
        expect(levenshteinDistance("", "hello")).toBe(5);
        expect(levenshteinDistance("hello", "")).toBe(5);
        expect(levenshteinDistance("", "")).toBe(0);
    });

    it("should handle completely different strings", () => {
        expect(levenshteinDistance("abc", "xyz")).toBe(3);
    });
});
