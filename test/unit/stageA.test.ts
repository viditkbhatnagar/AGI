/**
 * Unit Tests for StageA - Content Summarization & Learning Objective Extraction
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the GoogleGenerativeAI
vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        summary: "This module covers the fundamentals of Human Resources Management including talent acquisition, performance management, and employee engagement. Key concepts include organizational culture and its impact on employee satisfaction.",
                        learning_objectives: [
                            "Understand the core principles of Human Resources Management",
                            "Apply talent acquisition strategies to hiring scenarios",
                            "Analyze the relationship between culture and employee retention"
                        ],
                        key_terms: ["HRM", "Talent Acquisition", "Performance Management", "Organizational Culture"],
                        content_themes: ["HR Fundamentals", "Employee Management"],
                        estimated_difficulty: "intermediate"
                    })
                }
            })
        })
    }))
}));

// Import after mocking
import { runStageA, runStageAMock, type Chunk, type StageAOutput } from "../../server/services/flashcard/orchestrator/stageA";

describe("StageA - Content Summarization", () => {
    const sampleChunks: Chunk[] = [
        {
            chunk_id: "chunk-001",
            text: "Human Resources Management (HRM) is the strategic approach to the effective management of people in an organization. It involves recruiting, training, and developing employees.",
            source_file: "hr_intro.pdf",
            provider: "local",
            slide_or_page: 1,
            heading: "Introduction",
            tokens_est: 30,
        },
        {
            chunk_id: "chunk-002",
            text: "Talent acquisition is a strategic approach to identifying, attracting, and hiring qualified candidates. Unlike traditional recruitment, it takes a long-term view.",
            source_file: "hr_intro.pdf",
            provider: "local",
            slide_or_page: 2,
            heading: "Talent Acquisition",
            tokens_est: 28,
        },
        {
            chunk_id: "chunk-003",
            text: "Organizational culture refers to shared values, beliefs, and behaviors. A positive culture improves employee satisfaction and retention.",
            source_file: "hr_intro.pdf",
            provider: "local",
            slide_or_page: 3,
            heading: "Culture",
            tokens_est: 24,
        },
    ];

    describe("runStageAMock", () => {
        it("should return valid StageAOutput structure", () => {
            const result = runStageAMock(sampleChunks, "mod-test-001", "HR Introduction");

            expect(result).toHaveProperty("module_id", "mod-test-001");
            expect(result).toHaveProperty("summaries");
            expect(result).toHaveProperty("learning_objectives");
            expect(result).toHaveProperty("key_terms");
            expect(result).toHaveProperty("content_themes");
            expect(result).toHaveProperty("estimated_difficulty");
            expect(result).toHaveProperty("chunk_count");
            expect(result).toHaveProperty("processing_time_ms");
        });

        it("should generate learning objectives", () => {
            const result = runStageAMock(sampleChunks, "mod-test-001");

            expect(result.learning_objectives.length).toBeGreaterThanOrEqual(2);
            expect(result.learning_objectives.length).toBeLessThanOrEqual(10);
        });

        it("should extract key terms from content", () => {
            const result = runStageAMock(sampleChunks, "mod-test-001");

            expect(result.key_terms.length).toBeGreaterThanOrEqual(1);
        });

        it("should track chunk count correctly", () => {
            const result = runStageAMock(sampleChunks, "mod-test-001");

            expect(result.chunk_count).toBe(sampleChunks.length);
        });

        it("should set processing time", () => {
            const result = runStageAMock(sampleChunks, "mod-test-001");

            expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
        });
    });

    describe("runStageA (with mocked LLM)", () => {
        beforeEach(() => {
            vi.stubEnv("GEMINI_API_KEY", "test-api-key");
        });

        it("should call LLM and return parsed output", async () => {
            const result = await runStageA(sampleChunks, "mod-test-001", "HR Introduction");

            expect(result).toHaveProperty("module_id", "mod-test-001");
            expect(result.learning_objectives.length).toBeGreaterThanOrEqual(2);
            expect(result.key_terms.length).toBeGreaterThanOrEqual(1);
        });

        it("should include summary in output", async () => {
            const result = await runStageA(sampleChunks, "mod-test-001");

            expect(result.summaries.length).toBeGreaterThanOrEqual(1);
            expect(result.summaries[0].length).toBeGreaterThan(50);
        });

        it("should set difficulty level", async () => {
            const result = await runStageA(sampleChunks, "mod-test-001");

            expect(["beginner", "intermediate", "advanced"]).toContain(result.estimated_difficulty);
        });
    });

    describe("error handling", () => {
        it("should throw error when no chunks provided", async () => {
            await expect(runStageA([], "mod-test-001")).rejects.toThrow("StageA requires at least one chunk");
        });
    });
});
