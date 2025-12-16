/**
 * Unit Tests for StageB - Flashcard Generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the GoogleGenerativeAI
vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        cards: [
                            {
                                question: "What is Human Resources Management?",
                                answer: "Human Resources Management (HRM) is the strategic approach to the effective management of people in an organization, involving recruiting, training, and developing employees.",
                                rationale: "Tests understanding of basic HRM definition",
                                evidence_quote: "Human Resources Management (HRM) is the strategic approach to the effective management of people",
                                bloom_level: "Understand",
                                difficulty: "easy",
                                confidence: 0.92
                            },
                            {
                                question: "How does talent acquisition differ from traditional recruitment?",
                                answer: "Talent acquisition takes a long-term view and focuses on building a pipeline of future talent, whereas traditional recruitment is typically reactive and immediate.",
                                rationale: "Tests comparison skills between concepts",
                                evidence_quote: "Unlike traditional recruitment, it takes a long-term view",
                                bloom_level: "Analyze",
                                difficulty: "medium",
                                confidence: 0.88
                            }
                        ]
                    })
                }
            })
        })
    }))
}));

// Import after mocking
import { runStageB, runStageBMock, type Chunk, type StageBOutput, type GeneratedCard } from "../../server/services/flashcard/orchestrator/stageB";

describe("StageB - Flashcard Generation", () => {
    const sampleChunks: Chunk[] = [
        {
            chunk_id: "chunk-001",
            text: "Human Resources Management (HRM) is the strategic approach to the effective management of people in an organization. It involves recruiting, training, and developing employees while ensuring compliance with labor laws.",
            source_file: "hr_intro.pdf",
            provider: "local",
            slide_or_page: 1,
            heading: "Introduction",
            tokens_est: 40,
        },
        {
            chunk_id: "chunk-002",
            text: "Talent acquisition is a strategic approach to identifying, attracting, and hiring qualified candidates. Unlike traditional recruitment, it takes a long-term view and focuses on building a pipeline of future talent.",
            source_file: "hr_intro.pdf",
            provider: "local",
            slide_or_page: 2,
            heading: "Talent Acquisition",
            tokens_est: 38,
        },
    ];

    const sampleLearningObjectives = [
        "Understand the core principles of Human Resources Management",
        "Differentiate between talent acquisition and recruitment",
    ];

    describe("runStageBMock", () => {
        it("should return valid StageBOutput structure", () => {
            const result = runStageBMock(sampleChunks, "mod-test-001", sampleLearningObjectives);

            expect(result).toHaveProperty("module_id", "mod-test-001");
            expect(result).toHaveProperty("cards");
            expect(result).toHaveProperty("generated_count");
            expect(result).toHaveProperty("processing_time_ms");
            expect(result).toHaveProperty("warnings");
        });

        it("should generate cards with required fields", () => {
            const result = runStageBMock(sampleChunks, "mod-test-001", sampleLearningObjectives);

            expect(result.cards.length).toBeGreaterThan(0);

            const card = result.cards[0];
            expect(card).toHaveProperty("card_id");
            expect(card).toHaveProperty("question");
            expect(card).toHaveProperty("answer");
            expect(card).toHaveProperty("evidence");
            expect(card).toHaveProperty("bloom_level");
            expect(card).toHaveProperty("difficulty");
            expect(card).toHaveProperty("confidence_score");
            expect(card).toHaveProperty("sources");
        });

        it("should link cards to source chunks", () => {
            const result = runStageBMock(sampleChunks, "mod-test-001", sampleLearningObjectives);

            const card = result.cards[0];
            expect(card.evidence.length).toBeGreaterThan(0);
            expect(card.evidence[0]).toHaveProperty("chunk_id");
            expect(card.evidence[0]).toHaveProperty("text");
        });

        it("should respect target card count", () => {
            const result = runStageBMock(sampleChunks, "mod-test-001", sampleLearningObjectives, 5);

            expect(result.generated_count).toBeLessThanOrEqual(5);
        });

        it("should assign valid Bloom levels", () => {
            const result = runStageBMock(sampleChunks, "mod-test-001", sampleLearningObjectives);
            const validLevels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

            for (const card of result.cards) {
                expect(validLevels).toContain(card.bloom_level);
            }
        });

        it("should assign valid difficulty levels", () => {
            const result = runStageBMock(sampleChunks, "mod-test-001", sampleLearningObjectives);
            const validDifficulties = ["easy", "medium", "hard"];

            for (const card of result.cards) {
                expect(validDifficulties).toContain(card.difficulty);
            }
        });

        it("should include source file information", () => {
            const result = runStageBMock(sampleChunks, "mod-test-001", sampleLearningObjectives);

            const card = result.cards[0];
            expect(card.sources.length).toBeGreaterThan(0);
            expect(card.sources[0]).toHaveProperty("file");
        });
    });

    describe("runStageB (with mocked LLM)", () => {
        beforeEach(() => {
            vi.stubEnv("GEMINI_API_KEY", "test-api-key");
        });

        it("should call LLM and return parsed cards", async () => {
            const result = await runStageB(sampleChunks, "mod-test-001", sampleLearningObjectives);

            expect(result.cards.length).toBeGreaterThan(0);
            expect(result.module_id).toBe("mod-test-001");
        });

        it("should match evidence to chunks", async () => {
            const result = await runStageB(sampleChunks, "mod-test-001", sampleLearningObjectives);

            for (const card of result.cards) {
                expect(card.evidence.length).toBeGreaterThan(0);
                expect(card.evidence[0].chunk_id).toBeTruthy();
            }
        });

        it("should set confidence scores", async () => {
            const result = await runStageB(sampleChunks, "mod-test-001", sampleLearningObjectives);

            for (const card of result.cards) {
                expect(card.confidence_score).toBeGreaterThanOrEqual(0);
                expect(card.confidence_score).toBeLessThanOrEqual(1);
            }
        });
    });

    describe("error handling", () => {
        it("should throw error when no chunks provided", async () => {
            await expect(runStageB([], "mod-test-001", [])).rejects.toThrow("StageB requires at least one chunk");
        });
    });
});
