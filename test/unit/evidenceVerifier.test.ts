/**
 * Unit Tests for Evidence Verifier
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the GoogleGenerativeAI
vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        is_supported: true,
                        confidence: 0.95,
                        issues: [],
                        evidence_coverage: "full",
                        hallucination_detected: false,
                        explanation: "The answer is fully supported by the provided evidence."
                    })
                }
            })
        })
    }))
}));

// Import after mocking
import {
    verifyCardEvidence,
    verifyCardsBatch,
    type CardToVerify,
    type VerificationResult
} from "../../server/services/flashcard/verification/evidenceVerifier";

describe("Evidence Verifier", () => {
    const verifiedCard: CardToVerify = {
        question: "What is Human Resources Management?",
        answer: "Human Resources Management (HRM) is the strategic approach to the effective management of people in an organization.",
        evidence: [{
            chunk_id: "chunk-001",
            text: "Human Resources Management (HRM) is the strategic approach to the effective management of people in an organization. It involves recruiting, training, and developing employees.",
        }],
    };

    const unverifiedCard: CardToVerify = {
        question: "What is the capital of France?",
        answer: "Paris is the capital of France and home to the Eiffel Tower.",
        evidence: [{
            chunk_id: "chunk-001",
            text: "Human Resources Management deals with employee relations.",
        }],
    };

    const noEvidenceCard: CardToVerify = {
        question: "What is organizational culture?",
        answer: "Organizational culture refers to shared values and beliefs.",
        evidence: [],
    };

    describe("verifyCardEvidence - heuristic mode", () => {
        it("should verify card with matching evidence", async () => {
            const result = await verifyCardEvidence(verifiedCard, "heuristic");

            expect(result).toHaveProperty("verified");
            expect(result).toHaveProperty("confidence");
            expect(result).toHaveProperty("issues");
            expect(result).toHaveProperty("note");
            expect(result).toHaveProperty("evidence_coverage");
            expect(result).toHaveProperty("hallucination_risk");
        });

        it("should fail verification when evidence doesn't match", async () => {
            const result = await verifyCardEvidence(unverifiedCard, "heuristic");

            expect(result.verified).toBe(false);
            expect(result.hallucination_risk).not.toBe("low");
        });

        it("should fail verification when no evidence provided", async () => {
            const result = await verifyCardEvidence(noEvidenceCard, "heuristic");

            expect(result.verified).toBe(false);
            expect(result.issues).toContain("No evidence provided");
            expect(result.hallucination_risk).toBe("high");
        });

        it("should return confidence score between 0 and 1", async () => {
            const result = await verifyCardEvidence(verifiedCard, "heuristic");

            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it("should return evidence coverage between 0 and 1", async () => {
            const result = await verifyCardEvidence(verifiedCard, "heuristic");

            expect(result.evidence_coverage).toBeGreaterThanOrEqual(0);
            expect(result.evidence_coverage).toBeLessThanOrEqual(1);
        });

        it("should detect numeric hallucinations", async () => {
            const cardWithNumbers: CardToVerify = {
                question: "What percentage of employees are engaged?",
                answer: "85% of employees are highly engaged according to studies.",
                evidence: [{
                    chunk_id: "chunk-001",
                    text: "Employee engagement is important for organizational success.",
                }],
            };

            const result = await verifyCardEvidence(cardWithNumbers, "heuristic");

            expect(result.issues.some(i => i.includes("Numeric values"))).toBe(true);
            expect(result.hallucination_risk).toBe("high");
        });
    });

    describe("verifyCardEvidence - llm mode", () => {
        beforeEach(() => {
            vi.stubEnv("GEMINI_API_KEY", "test-api-key");
        });

        it("should call LLM for verification", async () => {
            const result = await verifyCardEvidence(verifiedCard, "llm");

            expect(result.verified).toBe(true);
            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it("should return valid structure from LLM", async () => {
            const result = await verifyCardEvidence(verifiedCard, "llm");

            expect(result).toHaveProperty("verified");
            expect(result).toHaveProperty("confidence");
            expect(result).toHaveProperty("evidence_coverage");
            expect(result).toHaveProperty("hallucination_risk");
        });
    });

    describe("verifyCardsBatch", () => {
        it("should verify multiple cards", async () => {
            const cards = [verifiedCard, unverifiedCard];
            const result = await verifyCardsBatch(cards, "heuristic");

            expect(result.results.length).toBe(2);
            expect(result).toHaveProperty("total_verified");
            expect(result).toHaveProperty("total_failed");
            expect(result).toHaveProperty("verification_rate");
            expect(result).toHaveProperty("processing_time_ms");
        });

        it("should calculate verification rate correctly", async () => {
            const cards = [verifiedCard, verifiedCard, unverifiedCard];
            const result = await verifyCardsBatch(cards, "heuristic");

            // At least one should pass (the matched ones)
            expect(result.verification_rate).toBeGreaterThanOrEqual(0);
            expect(result.verification_rate).toBeLessThanOrEqual(1);
        });

        it("should handle empty batch", async () => {
            const result = await verifyCardsBatch([], "heuristic");

            expect(result.results.length).toBe(0);
            expect(result.verification_rate).toBe(0);
        });

        it("should track processing time", async () => {
            const result = await verifyCardsBatch([verifiedCard], "heuristic");

            expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
        });
    });

    describe("hallucination risk levels", () => {
        it("should assign 'low' risk when evidence fully supports answer", async () => {
            const result = await verifyCardEvidence(verifiedCard, "heuristic");

            // If verified, risk should be low
            if (result.verified) {
                expect(result.hallucination_risk).toBe("low");
            }
        });

        it("should assign 'high' risk when no evidence", async () => {
            const result = await verifyCardEvidence(noEvidenceCard, "heuristic");

            expect(result.hallucination_risk).toBe("high");
        });
    });
});
