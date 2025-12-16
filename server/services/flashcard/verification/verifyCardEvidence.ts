/**
 * Flashcard Evidence Verification
 * 
 * Verifies that card evidence excerpts exist in source chunks.
 * Uses exact match, whitespace-normalized, and fuzzy matching.
 */

import type {
    Flashcard,
    ContextChunk,
    CardVerificationResult,
} from "../orchestrator/schemas";
import { EvidenceCorrectionSchema } from "../orchestrator/schemas";
import { z } from "zod";

// =============================================================================
// TYPES
// =============================================================================

export interface VerificationConfig {
    /** Minimum similarity score for fuzzy match (0-1) */
    minSimilarity?: number;
    /** Maximum Levenshtein distance for correction */
    maxLevenshteinDistance?: number;
    /** Whether to attempt sentence-level search */
    enableSentenceSearch?: boolean;
}

const DEFAULT_CONFIG: Required<VerificationConfig> = {
    minSimilarity: 0.75,
    maxLevenshteinDistance: 50,
    enableSentenceSearch: true,
};

export type EvidenceCorrection = z.infer<typeof EvidenceCorrectionSchema>;

// =============================================================================
// MAIN VERIFICATION FUNCTION
// =============================================================================

/**
 * Verify all evidence items in a flashcard against source chunks
 */
export function verifyCardEvidence(
    card: Flashcard,
    chunks: ContextChunk[],
    config?: VerificationConfig
): CardVerificationResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const corrections: EvidenceCorrection[] = [];
    let allVerified = true;
    let totalConfidence = 0;

    // Build chunk lookup map
    const chunkMap = new Map<string, ContextChunk>();
    for (const chunk of chunks) {
        chunkMap.set(chunk.chunk_id, chunk);
    }

    for (let i = 0; i < card.evidence.length; i++) {
        const evidence = card.evidence[i];
        const chunk = chunkMap.get(evidence.chunk_id);

        if (!chunk) {
            // Chunk not found
            corrections.push({
                evidence_index: i,
                status: "missing",
                corrected_excerpt: null,
                reason: `Chunk ${evidence.chunk_id} not found in context`,
                similarity_score: 0,
            });
            allVerified = false;
            continue;
        }

        // Try verification in order of strictness
        const result = verifyExcerpt(evidence.excerpt, chunk.text, cfg);
        corrections.push({
            evidence_index: i,
            ...result,
        });

        if (result.status === "missing") {
            allVerified = false;
        }

        totalConfidence += result.similarity_score || (result.status === "ok" ? 1 : 0.5);
    }

    const avgConfidence = card.evidence.length > 0
        ? totalConfidence / card.evidence.length
        : 0;

    return {
        card_id: card.card_id,
        verified: allVerified,
        confidence: Math.min(avgConfidence, allVerified ? 1 : 0.7),
        corrections,
    };
}

// =============================================================================
// EXCERPT VERIFICATION
// =============================================================================

interface VerifyResult {
    status: "ok" | "corrected" | "missing";
    corrected_excerpt: string | null;
    reason?: string;
    similarity_score?: number;
}

/**
 * Verify an excerpt against chunk text
 */
function verifyExcerpt(
    excerpt: string,
    chunkText: string,
    config: Required<VerificationConfig>
): VerifyResult {
    // 1. Exact match (case-sensitive)
    if (chunkText.includes(excerpt)) {
        return { status: "ok", corrected_excerpt: null, similarity_score: 1.0 };
    }

    // 2. Whitespace-normalized match
    const normalizedExcerpt = normalizeWhitespace(excerpt);
    const normalizedChunk = normalizeWhitespace(chunkText);

    if (normalizedChunk.includes(normalizedExcerpt)) {
        return {
            status: "ok",
            corrected_excerpt: null,
            reason: "Matched after whitespace normalization",
            similarity_score: 0.98,
        };
    }

    // 3. Case-insensitive match
    const lowerExcerpt = normalizedExcerpt.toLowerCase();
    const lowerChunk = normalizedChunk.toLowerCase();

    if (lowerChunk.includes(lowerExcerpt)) {
        // Find the actual text to suggest as correction
        const idx = lowerChunk.indexOf(lowerExcerpt);
        const corrected = normalizedChunk.substring(idx, idx + normalizedExcerpt.length);
        return {
            status: "corrected",
            corrected_excerpt: corrected,
            reason: "Case-insensitive match found",
            similarity_score: 0.95,
        };
    }

    // 4. Sentence-level search
    if (config.enableSentenceSearch) {
        const sentences = extractSentences(chunkText);
        const bestMatch = findBestSentenceMatch(excerpt, sentences, config.minSimilarity);

        if (bestMatch) {
            return {
                status: "corrected",
                corrected_excerpt: bestMatch.sentence,
                reason: `Found similar sentence (${(bestMatch.similarity * 100).toFixed(1)}% match)`,
                similarity_score: bestMatch.similarity,
            };
        }
    }

    // 5. Fuzzy substring match using Levenshtein
    const fuzzyResult = fuzzySubstringMatch(excerpt, chunkText, config.maxLevenshteinDistance);
    if (fuzzyResult) {
        return {
            status: "corrected",
            corrected_excerpt: fuzzyResult.match,
            reason: `Fuzzy match found (distance: ${fuzzyResult.distance})`,
            similarity_score: 1 - (fuzzyResult.distance / Math.max(excerpt.length, 1)),
        };
    }

    // 6. No match found
    return {
        status: "missing",
        corrected_excerpt: null,
        reason: "No matching text found in chunk",
        similarity_score: 0,
    };
}

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

