#!/usr/bin/env npx ts-node
/**
 * Prompt Tuner CLI
 * 
 * Interactive tool for SMEs to test, compare, and approve few-shot examples
 * for the Flashcard Orchestrator pipeline.
 * 
 * Required Environment Variables (real mode only):
 *   GEMINI_API_KEY or OPENAI_API_KEY - For LLM calls
 * 
 * Usage:
 *   # Test single example
 *   npx ts-node tools/prompt_tuner/run_prompt_tuner.ts \
 *     --example-file=hr_fewshots.json --example-id=hr-stageB-001
 * 
 *   # Test with custom sample chunks
 *   npx ts-node tools/prompt_tuner/run_prompt_tuner.ts \
 *     --example-file=new_example.json --sample-chunks=chunks.json --mode=real
 * 
 *   # Approve and save to library
 *   npx ts-node tools/prompt_tuner/run_prompt_tuner.ts \
 *     --example-file=draft.json --approve
 * 
 * Flags:
 *   --example-file=<path>   Path to few-shot JSON file (required)
 *   --example-id=<id>       Specific example ID to test
 *   --sample-chunks=<path>  JSON file with sample chunks to test against
 *   --mode=mock|real        Use mock or real LLM (default: mock)
 *   --compare               Show diff between old and new outputs
 *   --approve               Approve and save example to library
 *   --output-lib=<path>     Custom library output path
 *   --verbose               Enable verbose logging
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM compatibility: reconstruct __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// TYPES
// =============================================================================

interface FewShotExample {
    id: string;
    stage: "stageA" | "stageB";
    description: string;
    input: {
        chunk_text?: string;
        chunks?: string[];
        learning_objective?: string;
        module_title?: string;
    };
    output: {
        question?: string;
        answer?: string;
        summary?: string;
        learning_objectives?: string[];
        evidence_quote?: string;
        bloom_level?: string;
        difficulty?: string;
    };
    notes?: string;
    approved_by?: string;
    approved_at?: string;
}

interface FewShotLibrary {
    domain: string;
    version: string;
    description?: string;
    updated_at: string;
    examples: FewShotExample[];
}

interface Config {
    exampleFile: string;
    exampleId?: string;
    sampleChunksFile?: string;
    mode: "mock" | "real";
    compare: boolean;
    approve: boolean;
    outputLibPath: string;
    verbose: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

function parseArgs(): Config {
    const args = process.argv.slice(2);
    const config: Config = {
        exampleFile: "",
        mode: "mock",
        compare: false,
        approve: false,
        outputLibPath: path.join(
            __dirname,
            "../../server/services/flashcard/orchestrator/few_shot_library"
        ),
        verbose: false,
    };

    for (const arg of args) {
        const [key, value] = arg.replace(/^--/, "").split("=");
        switch (key) {
            case "example-file":
                config.exampleFile = value;
                break;
            case "example-id":
                config.exampleId = value;
                break;
            case "sample-chunks":
                config.sampleChunksFile = value;
                break;
            case "mode":
                config.mode = value as "mock" | "real";
                break;
            case "compare":
                config.compare = true;
                break;
            case "approve":
                config.approve = true;
                break;
            case "output-lib":
                config.outputLibPath = value;
                break;
            case "verbose":
                config.verbose = true;
                break;
        }
    }

    return config;
}

function log(config: Config, ...args: unknown[]): void {
    if (config.verbose) {
        console.log("[PromptTuner]", ...args);
    }
}

// =============================================================================
// MOCK LLM RESPONSES
// =============================================================================

function mockStageACall(chunks: string[]): {
    summary: string;
    learning_objectives: string[];
} {
    const combinedText = chunks.join(" ");
    const words = combinedText.split(" ").slice(0, 30).join(" ");

    return {
        summary: `Summary of content: ${words}... This section covers key concepts related to the topic.`,
        learning_objectives: [
            "Understand the main concepts presented",
            "Apply knowledge to practical scenarios",
            "Analyze relationships between ideas",
        ],
    };
}

function mockStageBCall(chunkText: string, learningObjective: string): {
    question: string;
    answer: string;
    evidence_quote: string;
    bloom_level: string;
    difficulty: string;
} {
    // Extract key terms from chunk
    const sentences = chunkText.split(/[.!?]+/).filter(s => s.trim());
    const firstSentence = sentences[0] || chunkText.substring(0, 100);
    const keyPhrase = firstSentence.substring(0, 50);

    return {
        question: `What does the content say about ${keyPhrase.toLowerCase().trim()}?`,
        answer: firstSentence.trim() + ".",
        evidence_quote: keyPhrase.trim(),
        bloom_level: "understand",
        difficulty: "medium",
    };
}

// =============================================================================
// REAL LLM CALLS
// =============================================================================

async function realStageACall(
    chunks: string[],
    moduleTitle: string
): Promise<{ summary: string; learning_objectives: string[] }> {
    try {
        const { runStageA } = await import(
            "../../server/services/flashcard/orchestrator/stageA"
        );
        const result = await runStageA(
            chunks.map((text, i) => ({
                chunk_id: `test-chunk-${i}`,
                text,
                source_file: "test",
                provider: "local" as const,
                slide_or_page: null,
                heading: null,
                tokens_est: text.split(" ").length,
            })),
            "test-module"
        );
        return {
            summary: result.summaries?.join("\n") || "",
            learning_objectives: result.learning_objectives || [],
        };
    } catch (error) {
        console.error("Real StageA call failed:", error);
        throw error;
    }
}

async function realStageBCall(
    chunkText: string,
    learningObjective: string
): Promise<{
    question: string;
    answer: string;
    evidence_quote: string;
    bloom_level: string;
    difficulty: string;
}> {
    try {
        const { runStageB } = await import(
            "../../server/services/flashcard/orchestrator/stageB"
        );
        const result = await runStageB(
            [
                {
                    chunk_id: "test-chunk-0",
                    text: chunkText,
                    source_file: "test",
                    provider: "local" as const,
                    slide_or_page: null,
                    heading: null,
                    tokens_est: chunkText.split(" ").length,
                },
            ],
            "test-module",
            [learningObjective]
        );

        const card = result.cards?.[0];
        return {
            question: card?.question || "",
            answer: card?.answer || "",
            evidence_quote: card?.evidence?.[0]?.text || "",
            bloom_level: card?.bloom_level || "understand",
            difficulty: card?.difficulty || "medium",
        };
    } catch (error) {
        console.error("Real StageB call failed:", error);
        throw error;
    }
}

// =============================================================================
// DIFF UTILITY
// =============================================================================

function showDiff(expected: object, actual: object): void {
    console.log("\n" + "=".repeat(60));
    console.log("COMPARISON");
    console.log("=".repeat(60));

    const expectedStr = JSON.stringify(expected, null, 2);
    const actualStr = JSON.stringify(actual, null, 2);

    const expectedLines = expectedStr.split("\n");
    const actualLines = actualStr.split("\n");

    console.log("\n--- Expected (from example) ---");
    console.log(expectedStr);

    console.log("\n--- Actual (from LLM) ---");
    console.log(actualStr);

    // Simple line-by-line comparison
    console.log("\n--- Differences ---");
    let hasDiff = false;
    const maxLines = Math.max(expectedLines.length, actualLines.length);

    for (let i = 0; i < maxLines; i++) {
        const exp = expectedLines[i] || "";
        const act = actualLines[i] || "";

        if (exp !== act) {
            hasDiff = true;
            console.log(`Line ${i + 1}:`);
            console.log(`  - ${exp}`);
            console.log(`  + ${act}`);
        }
    }

    if (!hasDiff) {
        console.log("No differences found!");
    }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

async function testExample(
    example: FewShotExample,
    config: Config,
    sampleChunks?: string[]
): Promise<object> {
    console.log("\n" + "=".repeat(60));
    console.log(`Testing: ${example.id}`);
    console.log(`Stage: ${example.stage}`);
    console.log(`Description: ${example.description}`);
    console.log("=".repeat(60));

    let result: object;

    if (example.stage === "stageA") {
        const chunks = sampleChunks || example.input.chunks || [];
        console.log(`\nInput: ${chunks.length} chunks`);

        if (config.mode === "real") {
            result = await realStageACall(chunks, example.input.module_title || "");
        } else {
            result = mockStageACall(chunks);
        }
    } else {
        // StageB
        const chunkText = sampleChunks?.[0] || example.input.chunk_text || "";
        const learningObjective = example.input.learning_objective || "";

        console.log(`\nInput chunk (${chunkText.length} chars):`);
        console.log(chunkText.substring(0, 200) + "...");
        console.log(`\nLearning objective: ${learningObjective}`);

        if (config.mode === "real") {
            result = await realStageBCall(chunkText, learningObjective);
        } else {
            result = mockStageBCall(chunkText, learningObjective);
        }
    }

    console.log("\n--- Output ---");
    console.log(JSON.stringify(result, null, 2));

    if (config.compare) {
        showDiff(example.output, result);
    }

    return result;
}

async function promptForApproval(): Promise<{
    approved: boolean;
    approver: string;
}> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question("\nApprove this example? (y/n): ", (answer) => {
            if (answer.toLowerCase() === "y") {
                rl.question("Enter your email for approval record: ", (email) => {
                    rl.close();
                    resolve({ approved: true, approver: email || "anonymous" });
                });
            } else {
                rl.close();
                resolve({ approved: false, approver: "" });
            }
        });
    });
}

async function saveToLibrary(
    example: FewShotExample,
    config: Config
): Promise<void> {
    // Determine target file based on domain
    const domain = path.basename(config.exampleFile).split("_")[0] || "general";
    const targetFile = path.join(config.outputLibPath, `${domain}_fewshots.json`);

    let library: FewShotLibrary;

    if (fs.existsSync(targetFile)) {
        library = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
    } else {
        library = {
            domain,
            version: "1.0.0",
            updated_at: new Date().toISOString().split("T")[0],
            examples: [],
        };
    }

    // Update or add example
    const existingIndex = library.examples.findIndex((e) => e.id === example.id);
    if (existingIndex >= 0) {
        library.examples[existingIndex] = example;
        console.log(`Updated existing example: ${example.id}`);
    } else {
        library.examples.push(example);
        console.log(`Added new example: ${example.id}`);
    }

    library.updated_at = new Date().toISOString().split("T")[0];

    // Write back
    fs.writeFileSync(targetFile, JSON.stringify(library, null, 2));
    console.log(`Saved to: ${targetFile}`);
}

async function main(): Promise<void> {
    const config = parseArgs();

    console.log("=".repeat(60));
    console.log("Few-Shot Prompt Tuner");
    console.log("=".repeat(60));

    // Validate inputs
    if (!config.exampleFile) {
        console.error("Error: --example-file is required");
        console.error(
            "Usage: npx ts-node run_prompt_tuner.ts --example-file=examples.json"
        );
        process.exit(1);
    }

    // Resolve file path
    let examplePath = config.exampleFile;
    if (!path.isAbsolute(examplePath)) {
        // Check in library first
        const libraryPath = path.join(config.outputLibPath, examplePath);
        if (fs.existsSync(libraryPath)) {
            examplePath = libraryPath;
        } else if (!fs.existsSync(examplePath)) {
            console.error(`Error: File not found: ${examplePath}`);
            process.exit(1);
        }
    }

    console.log(`\nLoading examples from: ${examplePath}`);
    console.log(`Mode: ${config.mode}`);

    // Check credentials for real mode
    if (config.mode === "real") {
        if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
            console.warn(
                "Warning: Real mode requested but no API key found. Falling back to mock mode."
            );
            config.mode = "mock";
        }
    }

    // Load examples
    const library: FewShotLibrary = JSON.parse(
        fs.readFileSync(examplePath, "utf-8")
    );
    console.log(
        `Loaded ${library.examples.length} examples from domain: ${library.domain}`
    );

    // Load sample chunks if provided
    let sampleChunks: string[] | undefined;
    if (config.sampleChunksFile) {
        const chunksData = JSON.parse(
            fs.readFileSync(config.sampleChunksFile, "utf-8")
        );
        sampleChunks = chunksData.chunks?.map((c: any) => c.text) || chunksData;
        console.log(`Loaded ${sampleChunks?.length || 0} sample chunks`);
    }

    // Filter examples if specific ID provided
    const examples = config.exampleId
        ? library.examples.filter((e) => e.id === config.exampleId)
        : library.examples;

    if (examples.length === 0) {
        console.error(`No examples found${config.exampleId ? ` with ID: ${config.exampleId}` : ""}`);
        process.exit(1);
    }

    console.log(`\nTesting ${examples.length} example(s)...`);

    // Process each example
    for (const example of examples) {
        try {
            const result = await testExample(example, config, sampleChunks);

            if (config.approve) {
                const { approved, approver } = await promptForApproval();

                if (approved) {
                    example.approved_by = approver;
                    example.approved_at = new Date().toISOString().split("T")[0];
                    await saveToLibrary(example, config);
                } else {
                    console.log("Example not approved, skipping save.");
                }
            }
        } catch (error) {
            console.error(`Failed to test example ${example.id}:`, error);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Done!");
    console.log("=".repeat(60));
}

// =============================================================================
// ENTRY POINT
// =============================================================================

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
