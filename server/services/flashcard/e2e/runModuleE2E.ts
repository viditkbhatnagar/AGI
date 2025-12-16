/**
 * End-to-End Module Processing Test Harness
 * 
 * Runs a single module through the complete flashcard generation pipeline.
 * 
 * Usage:
 *   npm run e2e:module -- --module mod-sample
 *   npx tsx server/services/flashcard/e2e/runModuleE2E.ts --module mod-sample
 * 
 * Environment Variables:
 *   USE_LOCAL_CHUNKS=true    - Use local fixture chunks instead of vector DB
 *   GEMINI_API_KEY           - Required for real LLM calls
 *   MOCK_LLM=true            - Use mock LLM responses (for testing)
 */

import * as fs from "fs";
import * as path from "path";
import { processModuleStandalone } from "./processModuleStandalone";
import type { ModuleResult } from "../orchestratorTypes";

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

interface E2EOptions {
  moduleId: string;
  courseId: string;
  moduleTitle: string;
  useLocalChunks: boolean;
  mockLlm: boolean;
  verbose: boolean;
}

function parseArgs(): E2EOptions {
  const args = process.argv.slice(2);
  const options: E2EOptions = {
    moduleId: "mod-sample",
    courseId: "course-hr-101",
    moduleTitle: "HR Fundamentals - Module 1",
    useLocalChunks: process.env.USE_LOCAL_CHUNKS === "true",
    mockLlm: process.env.MOCK_LLM === "true",
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--module":
      case "-m":
        options.moduleId = args[++i];
        break;
      case "--course":
      case "-c":
        options.courseId = args[++i];
        break;
      case "--title":
      case "-t":
        options.moduleTitle = args[++i];
        break;
      case "--local-chunks":
        options.useLocalChunks = true;
        break;
      case "--mock-llm":
        options.mockLlm = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
End-to-End Module Processing Test Harness

Usage:
  npx tsx server/services/flashcard/e2e/runModuleE2E.ts [options]

Options:
  -m, --module <id>     Module ID to process (default: mod-sample)
  -c, --course <id>     Course ID (default: course-hr-101)
  -t, --title <title>   Module title (default: HR Fundamentals - Module 1)
  --local-chunks        Use local fixture chunks instead of vector DB
  --mock-llm            Use mock LLM responses (deterministic)
  -v, --verbose         Enable verbose logging
  -h, --help            Show this help message

Environment Variables:
  USE_LOCAL_CHUNKS=true   Same as --local-chunks
  MOCK_LLM=true           Same as --mock-llm
  GEMINI_API_KEY          Required for real LLM calls

Examples:
  # Run with local chunks and mock LLM (no API calls)
  USE_LOCAL_CHUNKS=true MOCK_LLM=true npx tsx server/services/flashcard/e2e/runModuleE2E.ts

  # Run with real vector DB and real LLM
  GEMINI_API_KEY=your-key npx tsx server/services/flashcard/e2e/runModuleE2E.ts --module mod-hr-101
`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const options = parseArgs();
  const startTime = Date.now();

  console.log("=".repeat(70));
  console.log("Flashcard Orchestrator - E2E Module Processing");
  console.log("=".repeat(70));
  console.log(`Module ID:       ${options.moduleId}`);
  console.log(`Course ID:       ${options.courseId}`);
  console.log(`Module Title:    ${options.moduleTitle}`);
  console.log(`Use Local Chunks: ${options.useLocalChunks}`);
  console.log(`Mock LLM:        ${options.mockLlm}`);
  console.log("=".repeat(70));
  console.log("");

  // Set environment flags for the processor
  if (options.useLocalChunks) {
    process.env.USE_LOCAL_CHUNKS = "true";
  }
  if (options.mockLlm) {
    process.env.MOCK_LLM = "true";
  }

  try {
    // Run the module processing
    console.log("[E2E] Starting module processing...\n");

    const result = await processModuleStandalone({
      module_id: options.moduleId,
      course_id: options.courseId,
      module_title: options.moduleTitle,
    });

    const totalTime = Date.now() - startTime;

    // Print results
    console.log("\n" + "=".repeat(70));
    console.log("RESULTS");
    console.log("=".repeat(70));
    console.log(`Status:           ${result.status}`);
    console.log(`Generated Count:  ${result.generated_count}`);
    console.log(`Verified Count:   ${result.verified_count}`);
    console.log(`Deck ID:          ${result.deck_id || "N/A"}`);
    console.log(`Total Time:       ${totalTime}ms`);
    console.log(`API Calls:        ${result.metrics.api_calls}`);
    console.log(`Chunks Retrieved: ${result.metrics.chunks_retrieved}`);
    console.log(`Verification Rate: ${(result.metrics.verification_rate * 100).toFixed(1)}%`);

    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      result.warnings.forEach((w: string, i: number) => console.log(`  ${i + 1}. ${w}`));
    }

    if (result.error_message) {
      console.log(`\nError: ${result.error_message}`);
    }

    // Write result summary to file
    const summaryPath = path.join(
      process.cwd(),
      "server",
      "tmp",
      "e2e-results",
      `${options.moduleId}-${Date.now()}.json`
    );

    const summaryDir = path.dirname(summaryPath);
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }

    fs.writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          options,
          result,
          total_time_ms: totalTime,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );

    console.log(`\nResult summary saved to: ${summaryPath}`);

    if (result.deck_id) {
      const deckPath = path.join(
        process.cwd(),
        "server",
        "tmp",
        "decks",
        `${options.moduleId}-*.json`
      );
      console.log(`Deck JSON saved to: ${deckPath.replace("*", "<timestamp>")}`);
    }

    console.log("\n" + "=".repeat(70));

    // Exit with appropriate code
    if (result.status === "FAILED") {
      process.exit(1);
    } else if (result.status === "NEED_MORE_CONTENT") {
      console.log("\n[E2E] Module needs more content - transcription job queued");
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n[E2E] Fatal error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();

export { parseArgs, E2EOptions };
