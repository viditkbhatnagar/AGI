/**
 * Deck Store Tests
 * 
 * Unit tests for local file persistence
 * 
 * Run: npm run test:run -- test/flashcard/deckStore.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  saveDeckToStore,
  readLatestDeck,
  readDeckById,
  listDecksForModule,
  deleteDeck,
  cleanupOldDecks,
  getDecksDirectory,
} from "../../server/services/flashcard/persistence/deckStore";
import type { StageBOutput } from "../../server/services/flashcard/types";

// =============================================================================
// TEST DATA
// =============================================================================

const mockDeck: StageBOutput = {
  module_id: "test-module-123",
  module_title: "Test Module",
  generated_count: 3,
  cards: [
    {
      card_id: "Mtest-module-123_C1",
      q: "What is a test?",
      a: "A procedure to evaluate something.",
      difficulty: "easy",
      bloom_level: "Remember",
      evidence: [{
        chunk_id: "c1",
        source_file: "test.pdf",
        loc: "p.1",
        start_sec: null,
        end_sec: null,
        excerpt: "A test is a procedure.",
      }],
      sources: [{ type: "pdf", file: "test.pdf", loc: "p.1" }],
      confidence_score: 0.95,
      rationale: "Basic definition question.",
      review_required: false,
    },
  ],
  warnings: [],
  generation_metadata: {
    model: "test-model",
    temperature: 0.1,
    timestamp: new Date().toISOString(),
  },
};

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe("deckStore", () => {
  const testModuleId = "test-module-" + Date.now();
  const createdFiles: string[] = [];

  afterEach(async () => {
    // Clean up created files
    for (const file of createdFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFiles.length = 0;
  });

  // ===========================================================================
  // saveDeckToStore
  // ===========================================================================

  describe("saveDeckToStore", () => {
    it("should save deck to file and return path", async () => {
      const deck = { ...mockDeck, module_id: testModuleId };
      
      const result = await saveDeckToStore(testModuleId, deck);
      createdFiles.push(result.path);

      expect(result.path).toContain(testModuleId);
      expect(result.path.endsWith(".json")).toBe(true);
      expect(result.deck_id).toContain(testModuleId);
      expect(fs.existsSync(result.path)).toBe(true);

      // Verify content
      const content = JSON.parse(fs.readFileSync(result.path, "utf-8"));
      expect(content.module_id).toBe(testModuleId);
      expect(content.cards).toHaveLength(1);
      expect(content.saved_at).toBeDefined();
    });

    it("should create decks directory if not exists", async () => {
      const deck = { ...mockDeck, module_id: testModuleId + "-dir" };
      
      const result = await saveDeckToStore(testModuleId + "-dir", deck);
      createdFiles.push(result.path);

      const decksDir = getDecksDirectory();
      expect(fs.existsSync(decksDir)).toBe(true);
    });

    it("should handle special characters in module_id", async () => {
      const specialId = "mod_test-123_v2";
      const deck = { ...mockDeck, module_id: specialId };
      
      const result = await saveDeckToStore(specialId, deck);
      createdFiles.push(result.path);

      expect(result.path).toContain(specialId);
      expect(fs.existsSync(result.path)).toBe(true);
    });
  });

  // ===========================================================================
  // readLatestDeck
  // ===========================================================================

  describe("readLatestDeck", () => {
    it("should return null for non-existent module", async () => {
      const result = await readLatestDeck("non-existent-module-xyz");
      expect(result).toBeNull();
    });

    it("should return the most recent deck for a module", async () => {
      const moduleId = testModuleId + "-latest";
      
      // Save two decks with slight delay
      const deck1 = { ...mockDeck, module_id: moduleId, module_title: "First" };
      const result1 = await saveDeckToStore(moduleId, deck1);
      createdFiles.push(result1.path);

      await new Promise(r => setTimeout(r, 10)); // Small delay

      const deck2 = { ...mockDeck, module_id: moduleId, module_title: "Second" };
      const result2 = await saveDeckToStore(moduleId, deck2);
      createdFiles.push(result2.path);

      // Read latest
      const latest = await readLatestDeck(moduleId);
      
      expect(latest).not.toBeNull();
      expect(latest!.module_title).toBe("Second");
    });
  });

  // ===========================================================================
  // readDeckById
  // ===========================================================================

  describe("readDeckById", () => {
    it("should return null for invalid deck_id format", async () => {
      const result = await readDeckById("invalid-format");
      expect(result).toBeNull();
    });

    it("should return null for non-existent deck", async () => {
      const result = await readDeckById("deck_nonexistent_999999999999");
      expect(result).toBeNull();
    });

    it("should return deck by ID", async () => {
      const moduleId = testModuleId + "-byid";
      const deck = { ...mockDeck, module_id: moduleId };
      
      const { deck_id, path: filePath } = await saveDeckToStore(moduleId, deck);
      createdFiles.push(filePath);

      const result = await readDeckById(deck_id);
      
      expect(result).not.toBeNull();
      expect(result!.module_id).toBe(moduleId);
    });
  });

  // ===========================================================================
  // listDecksForModule
  // ===========================================================================

  describe("listDecksForModule", () => {
    it("should return empty array for module with no decks", async () => {
      const result = await listDecksForModule("no-decks-module");
      expect(result).toEqual([]);
    });

    it("should list all decks for a module", async () => {
      const moduleId = testModuleId + "-list";
      
      // Save multiple decks
      for (let i = 0; i < 3; i++) {
        const deck = { ...mockDeck, module_id: moduleId };
        const { path: filePath } = await saveDeckToStore(moduleId, deck);
        createdFiles.push(filePath);
        await new Promise(r => setTimeout(r, 5));
      }

      const result = await listDecksForModule(moduleId);
      
      expect(result.length).toBe(3);
      expect(result[0].deck_id).toContain(moduleId);
      
      // Should be sorted by most recent first
      const times = result.map(d => new Date(d.created_at).getTime());
      expect(times[0]).toBeGreaterThanOrEqual(times[1]);
    });
  });

  // ===========================================================================
  // deleteDeck
  // ===========================================================================

  describe("deleteDeck", () => {
    it("should return false for non-existent deck", async () => {
      const result = await deleteDeck("deck_nonexistent_999999999999");
      expect(result).toBe(false);
    });

    it("should delete deck and return true", async () => {
      const moduleId = testModuleId + "-delete";
      const deck = { ...mockDeck, module_id: moduleId };
      
      const { deck_id, path: filePath } = await saveDeckToStore(moduleId, deck);
      
      expect(fs.existsSync(filePath)).toBe(true);
      
      const result = await deleteDeck(deck_id);
      
      expect(result).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  // ===========================================================================
  // cleanupOldDecks
  // ===========================================================================

  describe("cleanupOldDecks", () => {
    it("should keep specified number of recent decks", async () => {
      const moduleId = testModuleId + "-cleanup";
      
      // Save 5 decks
      for (let i = 0; i < 5; i++) {
        const deck = { ...mockDeck, module_id: moduleId };
        const { path: filePath } = await saveDeckToStore(moduleId, deck);
        createdFiles.push(filePath);
        await new Promise(r => setTimeout(r, 5));
      }

      // Cleanup keeping only 2
      const deleted = await cleanupOldDecks(moduleId, 2);
      
      expect(deleted).toBe(3);
      
      const remaining = await listDecksForModule(moduleId);
      expect(remaining.length).toBe(2);
    });

    it("should not delete if fewer decks than keepCount", async () => {
      const moduleId = testModuleId + "-cleanup-few";
      
      // Save 2 decks
      for (let i = 0; i < 2; i++) {
        const deck = { ...mockDeck, module_id: moduleId };
        const { path: filePath } = await saveDeckToStore(moduleId, deck);
        createdFiles.push(filePath);
      }

      // Try to cleanup keeping 5
      const deleted = await cleanupOldDecks(moduleId, 5);
      
      expect(deleted).toBe(0);
    });
  });
});
