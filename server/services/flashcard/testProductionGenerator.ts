/**
 * Production Flashcard Generator Test Script
 * 
 * Tests the complete flashcard generation pipeline:
 * 1. Content fetching from database
 * 2. Document extraction (Google Drive, OneDrive, Cloudinary)
 * 3. AI-powered flashcard generation
 * 
 * Usage:
 *   npx tsx server/services/flashcard/testProductionGenerator.ts [courseSlug] [moduleIndex]
 * 
 * Examples:
 *   npx tsx server/services/flashcard/testProductionGenerator.ts
 *   npx tsx server/services/flashcard/testProductionGenerator.ts introduction-to-accounting 0
 */

import mongoose from "mongoose";
import { generateFlashcardsForModule } from "./productionGenerator";
import { fetchModuleContent, listAllCourses, listCourseModules } from "./contentFetcher";
import { extractAllModuleContent } from "./productionDocumentExtractor";

// =============================================================================
// CONFIGURATION
// =============================================================================

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/agi";

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

async function testContentFetching(courseSlug: string, moduleIndex: number): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 1: Content Fetching");
    console.log("=".repeat(60));

    try {
        const content = await fetchModuleContent({
            courseSlug,
            moduleIndex,
            includeRecordings: true,
        });

        console.log(`\n✅ Module: ${content.module_title}`);
        console.log(`   Course: ${content.course_title}`);
        console.log(`   Module ID: ${content.module_id}`);

        console.log(`\n📄 Documents (${content.documents.length}):`);
        for (const doc of content.documents) {
            console.log(`   - ${doc.title}`);
            console.log(`     Provider: ${doc.provider}`);
            console.log(`     URL: ${doc.url.substring(0, 60)}...`);
        }

        console.log(`\n🎬 Videos (${content.videos.length}):`);
        for (const video of content.videos) {
            console.log(`   - ${video.title} (${video.duration} min)`);
            console.log(`     Provider: ${video.provider}`);
        }

        console.log(`\n🎙️ Recordings (${content.recordings.length}):`);
        for (const rec of content.recordings) {
            console.log(`   - ${rec.title}`);
            console.log(`     Date: ${rec.date.toISOString().split("T")[0]}`);
        }

        return;
    } catch (error) {
        console.error("❌ Content fetching failed:", error);
        throw error;
    }
}

async function testDocumentExtraction(courseSlug: string, moduleIndex: number): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 2: Document Extraction");
    console.log("=".repeat(60));

    try {
        const content = await fetchModuleContent({
            courseSlug,
            moduleIndex,
            includeRecordings: true,
        });

        console.log(`\nExtracting content from ${content.documents.length} documents, ${content.videos.length} videos, ${content.recordings.length} recordings...`);

        const result = await extractAllModuleContent(
            content.documents,
            content.videos,
            content.recordings,
            { useGeminiForExtraction: true }
        );

        console.log(`\n✅ Extraction Results:`);
        console.log(`   Total: ${result.totalExtracted}`);
        console.log(`   Successful: ${result.successCount}`);
        console.log(`   Failed: ${result.failedCount}`);
        console.log(`   Methods used:`, result.methods);

        console.log(`\n📝 Extracted Content Samples:`);
        for (const doc of result.documents.slice(0, 3)) {
            console.log(`\n   ${doc.title}:`);
            console.log(`   - Method: ${doc.metadata.method}`);
            console.log(`   - Success: ${doc.metadata.success}`);
            console.log(`   - Tokens: ${doc.tokens_est}`);
            console.log(`   - Preview: ${doc.text.substring(0, 200).replace(/\n/g, " ")}...`);
        }

    } catch (error) {
        console.error("❌ Document extraction failed:", error);
        throw error;
    }
}

