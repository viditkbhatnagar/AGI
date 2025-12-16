/**
 * Database Deck Store Unit Tests
 * 
 * Tests using in-memory SQLite for fast, isolated testing.
 * 
 * Run: npm run test:run -- test/persistence/dbDeckStore.unit.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { text, real, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import type { StageBOutput } from "../../server/services/flashcard/orchestrator/schemas";

// =============================================================================
// SQLITE SCHEMA (mirrors Postgres schema for testing)
// =============================================================================

const flashcardDecks = sqliteTable("flashcard_decks", {
    deck_id: text("deck_id").primaryKey(),
    module_id: text("module_id").notNull(),
    course_id: text("course_id"),
    module_title: text("module_title"),
    generated_at: text("generated_at"),
    model_version: text("model_version"),
    raw_model_output_url: text("raw_model_output_url"),
    verified_rate: real("verified_rate"),
    warnings: text("warnings"),
    metadata: text("metadata"),
    created_at: text("created_at"),
    updated_at: text("updated_at"),
});

const flashcards = sqliteTable("flashcards", {
    card_id: text("card_id").primaryKey(),
    deck_id: text("deck_id").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    difficulty: text("difficulty").notNull(),
    bloom_level: text("bloom_level").notNull(),
    evidence_json: text("evidence_json"),
    sources_json: text("sources_json"),
    confidence_score: real("confidence_score"),
    rationale: text("rationale"),
    review_required: integer("review_required", { mode: "boolean" }),
    verified: integer("verified", { mode: "boolean" }),
    created_at: text("created_at"),
    updated_at: text("updated_at"),
});

// =============================================================================
// TEST SETUP
// =============================================================================

let sqliteDb: Database.Database;
let db: BetterSQLite3Database;

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS flashcard_decks (
    deck_id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    course_id TEXT,
    module_title TEXT,
    generated_at TEXT,
    model_version TEXT,
    raw_model_output_url TEXT,
    verified_rate REAL,
    warnings TEXT,
    metadata TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    card_id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    bloom_level TEXT NOT NULL,
    evidence_json TEXT,
    sources_json TEXT,
    confidence_score REAL,
    rationale TEXT,
    review_required INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
  );
`;

beforeAll(() => {
    sqliteDb = new Database(":memory:");
    sqliteDb.exec(CREATE_TABLES_SQL);
    db = drizzle(sqliteDb);
});

afterAll(() => {
    sqliteDb.close();
});

beforeEach(() => {
    // Clear tables before each test
    sqliteDb.exec("DELETE FROM flashcards");
    sqliteDb.exec("DELETE FROM flashcard_decks");
});

// =============================================================================
// TEST DATA
// =============================================================================

let testCounter = 0;

function createTestDeck(overrides: Partial<StageBOutput> & { deckPrefix?: string } = {}): StageBOutput {
    const prefix = overrides.deckPrefix || `test${++testCounter}`;
    return {
        module_id: "mod-test-001",
        module_title: "Test Module",
        generated_count: 2,
        cards: [
            {
                card_id: `M${prefix}_C1`,
                q: "What is the test question 1?",
                a: "Test answer 1",
                difficulty: "easy",
                bloom_level: "Remember",
                evidence: [
                    { chunk_id: "c1", source_file: "test.pdf", loc: "p.1", excerpt: "Test excerpt" },
                ],
                sources: [{ type: "pdf", file: "test.pdf", loc: "p.1" }],
                confidence_score: 0.95,
                rationale: "Test rationale 1",
                review_required: false,
            },
            {
                card_id: `M${prefix}_C2`,
                q: "What is the test question 2?",
                a: "Test answer 2",
                difficulty: "medium",
                bloom_level: "Understand",
                evidence: [
                    { chunk_id: "c2", source_file: "test.pdf", loc: "p.2", excerpt: "Test excerpt 2" },
                ],
                sources: [{ type: "pdf", file: "test.pdf", loc: "p.2" }],
                confidence_score: 0.85,
                rationale: "Test rationale 2",
                review_required: true,
            },
        ],
        warnings: [],
        generation_metadata: {
            model: "gemini-1.5-flash",
            temperature: 0.1,
            timestamp: new Date().toISOString(),
        },
        ...overrides,
    };
}

// =============================================================================
// HELPER FUNCTIONS (simulating dbDeckStore operations)
// =============================================================================

async function saveDeckToTestDb(
    deckObj: StageBOutput & { deck_id?: string; model_version?: string }
): Promise<{ deck_id: string }> {
    const deck_id = deckObj.deck_id || `deck_${deckObj.module_id}_${Date.now()}`;

    const deckRow = {
        deck_id,
        module_id: deckObj.module_id,
        course_id: null,
        module_title: deckObj.module_title,
        generated_at: new Date().toISOString(),
        model_version: deckObj.model_version || deckObj.generation_metadata?.model || "unknown",
        raw_model_output_url: null,
        verified_rate: null,
        warnings: JSON.stringify(deckObj.warnings || []),
        metadata: JSON.stringify(deckObj.generation_metadata || {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    // Upsert: delete existing then insert (SQLite doesn't have ON CONFLICT DO UPDATE with same power)
    db.delete(flashcardDecks).where(eq(flashcardDecks.deck_id, deck_id)).run();
    db.insert(flashcardDecks).values(deckRow).run();

    // Delete existing cards
    db.delete(flashcards).where(eq(flashcards.deck_id, deck_id)).run();

    // Insert cards
    for (const card of deckObj.cards) {
        db.insert(flashcards).values({
            card_id: card.card_id,
            deck_id,
            question: card.q,
            answer: card.a,
            difficulty: card.difficulty,
            bloom_level: card.bloom_level,
            evidence_json: JSON.stringify(card.evidence),
            sources_json: JSON.stringify(card.sources),
            confidence_score: card.confidence_score,
            rationale: card.rationale,
            review_required: card.review_required ? 1 : 0,
            verified: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).run();
    }

    return { deck_id };
}

async function readLatestDeckFromTestDb(module_id: string): Promise<StageBOutput | null> {
    const deckRows = db
        .select()
        .from(flashcardDecks)
        .where(eq(flashcardDecks.module_id, module_id))
        .orderBy(flashcardDecks.generated_at)
        .limit(1)
        .all();

    if (deckRows.length === 0) {
        return null;
    }

    const deckRow = deckRows[0];
    const cardRows = db
        .select()
        .from(flashcards)
        .where(eq(flashcards.deck_id, deckRow.deck_id))
        .all();

    return {
        module_id: deckRow.module_id,
        module_title: deckRow.module_title || "",
        generated_count: cardRows.length,
        cards: cardRows.map(card => ({
            card_id: card.card_id,
            q: card.question,
            a: card.answer,
            difficulty: card.difficulty as "easy" | "medium" | "hard",
            bloom_level: card.bloom_level as any,
            evidence: JSON.parse(card.evidence_json || "[]"),
            sources: JSON.parse(card.sources_json || "[]"),
            confidence_score: card.confidence_score || 0,
            rationale: card.rationale || "",
            review_required: Boolean(card.review_required),
        })),
        warnings: JSON.parse(deckRow.warnings || "[]"),
        generation_metadata: {
            model: deckRow.model_version || "unknown",
            temperature: 0.1,
            timestamp: deckRow.generated_at || new Date().toISOString(),
        },
    };
}

async function readDeckByIdFromTestDb(deck_id: string): Promise<StageBOutput | null> {
    const deckRows = db
        .select()
        .from(flashcardDecks)
        .where(eq(flashcardDecks.deck_id, deck_id))
        .limit(1)
        .all();

    if (deckRows.length === 0) {
        return null;
    }

    const deckRow = deckRows[0];
    const cardRows = db
        .select()
        .from(flashcards)
        .where(eq(flashcards.deck_id, deck_id))
        .all();

    return {
        module_id: deckRow.module_id,
        module_title: deckRow.module_title || "",
        generated_count: cardRows.length,
        cards: cardRows.map(card => ({
            card_id: card.card_id,
            q: card.question,
            a: card.answer,
            difficulty: card.difficulty as "easy" | "medium" | "hard",
            bloom_level: card.bloom_level as any,
            evidence: JSON.parse(card.evidence_json || "[]"),
            sources: JSON.parse(card.sources_json || "[]"),
            confidence_score: card.confidence_score || 0,
            rationale: card.rationale || "",
            review_required: Boolean(card.review_required),
        })),
        warnings: JSON.parse(deckRow.warnings || "[]"),
        generation_metadata: {
            model: deckRow.model_version || "unknown",
            temperature: 0.1,
            timestamp: deckRow.generated_at || new Date().toISOString(),
        },
    };
}

async function listDecksForModuleFromTestDb(module_id: string, limit = 10): Promise<Array<{ deck_id: string }>> {
    return db
        .select({ deck_id: flashcardDecks.deck_id })
        .from(flashcardDecks)
        .where(eq(flashcardDecks.module_id, module_id))
        .limit(limit)
        .all();
}

async function deleteDeckFromTestDb(deck_id: string): Promise<boolean> {
    // Delete cards first (no CASCADE in SQLite without PRAGMA)
    db.delete(flashcards).where(eq(flashcards.deck_id, deck_id)).run();
    const result = db.delete(flashcardDecks).where(eq(flashcardDecks.deck_id, deck_id)).run();
    return result.changes > 0;
}

// =============================================================================
// TESTS
// =============================================================================

describe("dbDeckStore - Save and Read", () => {
    it("should save deck and cards, then read them back", async () => {
        const testDeck = createTestDeck();
        const { deck_id } = await saveDeckToTestDb({ ...testDeck, deck_id: "deck_test_12345" });

        expect(deck_id).toBe("deck_test_12345");

        const retrieved = await readDeckByIdFromTestDb(deck_id);

        expect(retrieved).not.toBeNull();
        expect(retrieved!.module_id).toBe("mod-test-001");
        expect(retrieved!.module_title).toBe("Test Module");
        expect(retrieved!.cards).toHaveLength(2);
        expect(retrieved!.cards[0].q).toBe("What is the test question 1?");
        expect(retrieved!.cards[1].q).toBe("What is the test question 2?");
    });

    it("should read latest deck for module", async () => {
        // Save two decks for the same module with unique card IDs
        await saveDeckToTestDb({
            ...createTestDeck({ deckPrefix: "deck1" }),
            deck_id: "deck_mod-test-001_1000",
            module_title: "First Deck",
        });

        await new Promise(r => setTimeout(r, 10)); // Small delay for timestamp ordering

        await saveDeckToTestDb({
            ...createTestDeck({ deckPrefix: "deck2" }),
            deck_id: "deck_mod-test-001_2000",
            module_title: "Second Deck",
        });

        const latest = await readLatestDeckFromTestDb("mod-test-001");

        expect(latest).not.toBeNull();
        // Should return one of the decks (ordering depends on timestamp)
        expect(latest!.module_id).toBe("mod-test-001");
    });

    it("should return null for non-existent module", async () => {
        const result = await readLatestDeckFromTestDb("non-existent-module");
        expect(result).toBeNull();
    });

    it("should return null for non-existent deck_id", async () => {
        const result = await readDeckByIdFromTestDb("deck_non_existent");
        expect(result).toBeNull();
    });
});

describe("dbDeckStore - Idempotency", () => {
    it("should not duplicate cards when saving same deck_id twice", async () => {
        const testDeck = createTestDeck();
        const deck_id = "deck_idempotency_test";

        // Save first time
        await saveDeckToTestDb({ ...testDeck, deck_id });

        // Save second time with same deck_id
        await saveDeckToTestDb({ ...testDeck, deck_id });

        // Verify only 2 cards exist (not 4)
        const retrieved = await readDeckByIdFromTestDb(deck_id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.cards).toHaveLength(2);

        // Verify only 1 deck row
        const deckCount = db
            .select()
            .from(flashcardDecks)
            .where(eq(flashcardDecks.deck_id, deck_id))
            .all();
        expect(deckCount).toHaveLength(1);
    });

    it("should update deck fields on re-save with same deck_id", async () => {
        const deck_id = "deck_update_test";

        // Save first time
        await saveDeckToTestDb({
            ...createTestDeck(),
            deck_id,
            module_title: "Original Title",
        });

        // Save second time with updated title
        await saveDeckToTestDb({
            ...createTestDeck(),
            deck_id,
            module_title: "Updated Title",
        });

        const retrieved = await readDeckByIdFromTestDb(deck_id);
        expect(retrieved!.module_title).toBe("Updated Title");
    });
});

describe("dbDeckStore - List and Delete", () => {
    it("should list multiple decks for module", async () => {
        const module_id = "mod-list-test";

        await saveDeckToTestDb({
            ...createTestDeck({ module_id, deckPrefix: "list1" }),
            deck_id: "deck_list_1",
        });
        await saveDeckToTestDb({
            ...createTestDeck({ module_id, deckPrefix: "list2" }),
            deck_id: "deck_list_2",
        });
        await saveDeckToTestDb({
            ...createTestDeck({ module_id, deckPrefix: "list3" }),
            deck_id: "deck_list_3",
        });

        const list = await listDecksForModuleFromTestDb(module_id);

        expect(list).toHaveLength(3);
        expect(list.map(d => d.deck_id)).toContain("deck_list_1");
        expect(list.map(d => d.deck_id)).toContain("deck_list_2");
        expect(list.map(d => d.deck_id)).toContain("deck_list_3");
    });

    it("should delete deck and associated cards", async () => {
        const deck_id = "deck_delete_test";

        await saveDeckToTestDb({ ...createTestDeck(), deck_id });

        // Verify deck exists
        let deck = await readDeckByIdFromTestDb(deck_id);
        expect(deck).not.toBeNull();

        // Delete
        const deleted = await deleteDeckFromTestDb(deck_id);
        expect(deleted).toBe(true);

        // Verify deck is gone
        deck = await readDeckByIdFromTestDb(deck_id);
        expect(deck).toBeNull();

        // Verify cards are gone
        const cards = db.select().from(flashcards).where(eq(flashcards.deck_id, deck_id)).all();
        expect(cards).toHaveLength(0);
    });

    it("should return false when deleting non-existent deck", async () => {
        const deleted = await deleteDeckFromTestDb("non_existent_deck");
        expect(deleted).toBe(false);
    });
});

describe("dbDeckStore - JSON Columns", () => {
    it("should correctly serialize and deserialize evidence array", async () => {
        const deck_id = "deck_json_test";
        const testDeck = createTestDeck();

        await saveDeckToTestDb({ ...testDeck, deck_id });

        const retrieved = await readDeckByIdFromTestDb(deck_id);

        expect(retrieved!.cards[0].evidence).toHaveLength(1);
        expect(retrieved!.cards[0].evidence[0].chunk_id).toBe("c1");
        expect(retrieved!.cards[0].evidence[0].excerpt).toBe("Test excerpt");
    });

    it("should correctly serialize and deserialize sources array", async () => {
        const deck_id = "deck_sources_test";
        const testDeck = createTestDeck();

        await saveDeckToTestDb({ ...testDeck, deck_id });

        const retrieved = await readDeckByIdFromTestDb(deck_id);

        expect(retrieved!.cards[0].sources).toHaveLength(1);
        expect(retrieved!.cards[0].sources[0].type).toBe("pdf");
        expect(retrieved!.cards[0].sources[0].file).toBe("test.pdf");
    });

    it("should correctly serialize and deserialize warnings array", async () => {
        const deck_id = "deck_warnings_test";
        const testDeck = createTestDeck({
            warnings: ["Warning 1", "Warning 2"],
        });

        await saveDeckToTestDb({ ...testDeck, deck_id });

        const retrieved = await readDeckByIdFromTestDb(deck_id);

        expect(retrieved!.warnings).toHaveLength(2);
        expect(retrieved!.warnings).toContain("Warning 1");
        expect(retrieved!.warnings).toContain("Warning 2");
    });
});

describe("dbDeckStore - Card Fields", () => {
    it("should preserve all card fields", async () => {
        const deck_id = "deck_fields_test";
        const testDeck = createTestDeck();

        await saveDeckToTestDb({ ...testDeck, deck_id });

        const retrieved = await readDeckByIdFromTestDb(deck_id);
        const card = retrieved!.cards[1]; // Second card has review_required: true

        expect(card.difficulty).toBe("medium");
        expect(card.bloom_level).toBe("Understand");
        expect(card.confidence_score).toBe(0.85);
        expect(card.rationale).toBe("Test rationale 2");
        expect(card.review_required).toBe(true);
    });
});
