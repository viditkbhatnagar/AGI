/**
 * Orchestrator Job Status Endpoint Tests
 * 
 * Tests for GET /api/flashcards/orchestrator/jobs/:job_id
 * 
 * Run: npm run test:run -- test/api/orchestrator.status.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response } from "express";
import { getJobStatus } from "../../server/services/flashcard/controllers/orchestratorController";

// =============================================================================
// MOCKS
// =============================================================================

const mockGetJobById = vi.fn();
const mockGetLogUrl = vi.fn().mockResolvedValue("https://logs.example.com/job-123");

vi.mock("../../server/services/flashcard/queue", () => ({
    getJobById: mockGetJobById,
}));

vi.mock("../../server/services/flashcard/queue/jobLogger", () => ({
    getLogUrl: mockGetLogUrl,
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockRequest(params: object, user?: object): Partial<Request> {
    return {
        params: params as any,
        user: user || { id: "test-user", role: "user" },
    } as Partial<Request>;
}

function createMockResponse(): {
    res: Partial<Response>;
    statusCode: number | null;
    jsonBody: unknown;
    headers: Record<string, string>;
} {
    let statusCode: number | null = 200;
    let jsonBody: unknown = null;
    const headers: Record<string, string> = {};

    const res: Partial<Response> = {
        status: vi.fn().mockImplementation((code: number) => {
            statusCode = code;
            return res;
        }),
        json: vi.fn().mockImplementation((body: unknown) => {
            jsonBody = body;
            return res;
        }),
        set: vi.fn().mockImplementation((name: string, value: string) => {
            headers[name] = value;
            return res;
        }),
    };

    return { res, get statusCode() { return statusCode; }, get jsonBody() { return jsonBody; }, headers };
}

// =============================================================================
// TESTS
// =============================================================================

describe("GET /api/flashcards/orchestrator/jobs/:job_id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Validation", () => {
        it("should return 400 for missing job_id", async () => {
            const req = createMockRequest({});
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(statusCode).toBe(400);
            expect(jsonBody).toHaveProperty("error", "job_id is required");
        });

        it("should return 404 for non-existent job", async () => {
            mockGetJobById.mockResolvedValue(null);

            const req = createMockRequest({ job_id: "non-existent" });
            const { res, statusCode, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(statusCode).toBe(404);
            expect(jsonBody).toHaveProperty("error", "Job not found");
        });
    });

    describe("Job States", () => {
        it("should return pending status for waiting job", async () => {
            mockGetJobById.mockResolvedValue({
                state: "waiting",
                progress: 0,
                timestamp: Date.now(),
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody, headers } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(jsonBody).toMatchObject({
                jobId: "job-123",
                status: "pending",
            });
            expect(headers["Cache-Control"]).toBe("no-cache, no-store, must-revalidate");
        });

        it("should return active status with progress", async () => {
            mockGetJobById.mockResolvedValue({
                state: "active",
                progress: 45,
                timestamp: Date.now(),
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(jsonBody).toMatchObject({
                jobId: "job-123",
                status: "active",
                progress: 45,
            });
        });

        it("should return completed status with result", async () => {
            mockGetJobById.mockResolvedValue({
                state: "completed",
                progress: 100,
                timestamp: Date.now(),
                returnvalue: {
                    generated_count: 15,
                    verified_count: 12,
                    deck_id: "deck-xyz",
                    warnings: ["Low token budget warning"],
                },
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(jsonBody).toMatchObject({
                jobId: "job-123",
                status: "completed",
                result: {
                    generated_count: 15,
                    verified_count: 12,
                    deck_id: "deck-xyz",
                    warnings: expect.any(Array),
                },
            });
            expect((jsonBody as any).completed_at).toBeDefined();
        });

        it("should return failed status with error message", async () => {
            mockGetJobById.mockResolvedValue({
                state: "failed",
                progress: 25,
                timestamp: Date.now(),
                failedReason: "LLM API timeout",
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(jsonBody).toMatchObject({
                jobId: "job-123",
                status: "failed",
                error: "LLM API timeout",
            });
        });

        it("should map delayed state to pending", async () => {
            mockGetJobById.mockResolvedValue({
                state: "delayed",
                progress: 0,
                timestamp: Date.now(),
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect((jsonBody as any).status).toBe("pending");
        });
    });

    describe("Logs URL Access", () => {
        it("should include logs_url for admin users on completed job", async () => {
            mockGetJobById.mockResolvedValue({
                state: "completed",
                progress: 100,
                timestamp: Date.now(),
                returnvalue: {
                    generated_count: 10,
                    verified_count: 10,
                    deck_id: "deck-123",
                    warnings: [],
                },
            });

            const req = createMockRequest(
                { job_id: "job-123" },
                { id: "admin-user", role: "admin" }
            );
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect((jsonBody as any).logs_url).toBe("https://logs.example.com/job-123");
        });

        it("should NOT include logs_url for non-admin users", async () => {
            mockGetJobById.mockResolvedValue({
                state: "completed",
                progress: 100,
                timestamp: Date.now(),
                returnvalue: {
                    generated_count: 10,
                    verified_count: 10,
                    deck_id: "deck-123",
                    warnings: [],
                },
            });

            const req = createMockRequest(
                { job_id: "job-123" },
                { id: "regular-user", role: "user" }
            );
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect((jsonBody as any).logs_url).toBeUndefined();
        });
    });

    describe("Response Format", () => {
        it("should include created_at timestamp", async () => {
            const timestamp = Date.now();
            mockGetJobById.mockResolvedValue({
                state: "active",
                progress: 50,
                timestamp,
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect((jsonBody as any).created_at).toBeDefined();
            expect(new Date((jsonBody as any).created_at).getTime()).toBe(timestamp);
        });

        it("should set correct cache headers for polling", async () => {
            mockGetJobById.mockResolvedValue({
                state: "active",
                progress: 30,
                timestamp: Date.now(),
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, headers } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(headers["Cache-Control"]).toBe("no-cache, no-store, must-revalidate");
        });
    });

    describe("Edge Cases", () => {
        it("should handle job with no progress", async () => {
            mockGetJobById.mockResolvedValue({
                state: "waiting",
                timestamp: Date.now(),
                // No progress field
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody, statusCode } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect(statusCode).toBe(200);
            expect((jsonBody as any).progress).toBeUndefined();
        });

        it("should handle failed job with no reason", async () => {
            mockGetJobById.mockResolvedValue({
                state: "failed",
                timestamp: Date.now(),
                // No failedReason
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect((jsonBody as any).error).toBe("Unknown error");
        });

        it("should handle completed job with empty result", async () => {
            mockGetJobById.mockResolvedValue({
                state: "completed",
                timestamp: Date.now(),
                returnvalue: {},
            });

            const req = createMockRequest({ job_id: "job-123" });
            const { res, jsonBody } = createMockResponse();
            const next = vi.fn();

            await getJobStatus(req as Request, res as Response, next);

            expect((jsonBody as any).result).toMatchObject({
                generated_count: 0,
                verified_count: 0,
                deck_id: "",
                warnings: [],
            });
        });
    });
});
