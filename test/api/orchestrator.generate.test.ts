/**
 * Orchestrator Generate Endpoint Tests
 * 
 * Tests for POST /api/flashcards/orchestrator/generate
 * 
 * Run: npm run test:run -- test/api/orchestrator.generate.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response } from "express";
import {
    enqueueGenerateJob,
    GenerateJobSchema,
} from "../../server/services/flashcard/controllers/orchestratorController";

// =============================================================================
// MOCKS
// =============================================================================

const mockEnqueueModuleJob = vi.fn().mockResolvedValue({ id: "job-123" });
const mockStartJobLog = vi.fn();
const mockAddLogEntry = vi.fn();

vi.mock("../../server/services/flashcard/queue", () => ({
    enqueueModuleJob: mockEnqueueModuleJob,
}));

vi.mock("../../server/services/flashcard/queue/jobLogger", () => ({
    startJobLog: mockStartJobLog,
    addLogEntry: mockAddLogEntry,
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockRequest(body: unknown, user?: object): Partial<Request> {
    return {
        body,
        user: user || { id: "test-user", role: "user" },
    } as Partial<Request>;
}

function createMockResponse(): {
    res: Partial<Response>;
    statusCode: number | null;
    jsonBody: unknown;
} {
    let statusCode: number | null = null;
    let jsonBody: unknown = null;

    const res: Partial<Response> = {
        status: vi.fn().mockImplementation((code: number) => {
            statusCode = code;
            return res;
        }),
        json: vi.fn().mockImplementation((body: unknown) => {
            jsonBody = body;
            return res;
        }),
    };

    return { res, get statusCode() { return statusCode; }, get jsonBody() { return jsonBody; } };
}

// =============================================================================
// TESTS
// =============================================================================

describe("POST /api/flashcards/orchestrator/generate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Validation", () => {
        it("should return 400 for empty body", async () => {
            const req = createMockRequest({});
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(400);
            expect(jsonBody).toHaveProperty("error", "Validation failed");
        });

        it("should return 400 for invalid mode", async () => {
            const req = createMockRequest({
                mode: "invalid_mode",
                target: {},
            });
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(400);
            expect(jsonBody).toHaveProperty("error", "Validation failed");
        });

        it("should return 400 when single_module mode lacks module_id", async () => {
            const req = createMockRequest({
                mode: "single_module",
                target: {},
            });
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(400);
            expect(jsonBody).toHaveProperty("error", "Validation failed");
        });

        it("should return 400 when course mode lacks course_id", async () => {
            const req = createMockRequest({
                mode: "course",
                target: {},
            });
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(400);
        });
    });

    describe("Successful Enqueue", () => {
        it("should return 202 with jobId for valid single_module request", async () => {
            const req = createMockRequest({
                mode: "single_module",
                target: { module_id: "mod-123" },
            });
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(202);
            expect(jsonBody).toHaveProperty("jobId");
            expect(jsonBody).toHaveProperty("statusUrl");
            expect((jsonBody as any).statusUrl).toMatch(/\/api\/flashcards\/orchestrator\/jobs\//);
        });

        it("should return 202 for valid course request", async () => {
            const req = createMockRequest({
                mode: "course",
                target: { course_id: "course-456" },
            });
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(202);
            expect(jsonBody).toHaveProperty("jobId");
        });

        it("should return 202 for all_courses mode", async () => {
            const req = createMockRequest({
                mode: "all_courses",
                target: {},
            });
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(202);
        });

        it("should call enqueueModuleJob with correct payload", async () => {
            const req = createMockRequest({
                mode: "single_module",
                target: { module_id: "mod-hr-101" },
                settings: { card_count: 15 },
            });
            const { res } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(mockEnqueueModuleJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    module_id: "mod-hr-101",
                    mode: "single_module",
                    settings: expect.objectContaining({
                        card_count: 15,
                        triggered_by: "api",
                    }),
                })
            );
        });

        it("should start job log with correct parameters", async () => {
            const req = createMockRequest({
                mode: "single_module",
                target: { module_id: "mod-test" },
            });
            const { res } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(mockStartJobLog).toHaveBeenCalledWith(
                expect.any(String),
                "mod-test"
            );
        });

        it("should include user_id in settings", async () => {
            const req = createMockRequest(
                {
                    mode: "single_module",
                    target: { module_id: "mod-test" },
                },
                { id: "user-xyz", role: "user" }
            );
            const { res } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(mockEnqueueModuleJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({
                        user_id: "user-xyz",
                    }),
                })
            );
        });
    });

    describe("Settings Validation", () => {
        it("should accept valid settings", async () => {
            const req = createMockRequest({
                mode: "single_module",
                target: { module_id: "mod-test" },
                settings: {
                    regenerate: true,
                    card_count: 20,
                    difficulty: "hard",
                    bloom_levels: ["analyze", "evaluate"],
                },
            });
            const { res, statusCode } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(202);
        });

        it("should reject card_count over 100", async () => {
            const req = createMockRequest({
                mode: "single_module",
                target: { module_id: "mod-test" },
                settings: { card_count: 150 },
            });
            const { res, statusCode } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(400);
        });

        it("should reject invalid difficulty", async () => {
            const req = createMockRequest({
                mode: "single_module",
                target: { module_id: "mod-test" },
                settings: { difficulty: "impossible" },
            });
            const { res, statusCode } = createMockResponse();
            const next = vi.fn();

            await enqueueGenerateJob(req as Request, res as Response, next);

            expect(statusCode).toBe(400);
        });
    });
});

// =============================================================================
// SCHEMA TESTS
// =============================================================================

describe("GenerateJobSchema", () => {
    it("should validate correct single_module request", () => {
        const result = GenerateJobSchema.safeParse({
            mode: "single_module",
            target: { module_id: "mod-123" },
        });

        expect(result.success).toBe(true);
    });

    it("should validate correct course request", () => {
        const result = GenerateJobSchema.safeParse({
            mode: "course",
            target: { course_id: "course-456" },
        });

        expect(result.success).toBe(true);
    });

    it("should validate all_courses without target ids", () => {
        const result = GenerateJobSchema.safeParse({
            mode: "all_courses",
            target: {},
        });

        expect(result.success).toBe(true);
    });

    it("should fail when single_module lacks module_id", () => {
        const result = GenerateJobSchema.safeParse({
            mode: "single_module",
            target: { course_id: "course-123" },
        });

        expect(result.success).toBe(false);
    });

    it("should validate settings object", () => {
        const result = GenerateJobSchema.safeParse({
            mode: "single_module",
            target: { module_id: "mod-123" },
            settings: {
                regenerate: true,
                force_all: false,
                card_count: 25,
                difficulty: "mixed",
                bloom_levels: ["remember", "understand"],
            },
        });

        expect(result.success).toBe(true);
    });
});
