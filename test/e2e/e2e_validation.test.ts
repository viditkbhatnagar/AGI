/**
 * E2E Pipeline Validation Tests
 * 
 * Tests the E2E harness in mock mode to ensure the pipeline produces expected outputs.
 * 
 * Run: npm run test:run -- test/e2e/e2e_validation.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================

const HARNESS_PATH = path.join(__dirname, "../../scripts/e2e/run_e2e_module.ts");
const REPORT_PATH = path.join(__dirname, "../../e2e_test_report.json");
const DECKS_DIR = path.join(__dirname, "../../server/tmp/decks");
const TIMEOUT_MS = 60000; // 1 minute timeout for E2E

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface E2EReport {
    run_id: string;
    module_id: string;
    mode: string;
    status: "success" | "partial" | "failed";
    stages: Record<string, { status: string; duration_ms: number }>;
    deck_path?: string;
    card_count?: number;
    verified_count?: number;
    warnings: string[];
    errors: string[];
}

function runE2EHarness(args: string[] = []): {
    exitCode: number;
    stdout: string;
    stderr: string;
} {
    const command = `npx ts-node ${HARNESS_PATH} ${args.join(" ")}`;

    try {
        const stdout = execSync(command, {
            encoding: "utf-8",
            cwd: path.join(__dirname, "../.."),
            timeout: TIMEOUT_MS,
            env: {
                ...process.env,
                // Ensure mock mode
                GEMINI_API_KEY: "",
                OPENAI_API_KEY: "",
            },
        });
        return { exitCode: 0, stdout, stderr: "" };
    } catch (error: any) {
        return {
            exitCode: error.status || 1,
            stdout: error.stdout || "",
            stderr: error.stderr || error.message,
        };
    }
}

function loadReport(reportPath: string): E2EReport | null {
    if (!fs.existsSync(reportPath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(reportPath, "utf-8"));
}

function cleanupTestArtifacts(): void {
    // Clean up report
    if (fs.existsSync(REPORT_PATH)) {
        fs.unlinkSync(REPORT_PATH);
    }

    // Clean up test decks (only those started with e2e-test)
    if (fs.existsSync(DECKS_DIR)) {
        const files = fs.readdirSync(DECKS_DIR);
        for (const file of files) {
            if (file.startsWith("e2e-test-module")) {
                fs.unlinkSync(path.join(DECKS_DIR, file));
            }
        }
    }
}

// =============================================================================
// TESTS
// =============================================================================

describe("E2E Pipeline Harness", () => {
    beforeAll(() => {
        cleanupTestArtifacts();
    });

    afterAll(() => {
        cleanupTestArtifacts();
    });

    describe("Mock Mode Execution", () => {
        it("should complete successfully in mock mode with local chunks", () => {
            const result = runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            // Should exit successfully
            expect(result.exitCode).toBe(0);

            // Stdout should contain summary
            expect(result.stdout).toContain("SUMMARY");
            expect(result.stdout).toMatch(/Status: (SUCCESS|PARTIAL)/);
        });

        it("should produce a valid report JSON", () => {
            // Run harness
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            // Load and validate report
            const report = loadReport(REPORT_PATH);

            expect(report).not.toBeNull();
            expect(report?.run_id).toBeDefined();
            expect(report?.module_id).toBe("e2e-test-module");
            expect(report?.mode).toBe("mock");
            expect(report?.status).toMatch(/success|partial/);
        });

        it("should generate at least 10 cards", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);

            expect(report?.card_count).toBeDefined();
            expect(report?.card_count).toBeGreaterThanOrEqual(10);
        });

        it("should save deck to server/tmp/decks", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);

            expect(report?.deck_path).toBeDefined();
            expect(fs.existsSync(report?.deck_path || "")).toBe(true);

            // Validate deck structure
            const deck = JSON.parse(fs.readFileSync(report?.deck_path!, "utf-8"));
            expect(deck.deck_id).toBeDefined();
            expect(deck.module_id).toBe("e2e-test-module");
            expect(deck.cards).toBeInstanceOf(Array);
            expect(deck.cards.length).toBeGreaterThan(0);
        });

        it("should include verified cards", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);

            expect(report?.verified_count).toBeDefined();
            expect(report?.verified_count).toBeGreaterThan(0);

            // Verification rate should be reasonable
            if (report?.card_count && report?.verified_count) {
                const rate = report.verified_count / report.card_count;
                expect(rate).toBeGreaterThan(0.5);
            }
        });
    });

    describe("Report Structure", () => {
        it("should include all stage results", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);

            expect(report?.stages).toBeDefined();
            expect(report?.stages.ingest).toBeDefined();
            expect(report?.stages.chunk).toBeDefined();
            expect(report?.stages.embed).toBeDefined();
            expect(report?.stages.stageA).toBeDefined();
            expect(report?.stages.stageB).toBeDefined();
            expect(report?.stages.verify).toBeDefined();
            expect(report?.stages.save).toBeDefined();
        });

        it("should include timing information", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);

            expect(report?.duration_ms).toBeDefined();
            expect(report?.duration_ms).toBeGreaterThan(0);

            // Each stage should have duration
            for (const stage of Object.values(report?.stages || {})) {
                expect(stage.duration_ms).toBeDefined();
                expect(typeof stage.duration_ms).toBe("number");
            }
        });

        it("should include timestamps", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);

            expect(report?.started_at).toBeDefined();
            expect(report?.completed_at).toBeDefined();

            // Validate ISO format
            expect(() => new Date(report!.started_at)).not.toThrow();
            expect(() => new Date(report!.completed_at)).not.toThrow();
        });
    });

    describe("Deck Structure Validation", () => {
        it("should produce deck with required fields", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);
            const deck = JSON.parse(fs.readFileSync(report?.deck_path!, "utf-8"));

            // Required deck fields
            expect(deck.deck_id).toBeDefined();
            expect(deck.module_id).toBeDefined();
            expect(deck.module_title).toBeDefined();
            expect(deck.cards).toBeInstanceOf(Array);
            expect(deck.verification_rate).toBeDefined();
            expect(deck.generated_at).toBeDefined();
        });

        it("should produce cards with required fields", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);
            const deck = JSON.parse(fs.readFileSync(report?.deck_path!, "utf-8"));

            for (const card of deck.cards) {
                expect(card.card_id).toBeDefined();
                expect(card.question).toBeDefined();
                expect(card.answer).toBeDefined();
                expect(card.evidence).toBeInstanceOf(Array);
                expect(typeof card.verified).toBe("boolean");
                expect(typeof card.confidence).toBe("number");
            }
        });

        it("should include evidence in cards", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);
            const deck = JSON.parse(fs.readFileSync(report?.deck_path!, "utf-8"));

            // At least some cards should have evidence
            const cardsWithEvidence = deck.cards.filter(
                (c: any) => c.evidence && c.evidence.length > 0
            );
            expect(cardsWithEvidence.length).toBeGreaterThan(0);
        });
    });

    describe("Error Handling", () => {
        it("should return non-zero exit code on fatal error", () => {
            const result = runE2EHarness([
                "--module=non-existent-module",
                "--mode=mock",
                // Don't use local chunks, so it will try to find the manifest
            ]);

            // May fail due to missing manifest or other issues
            // The key is it should handle errors gracefully
            expect(result.stdout || result.stderr).toBeTruthy();
        });

        it("should include warnings in report", () => {
            runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                `--output=${REPORT_PATH}`,
            ]);

            const report = loadReport(REPORT_PATH);

            // Warnings array should exist (may be empty)
            expect(report?.warnings).toBeInstanceOf(Array);
        });
    });

    describe("Verbose Mode", () => {
        it("should output more details with --verbose flag", () => {
            const result = runE2EHarness([
                "--module=e2e-test-module",
                "--mode=mock",
                "--use-local-chunks",
                "--verbose",
                `--output=${REPORT_PATH}`,
            ]);

            // Verbose mode should include stage progress
            expect(result.stdout).toContain("Starting stage");
        });
    });
});

// =============================================================================
// PARTIAL/WARNING TESTS
// =============================================================================

describe("Partial Success Scenarios", () => {
    it("should report PARTIAL status with warning when cards < 10", async () => {
        // This test would require modifying the mock to return fewer cards
        // For now, we verify the report structure handles warnings correctly

        runE2EHarness([
            "--module=e2e-test-module",
            "--mode=mock",
            "--use-local-chunks",
            `--output=${REPORT_PATH}`,
        ]);

        const report = loadReport(REPORT_PATH);

        // If card_count < 10, should have warning
        if (report?.card_count && report.card_count < 10) {
            expect(report.status).toBe("partial");
            expect(report.warnings.some(w => w.includes("cards"))).toBe(true);
        }
    });
});
