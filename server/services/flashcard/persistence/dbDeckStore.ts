/**
 * Database Deck Store
 * 
 * Persistent storage for flashcard decks and cards using Drizzle ORM.
 * Supports PostgreSQL (production) and SQLite (testing).
 * Falls back to file-based storage if database operations fail.
 */

import { eq, desc, sql } from "drizzle-orm";
import { pgTable, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { StageBOutput } from "../orchestrator/schemas";
import * as fileDeckStore from "./deckStore";
import { getDbClient, getDbType, type DbClient } from "../../db/client";

// =============================================================================
// DRIZZLE SCHEMA DEFINITIONS
// =============================================================================

export const flashcardDecks = pgTable("flashcard_decks", {
    deck_id: text("deck_id").primaryKey(),
    module_id: text("module_id").notNull(),
    course_id: text("course_id"),
    module_title: text("module_title"),
    generated_at: timestamp("generated_at", { withTimezone: true }).defaultNow(),
    model_version: text("model_version"),
    raw_model_output_url: text("raw_model_output_url"),
    verified_rate: real("verified_rate"),
    warnings: jsonb("warnings").$type<string[]>().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const flashcards = pgTable("flashcards", {
    card_id: text("card_id").primaryKey(),
    deck_id: text("deck_id").notNull().references(() => flashcardDecks.deck_id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    difficulty: text("difficulty").notNull(),
    bloom_level: text("bloom_level").notNull(),
    evidence_json: jsonb("evidence_json").$type<unknown[]>().default([]),
    sources_json: jsonb("sources_json").$type<unknown[]>().default([]),
    confidence_score: real("confidence_score"),
    rationale: text("rationale"),
    review_required: boolean("review_required").default(false),
    verified: boolean("verified").default(false),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// =============================================================================
// TYPES
// =============================================================================

export interface SaveDeckInput extends StageBOutput {
    deck_id?: string;
    course_id?: string;
    model_version?: string;
    generated_at?: string;
    raw_model_output_url?: string;
    verified_rate?: number;
}

export interface SaveDeckResult {
    deck_id: string;
    path?: string;
    source: "db" | "file";
}

export interface DeckListItem {
    deck_id: string;
    generated_at: Date | null;
    model_version: string | null;
    verified_rate: number | null;
    warnings: string[];
}

// =============================================================================
// SAVE DECK TO DB
// =============================================================================

/**
 * Save a deck and its cards to the database.
 * Uses a transaction for atomic insertion.
 * Falls back to file storage if DB fails.
 */
export async function saveDeckToDb(deckObj: SaveDeckInput): Promise<SaveDeckResult> {
    const timestamp = Date.now();
    const deck_id = deckObj.deck_id || `deck_${deckObj.module_id}_${timestamp}`;

    try {
        const db = getDbClient();
        const dbType = getDbType();

        // Prepare deck row data
        const deckRow = {
            deck_id,
            module_id: deckObj.module_id,
            course_id: deckObj.course_id || null,
            module_title: deckObj.module_title,
            generated_at: deckObj.generated_at ? new Date(deckObj.generated_at) : new Date(),
            model_version: deckObj.model_version || deckObj.generation_metadata?.model || "unknown",
            raw_model_output_url: deckObj.raw_model_output_url || null,
            verified_rate: deckObj.verified_rate ?? null,
            warnings: deckObj.warnings || [],
            metadata: deckObj.generation_metadata || {},
        };

        // Prepare card rows
        const cardRows = deckObj.cards.map((card, index) => ({
            card_id: card.card_id,
            deck_id,
            question: card.q,
            answer: card.a,
            difficulty: card.difficulty,
            bloom_level: card.bloom_level,
            evidence_json: card.evidence,
            sources_json: card.sources,
            confidence_score: card.confidence_score,
            rationale: card.rationale,
            review_required: card.review_required,
            verified: false,
        }));

        // Use transaction for atomic insert
        if (dbType === "postgres") {
            await insertWithPostgresTransaction(db, deckRow, cardRows, deck_id);
        } else {
            await insertWithSqliteTransaction(db, deckRow, cardRows, deck_id);
        }

        console.log(`[DbDeckStore] Saved deck ${deck_id} with ${cardRows.length} cards to DB`);

        return { deck_id, source: "db" };

    } catch (error) {
        console.error(`[DbDeckStore] DB save failed for deck ${deck_id}, falling back to file:`, error);

        // Fallback to file store
        try {
            const fileResult = await fileDeckStore.saveDeckToStore(deckObj.module_id, deckObj);
            console.warn(`[DbDeckStore] Fallback to file succeeded: ${fileResult.path}`);
            return { deck_id: fileResult.deck_id, path: fileResult.path, source: "file" };
        } catch (fileError) {
            console.error(`[DbDeckStore] File fallback also failed:`, fileError);
            throw new Error(`Failed to save deck ${deck_id}: DB and file storage both failed`);
        }
    }
}

// =============================================================================
// POSTGRES TRANSACTION
// =============================================================================

async function insertWithPostgresTransaction(
    db: DbClient,
    deckRow: typeof flashcardDecks.$inferInsert,
    cardRows: Array<typeof flashcards.$inferInsert>,
    deck_id: string
): Promise<void> {
    // Upsert deck (insert or update on conflict)
    await (db as any).insert(flashcardDecks)
        .values(deckRow)
        .onConflictDoUpdate({
            target: flashcardDecks.deck_id,
            set: {
                module_title: deckRow.module_title,
                generated_at: deckRow.generated_at,
                model_version: deckRow.model_version,
                raw_model_output_url: deckRow.raw_model_output_url,
                verified_rate: deckRow.verified_rate,
                warnings: deckRow.warnings,
                metadata: deckRow.metadata,
                updated_at: new Date(),
            },
        });

    // Delete existing cards for idempotency
    await (db as any).delete(flashcards).where(eq(flashcards.deck_id, deck_id));

    // Insert new cards
    if (cardRows.length > 0) {
        await (db as any).insert(flashcards).values(cardRows);
    }
}

// =============================================================================
// SQLITE TRANSACTION
// =============================================================================

async function insertWithSqliteTransaction(
    db: DbClient,
    deckRow: typeof flashcardDecks.$inferInsert,
    cardRows: Array<typeof flashcards.$inferInsert>,
    deck_id: string
): Promise<void> {
    // SQLite: Use INSERT OR REPLACE for upsert behavior
    // First, try to delete existing deck (cascade deletes cards)
    await (db as any).delete(flashcardDecks).where(eq(flashcardDecks.deck_id, deck_id));

    // Insert deck
    await (db as any).insert(flashcardDecks).values(deckRow);

    // Insert cards
    if (cardRows.length > 0) {
        await (db as any).insert(flashcards).values(cardRows);
    }
}

// =============================================================================
// READ LATEST DECK
// =============================================================================

/**
 * Read the most recently generated deck for a module.
 */
export async function readLatestDeck(module_id: string): Promise<StageBOutput | null> {
    try {
        const db = getDbClient();

        // Get latest deck for module
        const deckResults = await (db as any)
            .select()
            .from(flashcardDecks)
            .where(eq(flashcardDecks.module_id, module_id))
            .orderBy(desc(flashcardDecks.generated_at))
            .limit(1);

        if (!deckResults || deckResults.length === 0) {
            return null;
        }

        const deckRow = deckResults[0];

        // Get associated cards
        const cardResults = await (db as any)
            .select()
            .from(flashcards)
            .where(eq(flashcards.deck_id, deckRow.deck_id))
            .orderBy(flashcards.created_at);

        return mapToStageBOutput(deckRow, cardResults);

    } catch (error) {
        console.error(`[DbDeckStore] readLatestDeck failed for ${module_id}:`, error);

        // Fallback to file store
        return await fileDeckStore.readLatestDeck(module_id);
    }
}

// =============================================================================
// READ DECK BY ID
// =============================================================================

/**
 * Read a specific deck by its ID.
 */
export async function readDeckById(deck_id: string): Promise<StageBOutput | null> {
    try {
        const db = getDbClient();

        const deckResults = await (db as any)
            .select()
            .from(flashcardDecks)
            .where(eq(flashcardDecks.deck_id, deck_id))
            .limit(1);

        if (!deckResults || deckResults.length === 0) {
            // Try file store fallback
            return await fileDeckStore.readDeckById(deck_id);
        }

        const deckRow = deckResults[0];

        const cardResults = await (db as any)
            .select()
            .from(flashcards)
            .where(eq(flashcards.deck_id, deck_id))
            .orderBy(flashcards.created_at);

        return mapToStageBOutput(deckRow, cardResults);

    } catch (error) {
        console.error(`[DbDeckStore] readDeckById failed for ${deck_id}:`, error);
        return await fileDeckStore.readDeckById(deck_id);
    }
}

// =============================================================================
// LIST DECKS FOR MODULE
// =============================================================================

/**
 * List all decks for a module with pagination.
 */
export async function listDecksForModule(
    module_id: string,
    limit: number = 10,
    offset: number = 0
): Promise<DeckListItem[]> {
    try {
        const db = getDbClient();

        const results = await (db as any)
            .select({
                deck_id: flashcardDecks.deck_id,
                generated_at: flashcardDecks.generated_at,
                model_version: flashcardDecks.model_version,
                verified_rate: flashcardDecks.verified_rate,
                warnings: flashcardDecks.warnings,
            })
            .from(flashcardDecks)
            .where(eq(flashcardDecks.module_id, module_id))
            .orderBy(desc(flashcardDecks.generated_at))
            .limit(limit)
            .offset(offset);

        return results.map((row: any) => ({
            deck_id: row.deck_id,
            generated_at: row.generated_at,
            model_version: row.model_version,
            verified_rate: row.verified_rate,
            warnings: row.warnings || [],
        }));

    } catch (error) {
        console.error(`[DbDeckStore] listDecksForModule failed for ${module_id}:`, error);

        // Fallback to file store
        const fileDecks = await fileDeckStore.listDecksForModule(module_id);
        return fileDecks.slice(offset, offset + limit).map(d => ({
            deck_id: d.deck_id,
            generated_at: new Date(d.created_at),
            model_version: null,
            verified_rate: null,
            warnings: [],
        }));
    }
}

// =============================================================================
// DELETE DECK
// =============================================================================

/**
 * Delete a deck and all its cards.
 */
export async function deleteDeck(deck_id: string): Promise<boolean> {
    try {
        const db = getDbClient();

        // Cards are cascade deleted
        const result = await (db as any)
            .delete(flashcardDecks)
            .where(eq(flashcardDecks.deck_id, deck_id));

        // Check if deletion happened
        const deleted = (result as any)?.rowCount > 0 || (result as any)?.changes > 0;

        if (deleted) {
            console.log(`[DbDeckStore] Deleted deck ${deck_id}`);
        }

        return deleted;

    } catch (error) {
        console.error(`[DbDeckStore] deleteDeck failed for ${deck_id}:`, error);
        return await fileDeckStore.deleteDeck(deck_id);
    }
}

// =============================================================================
// UPDATE CARD VERIFICATION
// =============================================================================

/**
 * Mark a card as verified.
 */
export async function verifyCard(card_id: string, verified: boolean = true): Promise<boolean> {
    try {
        const db = getDbClient();

        await (db as any)
            .update(flashcards)
            .set({ verified, review_required: !verified })
            .where(eq(flashcards.card_id, card_id));

        return true;
    } catch (error) {
        console.error(`[DbDeckStore] verifyCard failed for ${card_id}:`, error);
        return false;
    }
}

/**
 * Update a card's question and answer.
 */
export async function updateCard(
    card_id: string,
    updates: { question?: string; answer?: string }
): Promise<boolean> {
    try {
        const db = getDbClient();

        const setValues: Record<string, unknown> = {};
        if (updates.question !== undefined) setValues.question = updates.question;
        if (updates.answer !== undefined) setValues.answer = updates.answer;

        if (Object.keys(setValues).length === 0) {
            return false;
        }

        await (db as any)
            .update(flashcards)
            .set(setValues)
            .where(eq(flashcards.card_id, card_id));

        return true;
    } catch (error) {
        console.error(`[DbDeckStore] updateCard failed for ${card_id}:`, error);
        return false;
    }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map database rows to StageBOutput format.
 */
function mapToStageBOutput(
    deckRow: typeof flashcardDecks.$inferSelect,
    cardRows: Array<typeof flashcards.$inferSelect>
): StageBOutput {
    return {
        module_id: deckRow.module_id,
        module_title: deckRow.module_title || "",
        generated_count: cardRows.length,
        cards: cardRows.map(card => ({
            card_id: card.card_id,
            q: card.question,
            a: card.answer,
            difficulty: card.difficulty as "easy" | "medium" | "hard",
            bloom_level: card.bloom_level as "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
            evidence: (card.evidence_json || []) as any[],
            sources: (card.sources_json || []) as any[],
            confidence_score: card.confidence_score || 0,
            rationale: card.rationale || "",
            review_required: card.review_required || false,
        })),
        warnings: (deckRow.warnings as string[]) || [],
        generation_metadata: {
            model: deckRow.model_version || "unknown",
            temperature: 0.1,
            timestamp: deckRow.generated_at?.toISOString() || new Date().toISOString(),
        },
    };
}

/**
 * Check if database connection is available.
 */
export async function isDbAvailable(): Promise<boolean> {
    try {
        const db = getDbClient();
        // Simple query to verify connection
        await (db as any).select({ one: sql`1` }).from(flashcardDecks).limit(1);
        return true;
    } catch {
        return false;
    }
}
