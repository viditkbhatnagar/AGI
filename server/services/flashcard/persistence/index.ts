/**
 * Deck Store Index
 * 
 * Exports the appropriate deck store based on environment configuration.
 * USE_DB_STORE=true uses database persistence, otherwise uses file storage.
 */

import * as fileDeckStore from "./deckStore";
import * as dbDeckStore from "./dbDeckStore";

// =============================================================================
// CONFIGURATION
// =============================================================================

const USE_DB_STORE = process.env.USE_DB_STORE === "true";

// =============================================================================
// UNIFIED INTERFACE
// =============================================================================

export interface DeckStore {
    /**
     * Save a deck and its cards.
     * @returns Object with deck_id and optional path (if file fallback used)
     */
    saveDeck: typeof dbDeckStore.saveDeckToDb;

    /**
     * Read the latest deck for a module.
     */
    readLatestDeck: typeof dbDeckStore.readLatestDeck;

    /**
     * Read a specific deck by ID.
     */
    readDeckById: typeof dbDeckStore.readDeckById;

    /**
     * List decks for a module with pagination.
     */
    listDecksForModule: typeof dbDeckStore.listDecksForModule;

    /**
     * Delete a deck and all its cards.
     */
    deleteDeck: typeof dbDeckStore.deleteDeck;

    /**
     * Name of the store for logging.
     */
    storeName: string;
}

// =============================================================================
// FILE-BASED STORE ADAPTER
// =============================================================================

const fileStoreAdapter: DeckStore = {
    saveDeck: async (deckObj) => {
        const result = await fileDeckStore.saveDeckToStore(deckObj.module_id, deckObj);
        return { deck_id: result.deck_id, path: result.path, source: "file" as const };
    },
    readLatestDeck: fileDeckStore.readLatestDeck,
    readDeckById: fileDeckStore.readDeckById,
    listDecksForModule: async (module_id, limit = 10, offset = 0) => {
        const decks = await fileDeckStore.listDecksForModule(module_id);
        return decks.slice(offset, offset + limit).map(d => ({
            deck_id: d.deck_id,
            generated_at: new Date(d.created_at),
            model_version: null,
            verified_rate: null,
            warnings: [],
        }));
    },
    deleteDeck: fileDeckStore.deleteDeck,
    storeName: "file",
};

// =============================================================================
// DB-BASED STORE ADAPTER
// =============================================================================

const dbStoreAdapter: DeckStore = {
    saveDeck: dbDeckStore.saveDeckToDb,
    readLatestDeck: dbDeckStore.readLatestDeck,
    readDeckById: dbDeckStore.readDeckById,
    listDecksForModule: dbDeckStore.listDecksForModule,
    deleteDeck: dbDeckStore.deleteDeck,
    storeName: "database",
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * The active deck store based on USE_DB_STORE environment variable.
 */
export const deckStore: DeckStore = USE_DB_STORE ? dbStoreAdapter : fileStoreAdapter;

/**
 * Force use of database store (for specific operations).
 */
export const dbStore = dbStoreAdapter;

/**
 * Force use of file store (for fallback or testing).
 */
export const fileStore = fileStoreAdapter;

// Re-export individual functions for direct access
export { saveDeckToDb, readLatestDeck, readDeckById, listDecksForModule, deleteDeck, verifyCard, updateCard, isDbAvailable } from "./dbDeckStore";
export { saveDeckToStore, getDecksDirectory, cleanupOldDecks } from "./deckStore";

// Export types
export type { SaveDeckInput, SaveDeckResult, DeckListItem } from "./dbDeckStore";

// Log which store is active
if (USE_DB_STORE) {
    console.log("[DeckStore] Using DATABASE persistence (USE_DB_STORE=true)");
} else {
    console.log("[DeckStore] Using FILE persistence (USE_DB_STORE=false or unset)");
}
