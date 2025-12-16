/**
 * E2E Module Processing Test
 * 
 * Integration test that runs the E2E harness with mocked LLM calls
 * 
 * Run: npm run test:run -- test/e2e/runModuleE2E.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { processModuleStandalone } from "../../server/services/flashcard/e2e/processModuleStandalone";

// =============================================================================
// E2E INTEGRATION TEST
// =============================================================================

describe("E2E Module Processing", () => {
  const testModuleId = "e2e-test-" + Date.now();
  const createdFiles: string[] = [];

  beforeAll(() => {
    // Set up environment for mock mode
    process.env.USE_LOCAL_CHUNKS = "true";
    process.env.MOCK_LLM = "true";
  });

  afterAll(() => {
    // Clean up created files
    for (const file of createdFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Ignore
      }
    }

    // Clean up test decks
    const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
    if (fs.existsSync(decksDir)) {
      const files = fs.readdirSync(decksDir);
      for (const file of files) {
        if (file.includes("e2e-test-")) {
          try {
            fs.unlinkSync(path.join(decksDir, file));
          } catch {
            // Ignore
          }
        }
      }
    }
  });

  // ===========================================================================
  // FULL PIPELINE TEST
  // ===========================================================================

  it("should run complete pipeline with mock data", async () => {
    const result = await processModuleStandalone({
      module_id: testModuleId,
      course_id: "course-e2e-test",
      module_title: "E2E Test Module - HR Fundamentals",
    });

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.module_id).toBe(testModuleId);
    expect(result.course_id).toBe("course-e2e-test");
    expect(result.status).toMatch(/SUCCESS|PARTIAL/);

    // Verify metrics
    expect(result.generated_count).toBeGreaterThan(0);
    expect(result.verified_count).toBeGreaterThanOrEqual(0);
    expect(result.metrics.chunks_retrieved).toBeGreaterThan(0);
    expect(result.metrics.time_ms).toBeGreaterThan(0);

    // Verify deck was saved
    expect(result.deck_id).toBeDefined();
  });

  it("should generate valid deck JSON file", async () => {
    const moduleId = testModuleId + "-deck";
    
    await processModuleStandalone({
      module_id: moduleId,
      course_id: "course-e2e-test",
      module_title: "E2E Test Module",
    });

    // Find and read deck file
    const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
    const files = fs.readdirSync(decksDir);
    const deckFile = files.find(f => f.includes(moduleId));

    expect(deckFile).toBeDefined();

    const deckPath = path.join(decksDir, deckFile!);
    createdFiles.push(deckPath);

    const deck = JSON.parse(fs.readFileSync(deckPath, "utf-8"));

    // Validate deck schema
    expect(deck.module_id).toBe(moduleId);
    expect(deck.module_title).toBe("E2E Test Module");
    expect(deck.generated_count).toBeGreaterThan(0);
    expect(Array.isArray(deck.cards)).toBe(true);
    expect(deck.generation_metadata).toBeDefined();
    expect(deck.generation_metadata.model).toBeDefined();
    expect(deck.generation_metadata.timestamp).toBeDefined();
  });

  it("should generate cards with valid structure", async () => {
    const moduleId = testModuleId + "-cards";
    
    await processModuleStandalone({
      module_id: moduleId,
      course_id: "course-e2e-test",
      module_title: "E2E Test Module",
    });

    // Read deck
    const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
    const files = fs.readdirSync(decksDir);
    const deckFile = files.find(f => f.includes(moduleId));
    const deckPath = path.join(decksDir, deckFile!);
    createdFiles.push(deckPath);

    const deck = JSON.parse(fs.readFileSync(deckPath, "utf-8"));

    // Validate each card
    for (const card of deck.cards) {
      // Required fields
      expect(card.card_id).toMatch(/^M.*_C\d+$/);
      expect(typeof card.q).toBe("string");
      expect(card.q.length).toBeGreaterThan(0);
      expect(typeof card.a).toBe("string");
      expect(card.a.length).toBeGreaterThan(0);

      // Difficulty
      expect(["easy", "medium", "hard"]).toContain(card.difficulty);

      // Bloom level
      expect([
        "Remember", "Understand", "Apply", 
        "Analyze", "Evaluate", "Create"
      ]).toContain(card.bloom_level);

      // Evidence
      expect(Array.isArray(card.evidence)).toBe(true);
      expect(card.evidence.length).toBeGreaterThan(0);
      
      for (const ev of card.evidence) {
        expect(ev.chunk_id).toBeDefined();
        expect(ev.source_file).toBeDefined();
        expect(ev.excerpt).toBeDefined();
        expect(ev.excerpt.length).toBeLessThanOrEqual(300);
      }

      // Sources
      expect(Array.isArray(card.sources)).toBe(true);
      expect(card.sources.length).toBeGreaterThan(0);
      
      for (const src of card.sources) {
        expect(["video", "slides", "pdf", "audio", "quiz"]).toContain(src.type);
        expect(src.file).toBeDefined();
        expect(src.loc).toBeDefined();
      }

      // Scores
      expect(card.confidence_score).toBeGreaterThanOrEqual(0);
      expect(card.confidence_score).toBeLessThanOrEqual(1);
      expect(typeof card.review_required).toBe("boolean");

      // Rationale
      expect(typeof card.rationale).toBe("string");
    }
  });

  it("should respect difficulty distribution settings", async () => {
    const moduleId = testModuleId + "-dist";
    
    await processModuleStandalone({
      module_id: moduleId,
      course_id: "course-e2e-test",
      module_title: "E2E Test Module",
      settings: {
        target_card_count: 8,
        difficulty_distribution: { easy: 3, medium: 3, hard: 2 },
      },
    });

    // Read deck
    const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
    const files = fs.readdirSync(decksDir);
    const deckFile = files.find(f => f.includes(moduleId));
    const deckPath = path.join(decksDir, deckFile!);
    createdFiles.push(deckPath);

    const deck = JSON.parse(fs.readFileSync(deckPath, "utf-8"));

    // Count difficulties
    const counts = {
      easy: deck.cards.filter((c: any) => c.difficulty === "easy").length,
      medium: deck.cards.filter((c: any) => c.difficulty === "medium").length,
      hard: deck.cards.filter((c: any) => c.difficulty === "hard").length,
    };

    // Should have some of each difficulty
    expect(counts.easy).toBeGreaterThan(0);
    expect(counts.medium).toBeGreaterThan(0);
    expect(counts.hard).toBeGreaterThan(0);
  });

  it("should use sample chunks from fixture file", async () => {
    const moduleId = testModuleId + "-chunks";
    
    const result = await processModuleStandalone({
      module_id: moduleId,
      course_id: "course-e2e-test",
      module_title: "E2E Test Module",
    });

    // Should have retrieved 8 chunks from fixture
    expect(result.metrics.chunks_retrieved).toBe(8);

    // Read deck and verify evidence references fixture chunks
    const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
    const files = fs.readdirSync(decksDir);
    const deckFile = files.find(f => f.includes(moduleId));
    const deckPath = path.join(decksDir, deckFile!);
    createdFiles.push(deckPath);

    const deck = JSON.parse(fs.readFileSync(deckPath, "utf-8"));

    // Evidence should reference chunk IDs from fixture (c1-c8)
    const allChunkIds = deck.cards.flatMap((c: any) => 
      c.evidence.map((e: any) => e.chunk_id)
    );
    
    const validChunkIds = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];
    for (const chunkId of allChunkIds) {
      expect(validChunkIds).toContain(chunkId);
    }
  });

  it("should complete within reasonable time", async () => {
    const moduleId = testModuleId + "-perf";
    const startTime = Date.now();
    
    const result = await processModuleStandalone({
      module_id: moduleId,
      course_id: "course-e2e-test",
      module_title: "E2E Test Module",
    });

    const totalTime = Date.now() - startTime;

    // With mock LLM, should complete quickly (< 5 seconds)
    expect(totalTime).toBeLessThan(5000);
    expect(result.metrics.time_ms).toBeLessThan(5000);

    // Clean up
    const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
    const files = fs.readdirSync(decksDir);
    const deckFile = files.find(f => f.includes(moduleId));
    if (deckFile) {
      createdFiles.push(path.join(decksDir, deckFile));
    }
  });
});
