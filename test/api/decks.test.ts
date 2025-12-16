/**
 * Deck & Card Endpoints Tests
 * 
 * Tests for GET /api/modules/:module_id/flashcards and GET /api/flashcards/:card_id
 * 
 * Run: npm run test:run -- test/api/decks.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response } from "express";
import {
    getModuleFlashcards,
    getCard,
} from "../../server/services/flashcard/controllers/orchestratorController";

// =============================================================================
// MOCKS
// =============================================================================

const mockReadLatestDeck = vi.fn();
const mockGetCardById = vi.fn();

vi.mock("../../server/services/flashcard/persistence", () => ({
    deckStore: {
        readLatestDeck: mockReadLatestDeck,
    },
}));

vi.mock("../../server/services/flashcard/persistence/dbDeckStore", () => ({
    dbDeckStore: {
        getCardById: mockGetCardById,
    },
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockRequest(
    params: object = {},
    query: object = {}
): Partial<Request> {
    return {
        params: params as any,
        query: query as any,
        user: { id: "test-user", role: "user" },
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
// TEST DATA
// =============================================================================

const mockDeck = {
    deck_id: "mod-hr-101::deck-001",
    module_id: "mod-hr-101",
    module_title: "Introduction to HR",
    cards: [
        {
            card_id: "card-001",
            question: "What is HR?",
            answer: "Human Resources management...",
            verified: true,
            confidence: 0.95,
        },
        {
            card_id: "card-002",
            question: "What is talent acquisition?",
            answer: "The process of finding...",
            verified: true,
            confidence: 0.88,
        },
        {
            card_id: "card-003",
            question: "Define organizational culture",
            answer: "Shared values and beliefs...",
            verified: false,
            confidence: 0.55,
        },
    ],
    verification_rate: 0.67,
    generated_at: "2024-01-15T10:30:00.000Z",
    warnings: [],
};

const mockCard = {
    card_id: "card-001",
    question: "What is HR?",
    answer: "Human Resources management involves...",
    rationale: "Core concept of the module",
    evidence: [
        {
            chunk_id: "chunk-001",
            text: "Human Resources (HR) is the department...",
            start_sec: 30,
            end_sec: 45,
            source_file: "lecture.mp4",
        },
    ],
    verified: true,
    confidence: 0.95,
    bloom_level: "understand",
};

// =============================================================================
// GET MODULE FLASHCARDS TESTS
// =============================================================================

describe("GET /api/modules/:module_id/flashcards", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return deck for valid module_id", async () => {
        mockReadLatestDeck.mockResolvedValue(mockDeck);

        const req = createMockRequest({ module_id: "mod-hr-101" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        expect(mockReadLatestDeck).toHaveBeenCalledWith("mod-hr-101");
        expect(jsonBody).toMatchObject({
            deck_id: "mod-hr-101::deck-001",
            module_id: "mod-hr-101",
            module_title: "Introduction to HR",
            cards: expect.any(Array),
        });
    });

    it("should return 400 for missing module_id", async () => {
        const req = createMockRequest({});
        const { res, statusCode, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        expect(statusCode).toBe(400);
        expect(jsonBody).toHaveProperty("error", "module_id is required");
    });

    it("should return 404 when no deck exists", async () => {
        mockReadLatestDeck.mockResolvedValue(null);

        const req = createMockRequest({ module_id: "non-existent" });
        const { res, statusCode, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        expect(statusCode).toBe(404);
        expect(jsonBody).toHaveProperty("error", "No deck found for module");
    });

    it("should filter out unverified cards by default", async () => {
        mockReadLatestDeck.mockResolvedValue(mockDeck);

        const req = createMockRequest({ module_id: "mod-hr-101" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        const cards = (jsonBody as any).cards;
        expect(cards.every((c: any) => c.verified)).toBe(true);
        expect(cards).toHaveLength(2); // Only verified cards
    });

    it("should include unverified cards when requested", async () => {
        mockReadLatestDeck.mockResolvedValue(mockDeck);

        const req = createMockRequest(
            { module_id: "mod-hr-101" },
            { include_unverified: "true" }
        );
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        const cards = (jsonBody as any).cards;
        expect(cards).toHaveLength(3); // All cards including unverified
    });

    it("should respect limit parameter", async () => {
        mockReadLatestDeck.mockResolvedValue(mockDeck);

        const req = createMockRequest(
            { module_id: "mod-hr-101" },
            { include_unverified: "true", limit: "2" }
        );
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        expect((jsonBody as any).cards).toHaveLength(2);
        expect((jsonBody as any).card_count).toBe(2);
        expect((jsonBody as any).total_count).toBe(3);
    });

    it("should include deck metadata in response", async () => {
        mockReadLatestDeck.mockResolvedValue(mockDeck);

        const req = createMockRequest({ module_id: "mod-hr-101" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        expect(jsonBody).toHaveProperty("verification_rate", 0.67);
        expect(jsonBody).toHaveProperty("generated_at");
        expect(jsonBody).toHaveProperty("warnings");
    });
});

// =============================================================================
// GET SINGLE CARD TESTS
// =============================================================================

describe("GET /api/flashcards/:card_id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return card for valid card_id", async () => {
        mockGetCardById.mockResolvedValue(mockCard);

        const req = createMockRequest({ card_id: "card-001" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getCard(req as Request, res as Response, next);

        expect(mockGetCardById).toHaveBeenCalledWith("card-001");
        expect(jsonBody).toMatchObject({
            card_id: "card-001",
            question: expect.any(String),
            answer: expect.any(String),
        });
    });

    it("should return 400 for missing card_id", async () => {
        const req = createMockRequest({});
        const { res, statusCode, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getCard(req as Request, res as Response, next);

        expect(statusCode).toBe(400);
        expect(jsonBody).toHaveProperty("error", "card_id is required");
    });

    it("should return 404 for non-existent card", async () => {
        mockGetCardById.mockResolvedValue(null);

        const req = createMockRequest({ card_id: "non-existent" });
        const { res, statusCode, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getCard(req as Request, res as Response, next);

        expect(statusCode).toBe(404);
        expect(jsonBody).toHaveProperty("error", "Card not found");
    });

    it("should include all card fields in response", async () => {
        mockGetCardById.mockResolvedValue(mockCard);

        const req = createMockRequest({ card_id: "card-001" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getCard(req as Request, res as Response, next);

        expect(jsonBody).toMatchObject({
            card_id: "card-001",
            question: expect.any(String),
            answer: expect.any(String),
            rationale: expect.any(String),
            evidence: expect.any(Array),
            verified: true,
            confidence: 0.95,
            bloom_level: "understand",
        });
    });

    it("should include evidence with timestamps", async () => {
        mockGetCardById.mockResolvedValue(mockCard);

        const req = createMockRequest({ card_id: "card-001" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getCard(req as Request, res as Response, next);

        const evidence = (jsonBody as any).evidence[0];
        expect(evidence).toMatchObject({
            chunk_id: "chunk-001",
            text: expect.any(String),
            start_sec: 30,
            end_sec: 45,
            source_file: "lecture.mp4",
        });
    });
});

// =============================================================================
// RESPONSE SCHEMA TESTS
// =============================================================================

describe("Response Schema Validation", () => {
    it("should return StageBOutput compatible schema for deck", async () => {
        mockReadLatestDeck.mockResolvedValue(mockDeck);

        const req = createMockRequest({ module_id: "mod-hr-101" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getModuleFlashcards(req as Request, res as Response, next);

        // Verify required fields for StageBOutput compatibility
        expect(jsonBody).toHaveProperty("deck_id");
        expect(jsonBody).toHaveProperty("module_id");
        expect(jsonBody).toHaveProperty("cards");
        expect((jsonBody as any).cards[0]).toHaveProperty("card_id");
        expect((jsonBody as any).cards[0]).toHaveProperty("question");
        expect((jsonBody as any).cards[0]).toHaveProperty("answer");
    });

    it("should return card with evidence array", async () => {
        mockGetCardById.mockResolvedValue(mockCard);

        const req = createMockRequest({ card_id: "card-001" });
        const { res, jsonBody } = createMockResponse();
        const next = vi.fn();

        await getCard(req as Request, res as Response, next);

        expect(Array.isArray((jsonBody as any).evidence)).toBe(true);
    });
});
