/**
 * Evidence Verifier
 * 
 * Verifies that flashcard Q/A pairs are properly grounded in source evidence.
 * Checks for:
 * - Evidence presence and relevance
 * - Answer accuracy against evidence
 * - Hallucination detection
 * - Confidence scoring
 * 
 * Can run in:
 * - LLM mode: Uses Gemini for semantic verification
 * - Heuristic mode: Uses text similarity for fast checks
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { Counter, Histogram } from "prom-client";

// =============================================================================
// TYPES
// =============================================================================

export interface EvidenceItem {
    chunk_id: string;
    text: string;
    start_char?: number;
    end_char?: number;
}

export interface CardToVerify {
    question: string;
    answer: string;
    evidence: EvidenceItem[];
    rationale?: string;
}

export interface VerificationResult {
    verified: boolean;
    confidence: number;
    issues: string[];
    note: string;
    evidence_coverage: number;
    hallucination_risk: "low" | "medium" | "high";
}

export interface BatchVerificationResult {
    results: VerificationResult[];
    total_verified: number;
    total_failed: number;
    verification_rate: number;
    processing_time_ms: number;
}

// Schema for LLM response
const VerificationResponseSchema = z.object({
    is_supported: z.boolean(),
    confidence: z.number().min(0).max(1),
    issues: z.array(z.string()),
    evidence_coverage: z.enum(["full", "partial", "none"]),
    hallucination_detected: z.boolean(),
    explanation: z.string(),
});

type VerificationResponse = z.infer<typeof VerificationResponseSchema>;

// =============================================================================
// METRICS
// =============================================================================

export const verificationCallsTotal = new Counter({
    name: "flashcard_verification_calls_total",
    help: "Total verification calls",
    labelNames: ["mode", "result"],
});

export const verificationLatency = new Histogram({
    name: "flashcard_verification_latency_seconds",
    help: "Verification latency",
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const cardsVerifiedTotal = new Counter({
    name: "flashcard_cards_verified_total",
    help: "Total cards verified",
    labelNames: ["result"],
});

// =============================================================================
// PROMPTS
// =============================================================================

const VERIFICATION_SYSTEM_PROMPT = `You are an expert fact-checker for educational flashcards. Your task is to verify that a flashcard's answer is properly supported by the provided evidence.

Evaluate:
1. Is the answer factually supported by the evidence?
2. Are there any claims in the answer NOT supported by evidence (hallucination)?
3. How much of the answer is covered by the evidence?

Respond ONLY with valid JSON:
{
  "is_supported": true/false,
  "confidence": 0.0-1.0,
  "issues": ["List of specific issues if any"],
  "evidence_coverage": "full" | "partial" | "none",
  "hallucination_detected": true/false,
  "explanation": "Brief explanation of verification result"
}

Rules:
- is_supported = true only if the core claims in the answer are verified by evidence
- hallucination_detected = true if the answer contains claims not in evidence
- confidence reflects certainty in the verification
- Be strict: if in doubt, mark as unsupported`;

function buildVerificationPrompt(card: CardToVerify): string {
    const evidenceText = card.evidence.map((e, i) =>
        `Evidence ${i + 1} (from ${e.chunk_id}):\n"${e.text}"`
    ).join("\n\n");

    return `Verify this flashcard:

QUESTION: ${card.question}

ANSWER: ${card.answer}

EVIDENCE:
${evidenceText}

Is the answer properly supported by the evidence? Check for unsupported claims.`;
}

// =============================================================================
// HEURISTIC VERIFICATION
// =============================================================================

function calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

function verifyHeuristic(card: CardToVerify): VerificationResult {
    const issues: string[] = [];

    // Check if evidence exists
    if (!card.evidence || card.evidence.length === 0) {
        return {
            verified: false,
            confidence: 0.9,
            issues: ["No evidence provided"],
            note: "Card has no evidence to verify against",
            evidence_coverage: 0,
            hallucination_risk: "high",
        };
    }

    // Combine all evidence text
    const evidenceText = card.evidence.map(e => e.text).join(" ");

    // Check answer length
    if (card.answer.length < 20) {
        issues.push("Answer is too short");
    }

    // Calculate similarity between answer and evidence
    const similarity = calculateTextSimilarity(card.answer, evidenceText);

    // Check for key term overlap
    const answerWords = card.answer.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const evidenceWords = new Set(evidenceText.toLowerCase().split(/\s+/));
    const keyTermOverlap = answerWords.filter(w => evidenceWords.has(w)).length / Math.max(answerWords.length, 1);

    // Determine verification result
    const combinedScore = (similarity * 0.4) + (keyTermOverlap * 0.6);

    let verified = combinedScore > 0.3;
    let hallucinationRisk: "low" | "medium" | "high" = "low";

    if (combinedScore < 0.2) {
        hallucinationRisk = "high";
        issues.push("Low overlap between answer and evidence");
        verified = false;
    } else if (combinedScore < 0.4) {
        hallucinationRisk = "medium";
        issues.push("Moderate overlap, some claims may not be supported");
    }

    // Check for numeric claims in answer not in evidence
    const answerNumbers = card.answer.match(/\d+(\.\d+)?%?/g) || [];
    const evidenceNumbers = evidenceText.match(/\d+(\.\d+)?%?/g) || [];
    const evidenceNumberSet = new Set(evidenceNumbers);
    const unsupportedNumbers = answerNumbers.filter(n => !evidenceNumberSet.has(n));

    if (unsupportedNumbers.length > 0) {
        issues.push(`Numeric values not found in evidence: ${unsupportedNumbers.join(", ")}`);
        hallucinationRisk = "high";
        verified = false;
    }

    return {
        verified,
        confidence: 0.7 + (combinedScore * 0.2),
        issues,
        note: verified
            ? `Answer adequately supported (similarity: ${(combinedScore * 100).toFixed(0)}%)`
            : `Insufficient evidence support (similarity: ${(combinedScore * 100).toFixed(0)}%)`,
        evidence_coverage: combinedScore,
        hallucination_risk: hallucinationRisk,
    };
}

// =============================================================================
// LLM VERIFICATION
// =============================================================================

async function verifyWithLLM(card: CardToVerify): Promise<VerificationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[Verifier] No GEMINI_API_KEY, falling back to heuristic verification");
        return verifyHeuristic(card);
    }

    try {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 512,
            },
        });

        // Build prompt - combine system prompt with user content
        const userPrompt = buildVerificationPrompt(card);
        const fullPrompt = `${VERIFICATION_SYSTEM_PROMPT}\n\n${userPrompt}`;

        // Call LLM with retry logic for rate limiting
        const { withRetryThrow, GEMINI_RETRY_OPTIONS } = await import("../utils/retry");

        const result = await withRetryThrow(
            () => model.generateContent(fullPrompt),
            {
                ...GEMINI_RETRY_OPTIONS,
                maxRetries: 3, // Fewer retries for verification since it's less critical
                onRetry: (attempt, error, delayMs) => {
                    console.log(`[Verifier] Retry attempt ${attempt} in ${delayMs}ms - ${error.message?.substring(0, 80)}`);
                },
            }
        );

        const responseText = result.response.text();

        // Parse response
        const cleanedResponse = responseText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
        const parsed = JSON.parse(cleanedResponse);

        // Validate
        const validated = VerificationResponseSchema.safeParse(parsed);
        if (!validated.success) {
            console.warn("[Verifier] Schema validation failed, falling back to heuristic");
            return verifyHeuristic(card);
        }

        const response = validated.data;

        // Map coverage to numeric
        const coverageMap: Record<string, number> = {
            "full": 1.0,
            "partial": 0.5,
            "none": 0,
        };

        return {
            verified: response.is_supported && !response.hallucination_detected,
            confidence: response.confidence,
            issues: response.issues,
            note: response.explanation,
            evidence_coverage: coverageMap[response.evidence_coverage] || 0,
            hallucination_risk: response.hallucination_detected ? "high" :
                response.evidence_coverage === "partial" ? "medium" : "low",
        };

    } catch (error) {
        console.error("[Verifier] LLM verification failed:", error);
        return verifyHeuristic(card);
    }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Verify a single card's evidence
 */
