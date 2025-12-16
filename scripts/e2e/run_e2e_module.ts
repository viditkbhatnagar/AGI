#!/usr/bin/env npx ts-node
/**
 * E2E Module Pipeline Harness
 * 
 * Runs the complete flashcard generation pipeline on a sample module.
 * Supports both mock and real modes for testing and validation.
 * 
 * Required Environment Variables (real mode only):
 *   GEMINI_API_KEY or OPENAI_API_KEY - For LLM calls
 *   EMBEDDING_PROVIDER - gemini|openai|local
 *   VECTOR_DB_PROVIDER - pinecone|qdrant
 *   REDIS_URL - For job queue (default: redis://localhost:6379)
 * 
 * Usage:
 *   npx ts-node scripts/e2e/run_e2e_module.ts --module=mod-test-001 --mode=mock
 *   npx ts-node scripts/e2e/run_e2e_module.ts --module=mod-hr-101 --mode=real --verbose
 * 
 * Flags:
 *   --module=<id>       Module ID to process (default: e2e-test-module)
 *   --course=<id>       Optional course ID
 *   --mode=mock|real    Mode (default: mock)
 *   --use-local-chunks  Skip transcription, use pre-chunked fixtures
 *   --mock-llm          Force mock LLM even in real mode
 *   --mock-embeddings   Force mock embeddings even in real mode
 *   --verbose           Enable verbose logging
 *   --output=<path>     Output report path (default: ./e2e_report.json)
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM compatibility: reconstruct __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use native crypto.randomUUID for ESM compatibility
const uuidv4 = (): string => randomUUID();

// =============================================================================
// TYPES
// =============================================================================

interface E2EConfig {
    moduleId: string;
    courseId?: string;
    mode: "mock" | "real";
    useLocalChunks: boolean;
    mockLlm: boolean;
    mockEmbeddings: boolean;
    verbose: boolean;
    outputPath: string;
}

interface ModuleManifest {
    module_id: string;
    module_title: string;
    files: Array<{
        file_id: string;
        name: string;
        type: "slides" | "pdf" | "audio" | "video";
        path?: string;
        url?: string;
        provider: "local" | "google_drive" | "onedrive";
    }>;
    chunks?: Array<{
        chunk_id: string;
        text: string;
        source_file: string;
        start_sec?: number;
        end_sec?: number;
    }>;
}

interface E2EReport {
    run_id: string;
    module_id: string;
    mode: string;
    started_at: string;
    completed_at: string;
    duration_ms: number;
    status: "success" | "partial" | "failed";
    stages: {
        ingest: StageResult;
        transcribe: StageResult;
        chunk: StageResult;
        embed: StageResult;
        upsert: StageResult;
        stageA: StageResult;
        stageB: StageResult;
        verify: StageResult;
        save: StageResult;
    };
    deck_path?: string;
    card_count?: number;
    verified_count?: number;
    warnings: string[];
    errors: string[];
}

interface StageResult {
    status: "success" | "skipped" | "failed";
    duration_ms: number;
    message?: string;
    data?: unknown;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

function parseArgs(): E2EConfig {
    const args = process.argv.slice(2);
    const config: E2EConfig = {
        moduleId: "e2e-test-module",
        mode: "mock",
        useLocalChunks: false,
        mockLlm: false,
        mockEmbeddings: false,
        verbose: false,
        outputPath: "./e2e_report.json",
    };

    for (const arg of args) {
        const [key, value] = arg.replace(/^--/, "").split("=");
        switch (key) {
            case "module":
                config.moduleId = value;
                break;
            case "course":
                config.courseId = value;
                break;
            case "mode":
                config.mode = value as "mock" | "real";
                break;
            case "use-local-chunks":
                config.useLocalChunks = true;
                break;
            case "mock-llm":
                config.mockLlm = true;
                break;
            case "mock-embeddings":
                config.mockEmbeddings = true;
                break;
            case "verbose":
                config.verbose = true;
                break;
            case "output":
                config.outputPath = value;
                break;
        }
    }

    return config;
}

function log(config: E2EConfig, ...args: unknown[]): void {
    if (config.verbose) {
        console.log("[E2E]", ...args);
    }
}

function logAlways(...args: unknown[]): void {
    console.log("[E2E]", ...args);
}

// =============================================================================
// MOCK IMPLEMENTATIONS
// =============================================================================

const MOCK_EMBEDDINGS = Array(768).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.5);

function mockEmbedTexts(texts: string[]): number[][] {
    return texts.map((text, i) => {
        // Generate deterministic embedding based on text hash
        const hash = text.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
        return MOCK_EMBEDDINGS.map((v, j) => v + Math.sin(hash + j) * 0.1);
    });
}

function mockTranscribe(file: { name: string }): Array<{ text: string; start: number; end: number }> {
    // Return deterministic mock transcription segments
    return [
        { text: `Welcome to the module on ${file.name}. Today we will cover important concepts.`, start: 0, end: 5 },
        { text: "The first key concept is organizational culture, which refers to shared values and beliefs.", start: 5, end: 12 },
        { text: "Talent acquisition is the process of finding and hiring qualified candidates.", start: 12, end: 20 },
        { text: "Performance management involves setting goals and providing feedback.", start: 20, end: 28 },
        { text: "Employee engagement measures how committed workers are to their organization.", start: 28, end: 35 },
    ];
}

function mockStageA(chunks: Array<{ text: string }>): {
    summaries: string[];
    learning_objectives: string[];
} {
    return {
        summaries: chunks.slice(0, 3).map((c, i) => `Summary ${i + 1}: ${c.text.substring(0, 50)}...`),
        learning_objectives: [
            "Understand organizational culture and its impact",
            "Describe the talent acquisition process",
            "Explain performance management best practices",
        ],
    };
}

function mockStageB(chunks: Array<{ text: string; chunk_id: string }>): Array<{
    card_id: string;
    question: string;
    answer: string;
    evidence: Array<{ chunk_id: string; text: string }>;
    confidence: number;
}> {
    const cards = [
        {
            question: "What is organizational culture?",
            answer: "Organizational culture refers to the shared values, beliefs, and practices that characterize an organization and guide employee behavior.",
        },
        {
            question: "Define talent acquisition.",
            answer: "Talent acquisition is the strategic process of identifying, attracting, and hiring qualified candidates to meet organizational needs.",
        },
        {
            question: "What are the key components of performance management?",
            answer: "Key components include goal setting, regular feedback, performance appraisals, and development planning.",
        },
        {
            question: "Why is employee engagement important?",
            answer: "Employee engagement is important because engaged employees are more productive, have lower turnover, and contribute to positive workplace culture.",
        },
        {
            question: "How does culture affect employee retention?",
            answer: "A positive organizational culture increases job satisfaction and loyalty, leading to higher retention rates.",
        },
        {
            question: "What is the difference between recruitment and talent acquisition?",
            answer: "Recruitment is a reactive, immediate hiring process, while talent acquisition is a proactive, strategic approach to building a talent pipeline.",
        },
        {
            question: "Describe effective feedback techniques.",
            answer: "Effective feedback is specific, timely, balanced, and focused on behaviors rather than personality traits.",
        },
        {
            question: "What factors influence employee engagement?",
            answer: "Factors include leadership quality, career development opportunities, recognition, work-life balance, and workplace relationships.",
        },
        {
            question: "How can organizations measure culture?",
            answer: "Culture can be measured through employee surveys, focus groups, turnover rates, and observation of daily behaviors and norms.",
        },
        {
            question: "What is the role of HR in performance management?",
            answer: "HR designs performance management systems, trains managers, ensures consistency, and connects performance to compensation and development.",
        },
    ];

    return cards.map((card, i) => ({
        card_id: `${chunks[0]?.chunk_id || "chunk"}_card_${i}`,
        question: card.question,
        answer: card.answer,
        evidence: [{ chunk_id: chunks[i % chunks.length]?.chunk_id || "chunk-0", text: chunks[i % chunks.length]?.text || "" }],
        confidence: 0.85 + Math.random() * 0.1,
    }));
}

function mockVerify(cards: Array<{ question: string; answer: string; evidence: Array<{ text: string }> }>): Array<{
    verified: boolean;
    note: string;
}> {
    return cards.map((card) => ({
        verified: card.evidence.length > 0 && card.confidence > 0.7,
        note: card.evidence.length > 0 ? "Evidence supports answer" : "Insufficient evidence",
    }));
}

// =============================================================================
// STAGE RUNNERS
// =============================================================================

async function runStage<T>(
    name: string,
    config: E2EConfig,
    fn: () => Promise<T>
): Promise<{ result: T | null; stage: StageResult }> {
    const start = Date.now();
    log(config, `Starting stage: ${name}`);

    try {
        const result = await fn();
        const duration = Date.now() - start;
        log(config, `Stage ${name} completed in ${duration}ms`);

        return {
            result,
            stage: { status: "success", duration_ms: duration },
        };
    } catch (error) {
        const duration = Date.now() - start;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[E2E] Stage ${name} failed:`, message);

        return {
            result: null,
            stage: { status: "failed", duration_ms: duration, message },
        };
    }
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

async function runPipeline(config: E2EConfig): Promise<E2EReport> {
    const runId = uuidv4();
    const startedAt = new Date();
    const warnings: string[] = [];
    const errors: string[] = [];

    logAlways(`Starting E2E pipeline run: ${runId}`);
    logAlways(`Module: ${config.moduleId}, Mode: ${config.mode}`);

    const report: E2EReport = {
        run_id: runId,
        module_id: config.moduleId,
        mode: config.mode,
        started_at: startedAt.toISOString(),
        completed_at: "",
        duration_ms: 0,
        status: "failed",
        stages: {
            ingest: { status: "skipped", duration_ms: 0 },
            transcribe: { status: "skipped", duration_ms: 0 },
            chunk: { status: "skipped", duration_ms: 0 },
            embed: { status: "skipped", duration_ms: 0 },
            upsert: { status: "skipped", duration_ms: 0 },
            stageA: { status: "skipped", duration_ms: 0 },
            stageB: { status: "skipped", duration_ms: 0 },
            verify: { status: "skipped", duration_ms: 0 },
            save: { status: "skipped", duration_ms: 0 },
        },
        warnings: [],
        errors: [],
    };

    // Check mode and credentials
    const useMockLlm = config.mode === "mock" || config.mockLlm || !hasLlmCredentials();
    const useMockEmbeddings = config.mode === "mock" || config.mockEmbeddings || !hasEmbeddingCredentials();

    if (config.mode === "real" && useMockLlm) {
        warnings.push("Real mode requested but LLM credentials missing - using mock LLM");
    }
    if (config.mode === "real" && useMockEmbeddings) {
        warnings.push("Real mode requested but embedding credentials missing - using mock embeddings");
    }

    // ==========================================================================
    // Stage 1: Ingest
    // ==========================================================================
    const manifestPath = path.join(__dirname, "../../test/fixtures/e2e/sample_module_manifest.json");
    let manifest: ModuleManifest;

    const ingestResult = await runStage("ingest", config, async () => {
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest not found: ${manifestPath}`);
        }
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        return manifest;
    });

    report.stages.ingest = ingestResult.stage;
    if (!ingestResult.result) {
        errors.push("Ingest failed: " + ingestResult.stage.message);
        report.errors = errors;
        report.warnings = warnings;
        return finalizeReport(report, startedAt);
    }
    manifest = ingestResult.result;

    // ==========================================================================
    // Stage 2: Transcribe (or use local chunks)
    // ==========================================================================
    let chunks: Array<{
        chunk_id: string;
        text: string;
        source_file: string;
        start_sec?: number;
        end_sec?: number;
        tokens_est?: number;
    }> = [];

    if (config.useLocalChunks && manifest.chunks) {
        report.stages.transcribe = { status: "skipped", duration_ms: 0, message: "Using local chunks" };
        chunks = manifest.chunks.map((c, i) => ({
            ...c,
            tokens_est: Math.ceil(c.text.split(" ").length * 1.33),
        }));
        log(config, `Loaded ${chunks.length} local chunks`);
    } else {
        const transcribeResult = await runStage("transcribe", config, async () => {
            const allSegments: Array<{ text: string; start: number; end: number; source: string }> = [];

            for (const file of manifest.files) {
                if (file.type === "audio" || file.type === "video") {
                    const segments = mockTranscribe(file);
                    allSegments.push(...segments.map(s => ({ ...s, source: file.name })));
                }
            }

            return allSegments;
        });

        report.stages.transcribe = transcribeResult.stage;
        if (!transcribeResult.result) {
            warnings.push("Transcription failed, using empty segments");
        }

        // Chunk the transcription
        const chunkResult = await runStage("chunk", config, async () => {
            const segments = transcribeResult.result || [];
            return segments.map((seg, i) => ({
                chunk_id: `${config.moduleId}_chunk_${i}`,
                text: seg.text,
                source_file: seg.source,
                start_sec: seg.start,
                end_sec: seg.end,
                tokens_est: Math.ceil(seg.text.split(" ").length * 1.33),
            }));
        });

        report.stages.chunk = chunkResult.stage;
        chunks = chunkResult.result || [];
    }

    if (chunks.length === 0) {
        errors.push("No chunks available for processing");
        report.errors = errors;
        report.warnings = warnings;
        return finalizeReport(report, startedAt);
    }

    log(config, `Processing ${chunks.length} chunks`);

    // ==========================================================================
    // Stage 3: Embed
    // ==========================================================================
    let embeddings: number[][] = [];

    const embedResult = await runStage("embed", config, async () => {
        const texts = chunks.map(c => c.text);

        if (useMockEmbeddings) {
            return mockEmbedTexts(texts);
        } else {
            // Real embeddings
            const { embedTexts } = await import("../../server/services/flashcard/embeddings/embeddingsClient");
            return await embedTexts(texts);
        }
    });

    report.stages.embed = embedResult.stage;
    embeddings = embedResult.result || [];

    // ==========================================================================
    // Stage 4: Upsert to Vector DB
    // ==========================================================================
    const upsertResult = await runStage("upsert", config, async () => {
        if (config.mode === "mock") {
            log(config, "Mock mode: skipping vector DB upsert");
            return { upserted: chunks.length };
        }

        try {
            const { upsertChunks } = await import("../../server/services/flashcard/vectorDb/upsertChunks");
            const chunksWithEmbeddings = chunks.map((c, i) => ({
                ...c,
                provider: "local" as const,
                slide_or_page: c.start_sec !== undefined
                    ? `${formatTime(c.start_sec)}-${formatTime(c.end_sec || 0)}`
                    : null,
                heading: null,
                embedding: embeddings[i],
            }));

            await upsertChunks({ chunks: chunksWithEmbeddings, module_id: config.moduleId });
            return { upserted: chunks.length };
        } catch (error) {
            warnings.push(`Vector DB upsert failed: ${error}`);
            return { upserted: 0 };
        }
    });

    report.stages.upsert = upsertResult.stage;

    // ==========================================================================
    // Stage 5: StageA (Summarize)
    // ==========================================================================
    let stageAOutput: { summaries: string[]; learning_objectives: string[] } | null = null;

    const stageAResult = await runStage("stageA", config, async () => {
        if (useMockLlm) {
            return mockStageA(chunks);
        } else {
            const { runStageA } = await import("../../server/services/flashcard/orchestrator/stageA");
            return await runStageA(chunks, config.moduleId);
        }
    });

    report.stages.stageA = stageAResult.stage;
    stageAOutput = stageAResult.result;

    // ==========================================================================
    // Stage 6: StageB (Generate cards)
    // ==========================================================================
    let cards: Array<{
        card_id: string;
        question: string;
        answer: string;
        evidence: Array<{ chunk_id: string; text: string }>;
        confidence: number;
        verified?: boolean;
    }> = [];

    const stageBResult = await runStage("stageB", config, async () => {
        if (useMockLlm) {
            return mockStageB(chunks);
        } else {
            const { runStageB } = await import("../../server/services/flashcard/orchestrator/stageB");
            return await runStageB(chunks, config.moduleId, stageAOutput?.learning_objectives || []);
        }
    });

    report.stages.stageB = stageBResult.stage;
    cards = stageBResult.result || [];

    if (cards.length === 0) {
        errors.push("No cards generated");
        report.errors = errors;
        report.warnings = warnings;
        return finalizeReport(report, startedAt);
    }

    // ==========================================================================
    // Stage 7: Verify
    // ==========================================================================
    const verifyResult = await runStage("verify", config, async () => {
        if (useMockLlm) {
            return mockVerify(cards);
        } else {
            const { verifyCardEvidence } = await import("../../server/services/flashcard/verification/evidenceVerifier");
            const results = [];
            for (const card of cards) {
                const result = await verifyCardEvidence({
                    question: card.question,
                    answer: card.answer,
                    evidence: card.evidence,
                });
                results.push(result);
            }
            return results;
        }
    });

    report.stages.verify = verifyResult.stage;
    const verifyResults = verifyResult.result || [];

    // Apply verification results
    cards = cards.map((card, i) => ({
        ...card,
        verified: verifyResults[i]?.verified ?? false,
    }));

    const verifiedCount = cards.filter(c => c.verified).length;

    // ==========================================================================
    // Stage 8: Save Deck
    // ==========================================================================
    let deckPath: string | undefined;

    const saveResult = await runStage("save", config, async () => {
        const deck = {
            deck_id: `${config.moduleId}::deck-${Date.now()}`,
            module_id: config.moduleId,
            module_title: manifest.module_title,
            course_id: config.courseId,
            cards: cards.map(c => ({
                card_id: c.card_id,
                question: c.question,
                answer: c.answer,
                rationale: "",
                evidence: c.evidence,
                bloom_level: "understand",
                difficulty: "medium",
                verified: c.verified,
                confidence: c.confidence,
                review_required: !c.verified,
            })),
            verification_rate: cards.length > 0 ? verifiedCount / cards.length : 0,
            generated_at: new Date().toISOString(),
            warnings: warnings,
        };

        // Ensure output directory exists
        const decksDir = path.join(__dirname, "../../server/tmp/decks");
        if (!fs.existsSync(decksDir)) {
            fs.mkdirSync(decksDir, { recursive: true });
        }

        const filename = `${config.moduleId}_${Date.now()}.json`;
        deckPath = path.join(decksDir, filename);
        fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));

        return { path: deckPath, card_count: cards.length };
    });

    report.stages.save = saveResult.stage;

    // ==========================================================================
    // Finalize Report
    // ==========================================================================
    report.deck_path = deckPath;
    report.card_count = cards.length;
    report.verified_count = verifiedCount;
    report.warnings = warnings;
    report.errors = errors;

    // Determine overall status
    const failedStages = Object.values(report.stages).filter(s => s.status === "failed");
    if (failedStages.length === 0 && cards.length >= 10) {
        report.status = "success";
    } else if (cards.length > 0) {
        report.status = "partial";
        if (cards.length < 10) {
            warnings.push(`Only ${cards.length} cards generated (expected 10+)`);
        }
    } else {
        report.status = "failed";
    }

    return finalizeReport(report, startedAt);
}

function finalizeReport(report: E2EReport, startedAt: Date): E2EReport {
    const completedAt = new Date();
    report.completed_at = completedAt.toISOString();
    report.duration_ms = completedAt.getTime() - startedAt.getTime();
    return report;
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function hasLlmCredentials(): boolean {
    return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

function hasEmbeddingCredentials(): boolean {
    return !!(
        process.env.GEMINI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.EMBEDDINGS_LOCAL_URL
    );
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
    const config = parseArgs();

    logAlways("=".repeat(60));
    logAlways("E2E Pipeline Harness");
    logAlways("=".repeat(60));
    logAlways(`Mode: ${config.mode}`);
    logAlways(`Module: ${config.moduleId}`);
    logAlways(`Mock LLM: ${config.mode === "mock" || config.mockLlm}`);
    logAlways(`Mock Embeddings: ${config.mode === "mock" || config.mockEmbeddings}`);
    logAlways("");

    try {
        const report = await runPipeline(config);

        // Save report
        fs.writeFileSync(config.outputPath, JSON.stringify(report, null, 2));
        logAlways(`Report saved to: ${config.outputPath}`);

        // Print summary
        logAlways("");
        logAlways("=".repeat(60));
        logAlways("SUMMARY");
        logAlways("=".repeat(60));
        logAlways(`Status: ${report.status.toUpperCase()}`);
        logAlways(`Duration: ${report.duration_ms}ms`);
        logAlways(`Cards Generated: ${report.card_count || 0}`);
        logAlways(`Cards Verified: ${report.verified_count || 0}`);

        if (report.deck_path) {
            logAlways(`Deck Path: ${report.deck_path}`);
        }

        if (report.warnings.length > 0) {
            logAlways("");
            logAlways("Warnings:");
            report.warnings.forEach(w => logAlways(`  ⚠ ${w}`));
        }

        if (report.errors.length > 0) {
            logAlways("");
            logAlways("Errors:");
            report.errors.forEach(e => logAlways(`  ✗ ${e}`));
        }

        logAlways("");
        logAlways("Stage Results:");
        for (const [name, stage] of Object.entries(report.stages)) {
            const icon = stage.status === "success" ? "✓" : stage.status === "skipped" ? "○" : "✗";
            logAlways(`  ${icon} ${name}: ${stage.status} (${stage.duration_ms}ms)`);
        }

        // Exit code
        if (report.status === "failed") {
            logAlways("");
            logAlways("REMEDIATION:");
            if (report.errors.some(e => e.includes("Manifest"))) {
                logAlways("  - Ensure test/fixtures/e2e/sample_module_manifest.json exists");
            }
            if (report.errors.some(e => e.includes("No chunks"))) {
                logAlways("  - Check transcription or provide local chunks in manifest");
            }
            if (report.errors.some(e => e.includes("No cards"))) {
                logAlways("  - Verify LLM is responding correctly in real mode");
            }
            process.exit(1);
        }

        process.exit(0);

    } catch (error) {
        console.error("[E2E] Fatal error:", error);
        process.exit(1);
    }
}

main();