async function testFlashcardGeneration(courseSlug: string, moduleIndex: number): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 3: Flashcard Generation");
    console.log("=".repeat(60));

    try {
        const result = await generateFlashcardsForModule({
            courseSlug,
            moduleIndex,
            cardCount: 10,
        });

        if (!result.success) {
            console.error(`\n❌ Generation failed: ${result.error}`);
            console.log("Metadata:", result.metadata);
            return;
        }

        console.log(`\n✅ Generation Successful!`);
        console.log(`   Cards generated: ${result.deck!.cards.length}`);
        console.log(`   Processing time: ${result.metadata.processingTimeMs}ms`);
        console.log(`   Documents processed: ${result.metadata.documentsProcessed}`);
        console.log(`   Videos processed: ${result.metadata.videosProcessed}`);
        console.log(`   Extraction methods:`, result.metadata.extractionMethods);

        console.log(`\n📚 Generated Flashcards:`);
        console.log("-".repeat(60));

        for (const card of result.deck!.cards) {
            console.log(`\n[${card.card_id}] (${card.difficulty})`);
            console.log(`Q: ${card.q}`);
            console.log(`A: ${card.a}`);
            console.log(`Bloom: ${card.bloom_level} | Confidence: ${(card.confidence_score * 100).toFixed(0)}%`);
            if (card.evidence.length > 0) {
                console.log(`Evidence: "${card.evidence[0].excerpt.substring(0, 80)}..."`);
            }
        }

        // Summary statistics
        console.log("\n" + "=".repeat(60));
        console.log("SUMMARY STATISTICS");
        console.log("=".repeat(60));

        const difficultyCount = {
            easy: result.deck!.cards.filter(c => c.difficulty === "easy").length,
            medium: result.deck!.cards.filter(c => c.difficulty === "medium").length,
            hard: result.deck!.cards.filter(c => c.difficulty === "hard").length,
        };

        const bloomCount: Record<string, number> = {};
        for (const card of result.deck!.cards) {
            bloomCount[card.bloom_level] = (bloomCount[card.bloom_level] || 0) + 1;
        }

        console.log(`\nDifficulty Distribution:`);
        console.log(`   Easy: ${difficultyCount.easy}`);
        console.log(`   Medium: ${difficultyCount.medium}`);
        console.log(`   Hard: ${difficultyCount.hard}`);

        console.log(`\nBloom's Taxonomy Distribution:`);
        for (const [level, count] of Object.entries(bloomCount)) {
            console.log(`   ${level}: ${count}`);
        }

        const avgConfidence = result.deck!.cards.reduce((sum, c) => sum + c.confidence_score, 0) / result.deck!.cards.length;
        console.log(`\nAverage Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

        if (result.deck!.warnings.length > 0) {
            console.log(`\n⚠️ Warnings:`);
            for (const warning of result.deck!.warnings) {
                console.log(`   - ${warning}`);
            }
        }

    } catch (error) {
        console.error("❌ Flashcard generation failed:", error);
        throw error;
    }
}

async function listAvailableCourses(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("AVAILABLE COURSES");
    console.log("=".repeat(60));

    try {
        const courses = await listAllCourses(false);

        console.log(`\nFound ${courses.length} courses:\n`);

        for (const course of courses) {
            console.log(`📘 ${course.title}`);
            console.log(`   Slug: ${course.slug}`);
            console.log(`   Modules: ${course.moduleCount}`);

            // List modules
            try {
                const modules = await listCourseModules(course.slug, false);
                for (const mod of modules.slice(0, 3)) {
                    console.log(`   - [${mod.index}] ${mod.title} (${mod.documentCount} docs, ${mod.videoCount} videos)`);
                }
                if (modules.length > 3) {
                    console.log(`   ... and ${modules.length - 3} more modules`);
                }
            } catch {
                // Ignore module listing errors
            }
            console.log();
        }

    } catch (error) {
        console.error("❌ Failed to list courses:", error);
    }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("PRODUCTION FLASHCARD GENERATOR TEST");
    console.log("=".repeat(60));

    // Check for required environment variables
    if (!process.env.GEMINI_API_KEY) {
        console.error("\n❌ GEMINI_API_KEY environment variable is required");
        process.exit(1);
    }

    // Connect to MongoDB
    console.log(`\nConnecting to MongoDB: ${MONGODB_URI.substring(0, 30)}...`);
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        process.exit(1);
    }

    // Parse command line arguments
    const args = process.argv.slice(2);
    let courseSlug = args[0];
    let moduleIndex = parseInt(args[1], 10);

    // If no arguments, list courses and pick the first one
    if (!courseSlug) {
        await listAvailableCourses();

        const courses = await listAllCourses(false);
        if (courses.length === 0) {
            console.log("\n❌ No courses found in database");
            await mongoose.disconnect();
            process.exit(1);
        }

        // Find a course with modules
        for (const course of courses) {
            if (course.moduleCount > 0) {
                courseSlug = course.slug;
                moduleIndex = 0;
                console.log(`\n📌 Using first available course: ${courseSlug}`);
                break;
            }
        }

        if (!courseSlug) {
            console.log("\n❌ No courses with modules found");
            await mongoose.disconnect();
            process.exit(1);
        }
    }

    if (isNaN(moduleIndex)) {
        moduleIndex = 0;
    }

    console.log(`\n🎯 Testing with: ${courseSlug} / module ${moduleIndex}`);

    try {
        // Run tests
        await testContentFetching(courseSlug, moduleIndex);
        await testDocumentExtraction(courseSlug, moduleIndex);
        await testFlashcardGeneration(courseSlug, moduleIndex);

        console.log("\n" + "=".repeat(60));
        console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY");
        console.log("=".repeat(60) + "\n");

    } catch (error) {
        console.error("\n❌ Test failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

// Run if executed directly
main().catch(console.error);
