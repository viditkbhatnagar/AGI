/**
 * Flashcard Generation Test Script
 * 
 * Run with: npx tsx scripts/test-flashcards.ts
 * 
 * This script tests the flashcard generation pipeline by:
 * 1. Connecting to MongoDB
 * 2. Fetching a course and module
 * 3. Generating flashcards in mock mode
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../server/db";

// Import the flashcard modules directly
import { fetchModuleContent, listAllCourses, listCourseModules, prepareChunksFromContent } from "../server/services/flashcard/contentFetcher";
import { runStageAMock, runStageA } from "../server/services/flashcard/orchestrator/stageA";
import { runStageBMock, runStageB } from "../server/services/flashcard/orchestrator/stageB";
import { verifyCardsBatch } from "../server/services/flashcard/verification/evidenceVerifier";

async function main() {
    console.log("=".repeat(60));
    console.log("Flashcard Generation Test");
    console.log("=".repeat(60));

    // Parse arguments
    const args = process.argv.slice(2);
    const mockMode = !args.includes("--real");
    const extractContent = args.includes("--extract");
    const courseSlug = args.find(a => a.startsWith("--course="))?.split("=")[1];
    const moduleIndex = parseInt(args.find(a => a.startsWith("--module="))?.split("=")[1] || "0");

    console.log(`Mode: ${mockMode ? "MOCK" : "REAL"}`);
    console.log(`Extract Content: ${extractContent ? "YES" : "NO"}`);
    console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "Set" : "NOT SET"}`);
    console.log("");

    try {
        // Connect to MongoDB
        console.log("[1] Connecting to MongoDB...");
        await connectDB();
        console.log("    ✓ Connected");

        // List available courses
        console.log("\n[2] Fetching available courses...");
        const courses = await listAllCourses(true);
        console.log(`    ✓ Found ${courses.length} courses`);

        if (courses.length === 0) {
            console.log("    ✗ No courses found in database!");
            return;
        }

        // Show first 5 courses
        console.log("\n    Available courses:");
        courses.slice(0, 5).forEach((c, i) => {
            console.log(`    ${i + 1}. ${c.slug} - "${c.title}" (${c.moduleCount} modules)`);
        });
        if (courses.length > 5) {
            console.log(`    ... and ${courses.length - 5} more`);
        }

        // Select course
        const targetCourse = courseSlug || courses[0].slug;
        console.log(`\n[3] Selected course: ${targetCourse}`);

        // List modules for selected course
        const modules = await listCourseModules(targetCourse, false);
        console.log(`    ✓ Found ${modules.length} modules`);

        if (modules.length === 0) {
            console.log("    ✗ No modules found!");
            return;
        }

        // Show modules
        console.log("\n    Modules:");
        modules.forEach((m) => {
            console.log(`    - Module ${m.index}: "${m.title}" (${m.documentCount} docs, ${m.videoCount} videos)`);
        });

        // Fetch module content
        const targetModuleIndex = Math.min(moduleIndex, modules.length - 1);
        console.log(`\n[4] Fetching content for module ${targetModuleIndex}...`);

        const content = await fetchModuleContent({
            courseSlug: targetCourse,
            moduleIndex: targetModuleIndex,
            isSandbox: false,
            includeRecordings: true,
        });

        console.log(`    ✓ Module: ${content.module_title}`);
        console.log(`    ✓ Documents: ${content.documents.length}`);
        console.log(`    ✓ Videos: ${content.videos.length}`);
        console.log(`    ✓ Recordings: ${content.recordings.length}`);

        // Show document sources
        if (content.documents.length > 0) {
            console.log("\n    Documents:");
            content.documents.forEach((d, i) => {
                console.log(`    ${i + 1}. [${d.provider}] ${d.title}`);
            });
        }

        // Prepare chunks
        console.log("\n[5] Preparing chunks for generation...");
        if (extractContent) {
            console.log("    Using document content extraction...");
        }
        const chunks = await prepareChunksFromContent(content, {
            extractContent,
            useGeminiForExtraction: !mockMode && extractContent,
        });
        console.log(`    ✓ Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
            console.log("    ✗ No chunks to process!");
            return;
        }

        // Run StageA
        console.log("\n[6] Running StageA (content analysis)...");
        const stageAOutput = mockMode
            ? runStageAMock(chunks, content.module_id, content.module_title)
            : await runStageA(chunks, content.module_id, content.module_title);

        console.log(`    ✓ Learning objectives: ${stageAOutput.learning_objectives.length}`);
        console.log(`    ✓ Key terms: ${stageAOutput.key_terms.length}`);
        console.log(`    ✓ Difficulty: ${stageAOutput.estimated_difficulty}`);
        console.log(`    ✓ Processing time: ${stageAOutput.processing_time_ms}ms`);

        // Run StageB
        console.log("\n[7] Running StageB (flashcard generation)...");
        const stageBOutput = mockMode
            ? runStageBMock(chunks, content.module_id, stageAOutput.learning_objectives, 10)
            : await runStageB(chunks, content.module_id, stageAOutput.learning_objectives, 10);

        console.log(`    ✓ Cards generated: ${stageBOutput.generated_count}`);
        console.log(`    ✓ Warnings: ${stageBOutput.warnings.length}`);
        console.log(`    ✓ Processing time: ${stageBOutput.processing_time_ms}ms`);

        // Verify cards
        console.log("\n[8] Verifying cards...");
        const cardsToVerify = stageBOutput.cards.map(c => ({
            question: c.question,
            answer: c.answer,
            evidence: c.evidence,
            rationale: c.rationale,
        }));

        const verificationResults = await verifyCardsBatch(cardsToVerify, "heuristic");
        console.log(`    ✓ Verified: ${verificationResults.total_verified}/${verificationResults.results.length}`);
        console.log(`    ✓ Verification rate: ${(verificationResults.verification_rate * 100).toFixed(1)}%`);

        // Show sample cards
        console.log("\n[9] Sample generated cards:");
        console.log("-".repeat(60));

        stageBOutput.cards.slice(0, 3).forEach((card, i) => {
            console.log(`\nCard ${i + 1}: [${card.bloom_level}] [${card.difficulty}]`);
            console.log(`Q: ${card.question}`);
            console.log(`A: ${card.answer.substring(0, 150)}${card.answer.length > 150 ? "..." : ""}`);
            console.log(`Verified: ${verificationResults.results[i]?.verified ? "✓" : "✗"}`);
        });

        console.log("\n" + "=".repeat(60));
        console.log("TEST COMPLETE");
        console.log("=".repeat(60));
        console.log(`\nSummary:`);
        console.log(`  Course: ${content.course_title}`);
        console.log(`  Module: ${content.module_title}`);
        console.log(`  Cards Generated: ${stageBOutput.generated_count}`);
        console.log(`  Cards Verified: ${verificationResults.total_verified}`);
        console.log(`  Total Time: ${stageAOutput.processing_time_ms + stageBOutput.processing_time_ms}ms`);

    } catch (error) {
        console.error("\n✗ Error:", error);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
