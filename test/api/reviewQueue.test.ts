/**
 * Review Queue & Admin Endpoints Tests
 * 
 * Tests for admin review queue, approve, and edit endpoints.
 * 
 * Run: npm run test:run -- test/api/reviewQueue.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response } from "express";
import {
    getReviewQueue,
    approveCard,
    editCard,
} from "../../server/services/flashcard/controllers/orchestratorController";

// =============================================================================
// MOCKS
// =============================================================================

const mockGetCardsNeedingReview = vi.fn();
const mockGetCardById = vi.fn();
const mockUpdateCard = vi.fn();
const mockVerifyCardEvidence = vi.fn();
const mockAddLogEntry = vi.fn();

vi.mock("../../server/services/flashcard/persistence/dbDeckStore", () => ({
    dbDeckStore: {
        getCardsNeedingReview: mockGetCardsNeedingReview,
        getCardById: mockGetCardById,
        updateCard: mockUpdateCard,
    },
}));

vi.mock("../../server/services/flashcard/verification/evidenceVerifier", () => ({
    verifyCardEvidence: mockVerifyCardEvidence,
}));

vi.mock("../../server/services/flashcard/queue/jobLogger", () => ({
    addLogEntry: mockAddLogEntry,
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockRequest(
    params: object = {},
    query: object = {},
    body: object = {},
    user?: object
): Partial<Request> {
    return {
        params: params as any,
        query: query as any,
        body,
        user: user || { id: "test-user", role: "user" },
    } as Partial<Request>;
}

function createMockResponse(): {
    res: Partial<Response>;
    statusCode: number | null;
    jsonBody: unknown;
} {
    let statusCode: number | null = 200;
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
// REVIEW QUEUE TESTS
// =============================================================================

describe("GET /api/flashcards/review-queue", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return paginated review queue", async () => {
        mockGetCardsNeedingReview.mockResolvedValue({
            cards: [
                { card_id: "card-1", question: "Q1", answer: "A1", review_required: true },
                { card_id: "card-2", question: "Q2", answer: "A2", review_required: true },
            ],
            total: 25,
        });

        const req = createMockRequest({}, { page: "1", limit: "10" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getReviewQueue(req as Request, res as Response, next);

        expect(jsonBody).toMatchObject({
            cards: expect.any(Array),
            total: 25,
            page: 1,
            limit: 10,
            has_more: true,
        });
        expect((jsonBody as any).cards).toHaveLength(2);
    });

    it("should filter by module_id", async () => {
        mockGetCardsNeedingReview.mockResolvedValue({ cards: [], total: 0 });

        const req = createMockRequest({}, { module_id: "mod-hr-101" });
        const { res } = createMockResponse();
        const next = vi.fn();

        await getReviewQueue(req as Request, res as Response, next);

        expect(mockGetCardsNeedingReview).toHaveBeenCalledWith(
            expect.objectContaining({ module_id: "mod-hr-101" })
        );
    });

    it("should filter by course_id", async () => {
        mockGetCardsNeedingReview.mockResolvedValue({ cards: [], total: 0 });

        const req = createMockRequest({}, { course_id: "course-123" });
        const { res } = createMockResponse();
        const next = vi.fn();

        await getReviewQueue(req as Request, res as Response, next);

        expect(mockGetCardsNeedingReview).toHaveBeenCalledWith(
            expect.objectContaining({ course_id: "course-123" })
        );
    });

    it("should handle empty queue", async () => {
        mockGetCardsNeedingReview.mockResolvedValue({ cards: [], total: 0 });

        const req = createMockRequest({}, {});
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getReviewQueue(req as Request, res as Response, next);

        expect((jsonBody as any).cards).toHaveLength(0);
        expect((jsonBody as any).has_more).toBe(false);
    });
});

// =============================================================================
// APPROVE CARD TESTS
// =============================================================================

describe("POST /api/flashcards/:card_id/approve", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should approve card successfully", async () => {
        mockUpdateCard.mockResolvedValue(true);

        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            {},
            { id: "admin-user", role: "admin" }
        );
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await approveCard(req as Request, res as Response, next);

        expect(mockUpdateCard).toHaveBeenCalledWith(
            "card-123",
            expect.objectContaining({
                verified: true,
                review_required: false,
                approved_by: "admin-user",
            })
        );

        expect(jsonBody).toMatchObject({
            success: true,
            card_id: "card-123",
        });
    });

    it("should return 400 for missing card_id", async () => {
        const req = createMockRequest({});
        const { res, statusCode, jsonBody } = createMockResponse();
        const next = vi.fn();

        await approveCard(req as Request, res as Response, next);

        expect(statusCode).toBe(400);
        expect(jsonBody).toHaveProperty("error", "card_id is required");
    });

    it("should return 404 for non-existent card", async () => {
        mockUpdateCard.mockResolvedValue(false);

        const req = createMockRequest({ card_id: "non-existent" });
        const { res, statusCode, jsonBody } = createMockResponse();
        const next = vi.fn();

        await approveCard(req as Request, res as Response, next);

        expect(statusCode).toBe(404);
        expect(jsonBody).toHaveProperty("error", "Card not found");
    });

    it("should create audit log entry", async () => {
        mockUpdateCard.mockResolvedValue(true);

        const req = createMockRequest(
            { card_id: "card-456" },
            {},
            {},
            { id: "admin-xyz", role: "admin" }
        );
        const { res } = createMockResponse();
        const next = vi.fn();

        await approveCard(req as Request, res as Response, next);

        expect(mockAddLogEntry).toHaveBeenCalledWith(
            "admin-actions",
            "info",
            "card_approved",
            expect.stringContaining("card-456")
        );
    });
});

// =============================================================================
// EDIT CARD TESTS
// =============================================================================

describe("POST /api/flashcards/:card_id/edit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCardById.mockResolvedValue({
            card_id: "card-123",
            question: "Original Q",
            answer: "Original A",
            evidence: [],
        });
        mockVerifyCardEvidence.mockResolvedValue({
            verified: true,
            note: "All evidence checks passed",
        });
        mockUpdateCard.mockResolvedValue(true);
    });

    it("should edit card with new question", async () => {
        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            { q: "Updated question?" },
            { id: "admin-user", role: "admin" }
        );
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        expect(mockUpdateCard).toHaveBeenCalledWith(
            "card-123",
            expect.objectContaining({
                question: "Updated question?",
                edited_by: "admin-user",
            })
        );

        expect(jsonBody).toMatchObject({
            success: true,
            card_id: "card-123",
        });
    });

    it("should edit card with new answer", async () => {
        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            { a: "Updated answer text" },
            { id: "admin-user", role: "admin" }
        );
        const { res } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        expect(mockUpdateCard).toHaveBeenCalledWith(
            "card-123",
            expect.objectContaining({
                answer: "Updated answer text",
            })
        );
    });

    it("should re-verify card after edit", async () => {
        mockVerifyCardEvidence.mockResolvedValue({
            verified: false,
            note: "Answer does not match evidence",
        });

        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            { a: "Completely wrong answer" }
        );
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        expect(mockVerifyCardEvidence).toHaveBeenCalled();
        expect(mockUpdateCard).toHaveBeenCalledWith(
            "card-123",
            expect.objectContaining({
                verified: false,
                review_required: true,
            })
        );
        expect((jsonBody as any).verified).toBe(false);
    });

    it("should return 400 for invalid input", async () => {
        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            { q: "" } // Empty string should fail validation
        );
        const { res, statusCode } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        expect(statusCode).toBe(400);
    });

    it("should return 404 for non-existent card", async () => {
        mockGetCardById.mockResolvedValue(null);

        const req = createMockRequest(
            { card_id: "non-existent" },
            {},
            { q: "New question" }
        );
        const { res, statusCode, jsonBody } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        expect(statusCode).toBe(404);
        expect(jsonBody).toHaveProperty("error", "Card not found");
    });

    it("should update rationale without re-verification", async () => {
        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            { rationale: "Better explanation" }
        );
        const { res } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        // Rationale-only edit should not trigger re-verification
        expect(mockVerifyCardEvidence).not.toHaveBeenCalled();
        expect(mockUpdateCard).toHaveBeenCalledWith(
            "card-123",
            expect.objectContaining({
                rationale: "Better explanation",
            })
        );
    });

    it("should create audit log with diff", async () => {
        const req = createMockRequest(
            { card_id: "card-789" },
            {},
            { q: "New Q", a: "New A" },
            { id: "admin-abc", role: "admin" }
        );
        const { res } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        expect(mockAddLogEntry).toHaveBeenCalledWith(
            "admin-actions",
            "info",
            "card_edited",
            expect.stringContaining("card-789"),
            expect.objectContaining({
                card_id: "card-789",
                user_id: "admin-abc",
                changes: { q: true, a: true, rationale: false },
            })
        );
    });
});

// =============================================================================
// AUTHORIZATION TESTS
// =============================================================================

describe("Admin Authorization", () => {
    // Note: Authorization is handled by middleware in routes.
    // These tests verify the behavior assuming middleware is applied.

    it("should include user_id in approval record", async () => {
        mockUpdateCard.mockResolvedValue(true);

        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            {},
            { id: "specific-admin", role: "admin" }
        );
        const { res } = createMockResponse();
        const next = vi.fn();

        await approveCard(req as Request, res as Response, next);

        expect(mockUpdateCard).toHaveBeenCalledWith(
            "card-123",
            expect.objectContaining({
                approved_by: "specific-admin",
            })
        );
    });

    it("should include user_id in edit record", async () => {
        mockGetCardById.mockResolvedValue({
            card_id: "card-123",
            question: "Q",
            answer: "A",
            evidence: [],
        });
        mockUpdateCard.mockResolvedValue(true);

        const req = createMockRequest(
            { card_id: "card-123" },
            {},
            { rationale: "Updated" },
            { id: "another-admin", role: "admin" }
        );
        const { res } = createMockResponse();
        const next = vi.fn();

        await editCard(req as Request, res as Response, next);

        expect(mockUpdateCard).toHaveBeenCalledWith(
            "card-123",
            expect.objectContaining({
                edited_by: "another-admin",
            })
        );
    });
});
