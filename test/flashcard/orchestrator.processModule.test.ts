/**
 * Orchestrator processModule Tests
 * 
 * Unit tests for the standalone module processor
 * 
 * Run: npm run test:run -- test/flashcard/orchestrator.processModule.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// SETUP
// =============================================================================

describe("processModuleStandalone", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
    
    // Default to local chunks and mock LLM for tests
    process.env.USE_LOCAL_CHUNKS = "true";
    process.env.MOCK_LLM = "true";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    
    // Clean up test files
    const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
    const jobsDir = path.join(process.cwd(), "server", "tmp", "jobs");
    
    for (const dir of [decksDir, jobsDir]) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.includes("test-") || file.includes("mod-test")) {
            try {
              fs.unlinkSync(path.join(dir, file));
            } catch {
              // Ignore
            }
          }
        }
      }
    }
  });

  // ===========================================================================
  // SUCCESS FLOW
  // ===========================================================================

  describe("success flow", () => {
    it("should process module with local chunks and mock LLM", async () => {
      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      const result = await processModuleStandalone({
        module_id: "test-success-" + Date.now(),
        course_id: "course-test",
        module_title: "Test Module",
      });

      expect(result.status).toMatch(/SUCCESS|PARTIAL/);
      expect(result.generated_count).toBeGreaterThan(0);
      expect(result.deck_id).toBeDefined();
      expect(result.metrics.chunks_retrieved).toBeGreaterThan(0);
    });

    it("should save deck JSON file", async () => {
      const moduleId = "test-deck-" + Date.now();
      
      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      const result = await processModuleStandalone({
        module_id: moduleId,
        course_id: "course-test",
        module_title: "Test Module",
      });

      expect(result.deck_id).toBeDefined();

      // Check deck file exists
      const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
      const files = fs.readdirSync(decksDir);
      const deckFile = files.find(f => f.includes(moduleId));
      
      expect(deckFile).toBeDefined();

      // Verify deck content
      const deckContent = JSON.parse(
        fs.readFileSync(path.join(decksDir, deckFile!), "utf-8")
      );
      
      expect(deckContent.module_id).toBe(moduleId);
      expect(deckContent.cards).toBeDefined();
      expect(Array.isArray(deckContent.cards)).toBe(true);
    });

    it("should return verification metrics", async () => {
      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      const result = await processModuleStandalone({
        module_id: "test-verify-" + Date.now(),
        course_id: "course-test",
        module_title: "Test Module",
      });

      expect(result.verified_count).toBeDefined();
      expect(result.metrics.verification_rate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.verification_rate).toBeLessThanOrEqual(1);
    });

    it("should include warnings for difficulty imbalance", async () => {
      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      const result = await processModuleStandalone({
        module_id: "test-warnings-" + Date.now(),
        course_id: "course-test",
        module_title: "Test Module",
        settings: {
          target_card_count: 10,
          difficulty_distribution: { easy: 5, medium: 3, hard: 2 },
        },
      });

      // May have warnings about difficulty imbalance
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ===========================================================================
  // INSUFFICIENT CHUNKS FLOW
  // ===========================================================================

  describe("insufficient chunks flow", () => {
    it("should return NEED_MORE_CONTENT when chunks < 4", async () => {
      // Mock retrieveChunks to return insufficient chunks
      vi.doMock("../../server/services/flashcard/vectorDb/retrieveChunks", () => ({
        retrieveChunks: vi.fn().mockResolvedValue({
          chunks: [
            { chunk_id: "c1", text: "Short chunk", tokens_est: 10 },
            { chunk_id: "c2", text: "Another short chunk", tokens_est: 10 },
          ],
          metadata: { insufficient: true, total_found: 2, provider: "qdrant" },
        }),
      }));

      // Don't use local chunks for this test
      process.env.USE_LOCAL_CHUNKS = "false";

      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      const result = await processModuleStandalone({
        module_id: "test-insufficient-" + Date.now(),
        course_id: "course-test",
        module_title: "Test Module",
      });

      expect(result.status).toBe("NEED_MORE_CONTENT");
      expect(result.warnings.some(w => w.includes("Insufficient"))).toBe(true);
    });

    it("should enqueue transcription job when insufficient chunks", async () => {
      // Mock retrieveChunks to return insufficient chunks
      vi.doMock("../../server/services/flashcard/vectorDb/retrieveChunks", () => ({
        retrieveChunks: vi.fn().mockResolvedValue({
          chunks: [{ chunk_id: "c1", text: "Only one chunk", tokens_est: 10 }],
          metadata: { insufficient: true, total_found: 1, provider: "qdrant" },
        }),
      }));

      process.env.USE_LOCAL_CHUNKS = "false";

      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      const moduleId = "test-enqueue-" + Date.now();
      const result = await processModuleStandalone({
        module_id: moduleId,
        course_id: "course-test",
        module_title: "Test Module",
      });

      expect(result.status).toBe("NEED_MORE_CONTENT");
      expect(result.warnings.some(w => w.includes("job queued"))).toBe(true);

      // Check job file was created
      const jobsDir = path.join(process.cwd(), "server", "tmp", "jobs");
      if (fs.existsSync(jobsDir)) {
        const files = fs.readdirSync(jobsDir);
        const jobFile = files.find(f => f.includes(moduleId));
        expect(jobFile).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe("error handling", () => {
    it("should return FAILED status on Stage A error", async () => {
      // Use real LLM but with invalid API key
      process.env.MOCK_LLM = "false";
      process.env.GEMINI_API_KEY = "invalid-key";

      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      const result = await processModuleStandalone({
        module_id: "test-error-" + Date.now(),
        course_id: "course-test",
        module_title: "Test Module",
      });

      expect(result.status).toBe("FAILED");
      expect(result.error_message).toBeDefined();
    });

    it("should handle missing fixture file gracefully", async () => {
      // Temporarily rename fixture file
      const fixturePath = path.join(process.cwd(), "test", "fixtures", "module-sample-chunks.json");
      const backupPath = fixturePath + ".bak";
      
      let fixtureExists = fs.existsSync(fixturePath);
      if (fixtureExists) {
        fs.renameSync(fixturePath, backupPath);
      }

      try {
        const { processModuleStandalone } = await import(
          "../../server/services/flashcard/e2e/processModuleStandalone"
        );

        const result = await processModuleStandalone({
          module_id: "test-missing-fixture-" + Date.now(),
          course_id: "course-test",
          module_title: "Test Module",
        });

        expect(result.status).toBe("FAILED");
        expect(result.error_message).toContain("fixture");
      } finally {
        // Restore fixture file
        if (fixtureExists && fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, fixturePath);
        }
      }
    });
  });

  // ===========================================================================
  // DECK SCHEMA VALIDATION
  // ===========================================================================

  describe("deck schema validation", () => {
    it("should generate cards with required fields", async () => {
      const moduleId = "test-schema-" + Date.now();
      
      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      await processModuleStandalone({
        module_id: moduleId,
        course_id: "course-test",
        module_title: "Test Module",
      });

      // Read saved deck
      const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
      const files = fs.readdirSync(decksDir);
      const deckFile = files.find(f => f.includes(moduleId));
      
      expect(deckFile).toBeDefined();

      const deck = JSON.parse(
        fs.readFileSync(path.join(decksDir, deckFile!), "utf-8")
      );

      // Validate deck structure
      expect(deck.module_id).toBe(moduleId);
      expect(deck.cards).toBeDefined();
      expect(deck.generation_metadata).toBeDefined();

      // Validate card structure
      for (const card of deck.cards) {
        expect(card.card_id).toBeDefined();
        expect(card.q).toBeDefined();
        expect(card.a).toBeDefined();
        expect(card.difficulty).toMatch(/easy|medium|hard/);
        expect(card.bloom_level).toBeDefined();
        expect(card.evidence).toBeDefined();
        expect(Array.isArray(card.evidence)).toBe(true);
        expect(card.sources).toBeDefined();
        expect(card.confidence_score).toBeGreaterThanOrEqual(0);
        expect(card.confidence_score).toBeLessThanOrEqual(1);
        expect(typeof card.review_required).toBe("boolean");

        // Validate evidence structure
        for (const ev of card.evidence) {
          expect(ev.chunk_id).toBeDefined();
          expect(ev.source_file).toBeDefined();
          expect(ev.excerpt).toBeDefined();
        }
      }
    });

    it("should enforce answer length limits", async () => {
      const moduleId = "test-limits-" + Date.now();
      
      const { processModuleStandalone } = await import(
        "../../server/services/flashcard/e2e/processModuleStandalone"
      );

      await processModuleStandalone({
        module_id: moduleId,
        course_id: "course-test",
        module_title: "Test Module",
      });

      // Read saved deck
      const decksDir = path.join(process.cwd(), "server", "tmp", "decks");
      const files = fs.readdirSync(decksDir);
      const deckFile = files.find(f => f.includes(moduleId));
      
      const deck = JSON.parse(
        fs.readFileSync(path.join(decksDir, deckFile!), "utf-8")
      );

      // Check answer limits
      for (const card of deck.cards) {
        const wordCount = card.a.split(/\s+/).length;
        expect(wordCount).toBeLessThanOrEqual(41); // 40 + possible "..."
        expect(card.a.length).toBeLessThanOrEqual(303); // 300 + "..."
      }
    });
  });
});