export async function verifyCardEvidence(
    card: CardToVerify,
    mode: "llm" | "heuristic" = "heuristic"
): Promise<VerificationResult> {
    const timer = verificationLatency.startTimer();

    try {
        let result: VerificationResult;

        if (mode === "llm") {
            result = await verifyWithLLM(card);
            verificationCallsTotal.inc({ mode: "llm", result: result.verified ? "pass" : "fail" });
        } else {
            result = verifyHeuristic(card);
            verificationCallsTotal.inc({ mode: "heuristic", result: result.verified ? "pass" : "fail" });
        }

        cardsVerifiedTotal.inc({ result: result.verified ? "verified" : "failed" });
        timer();

        return result;

    } catch (error) {
        timer();
        console.error("[Verifier] Error:", error);

        return {
            verified: false,
            confidence: 0,
            issues: ["Verification failed due to error"],
            note: error instanceof Error ? error.message : "Unknown error",
            evidence_coverage: 0,
            hallucination_risk: "high",
        };
    }
}

/**
 * Verify multiple cards in batch
 */
export async function verifyCardsBatch(
    cards: CardToVerify[],
    mode: "llm" | "heuristic" = "heuristic"
): Promise<BatchVerificationResult> {
    const startTime = Date.now();
    const results: VerificationResult[] = [];

    console.log(`[Verifier] Verifying ${cards.length} cards in ${mode} mode`);

    for (const card of cards) {
        const result = await verifyCardEvidence(card, mode);
        results.push(result);
    }

    const verified = results.filter(r => r.verified).length;
    const failed = results.filter(r => !r.verified).length;

    console.log(`[Verifier] Completed: ${verified} verified, ${failed} failed`);

    return {
        results,
        total_verified: verified,
        total_failed: failed,
        verification_rate: cards.length > 0 ? verified / cards.length : 0,
        processing_time_ms: Date.now() - startTime,
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    verifyCardEvidence,
    verifyCardsBatch,
};