/**
 * Extract sentences from text
 */
function extractSentences(text: string): string[] {
    // Split on sentence boundaries
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences
        .map(s => s.trim())
        .filter(s => s.length >= 10); // Filter out very short segments
}

/**
 * Find the best matching sentence
 */
function findBestSentenceMatch(
    excerpt: string,
    sentences: string[],
    minSimilarity: number
): { sentence: string; similarity: number } | null {
    let bestMatch: { sentence: string; similarity: number } | null = null;

    for (const sentence of sentences) {
        const similarity = calculateSimilarity(excerpt, sentence);

        if (similarity >= minSimilarity) {
            if (!bestMatch || similarity > bestMatch.similarity) {
                bestMatch = { sentence, similarity };
            }
        }
    }

    return bestMatch;
}

/**
 * Calculate similarity between two strings using Jaccard coefficient
 */
function calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Find fuzzy substring match within maxDistance edits
 */
function fuzzySubstringMatch(
    needle: string,
    haystack: string,
    maxDistance: number
): { match: string; distance: number } | null {
    const needleLen = needle.length;

    // Sliding window approach
    for (let windowSize = needleLen; windowSize >= needleLen * 0.7; windowSize -= 5) {
        for (let i = 0; i <= haystack.length - windowSize; i++) {
            const window = haystack.substring(i, i + windowSize);
            const distance = levenshteinDistance(needle.toLowerCase(), window.toLowerCase());

            if (distance <= maxDistance) {
                return { match: window, distance };
            }
        }
    }

    return null;
}

// =============================================================================
// BATCH VERIFICATION
// =============================================================================

/**
 * Verify evidence for multiple cards
 */
export function verifyCardsEvidence(
    cards: Flashcard[],
    chunks: ContextChunk[],
    config?: VerificationConfig
): {
    results: CardVerificationResult[];
    summary: {
        total: number;
        verified: number;
        partial: number;
        failed: number;
        averageConfidence: number;
    };
} {
    const results = cards.map(card => verifyCardEvidence(card, chunks, config));

    const verified = results.filter(r => r.verified).length;
    const partial = results.filter(r => !r.verified && r.confidence >= 0.5).length;
    const failed = results.filter(r => !r.verified && r.confidence < 0.5).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / (results.length || 1);

    return {
        results,
        summary: {
            total: cards.length,
            verified,
            partial,
            failed,
            averageConfidence: avgConfidence,
        },
    };
}

/**
 * Apply corrections to cards
 */
export function applyCorrections(
    cards: Flashcard[],
    verificationResults: CardVerificationResult[]
): Flashcard[] {
    const resultMap = new Map(verificationResults.map(r => [r.card_id, r]));

    return cards.map(card => {
        const result = resultMap.get(card.card_id);
        if (!result) return card;

        const updatedEvidence = card.evidence.map((ev, i) => {
            const correction = result.corrections.find(c => c.evidence_index === i);
            if (correction?.status === "corrected" && correction.corrected_excerpt) {
                return { ...ev, excerpt: correction.corrected_excerpt };
            }
            return ev;
        });

        return {
            ...card,
            evidence: updatedEvidence,
            confidence_score: result.confidence,
            review_required: !result.verified || result.confidence < 0.8,
        };
    });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    normalizeWhitespace,
    extractSentences,
    calculateSimilarity,
    levenshteinDistance,
};
