/**
 * Quick Test Script for Flashcard Generation
 * 
 * Run with: npx tsx server/services/flashcard/quickTest.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function quickTest() {
    console.log("=".repeat(60));
    console.log("Quick Flashcard Generation Test");
    console.log("=".repeat(60));

    // Check environment
    console.log("\n1. Checking environment...");
    console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "✅ Set" : "❌ Missing"}`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? "✅ Set" : "❌ Missing"}`);

    if (!process.env.GEMINI_API_KEY) {
        console.error("\n❌ GEMINI_API_KEY is required!");
        process.exit(1);
    }

    // Connect to MongoDB
    console.log("\n2. Connecting to MongoDB...");
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/agi";
    
    try {
        await mongoose.connect(mongoUri);
        console.log("   ✅ Connected to MongoDB");
    } catch (error) {
        console.error("   ❌ MongoDB connection failed:", error);
        process.exit(1);
    }

    // Import modules after mongoose is connected
    const { listAllCourses, listCourseModules, fetchModuleContent } = await import("./contentFetcher");
    const { generateFlashcardsForModule } = await import("./productionGenerator");

    // List courses
    console.log("\n3. Listing available courses...");
    try {
        const courses = await listAllCourses(false);
        console.log(`   Found ${courses.length} courses`);
        
        if (courses.length === 0) {
            console.log("   ❌ No courses found in database");
            await mongoose.disconnect();
            process.exit(1);
        }

        // Find a course with modules
        let testCourse = null;
        let testModuleIndex = 0;

        for (const course of courses) {
            if (course.moduleCount > 0) {
                testCourse = course;
                break;
            }
        }

        if (!testCourse) {
            console.log("   ❌ No courses with modules found");
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`   Using course: ${testCourse.title} (${testCourse.slug})`);

        // Get module info
        console.log("\n4. Fetching module content...");
        const content = await fetchModuleContent({
            courseSlug: testCourse.slug,
            moduleIndex: testModuleIndex,
            includeRecordings: true,
        });

        console.log(`   Module: ${content.module_title}`);
        console.log(`   Documents: ${content.documents.length}`);
        console.log(`   Videos: ${content.videos.length}`);
        console.log(`   Recordings: ${content.recordings.length}`);

        if (content.documents.length === 0 && content.videos.length === 0) {
            console.log("   ⚠️ No content in this module, trying next...");
            
            // Try to find a module with content
            const modules = await listCourseModules(testCourse.slug, false);
            for (const mod of modules) {
                if (mod.documentCount > 0 || mod.videoCount > 0) {
                    testModuleIndex = mod.index;
                    console.log(`   Found module with content: ${mod.title} (index ${mod.index})`);
                    break;
                }
            }
        }

        // Generate flashcards
        console.log("\n5. Generating flashcards...");
        console.log("   This may take 30-60 seconds...\n");

        const result = await generateFlashcardsForModule({
            courseSlug: testCourse.slug,
            moduleIndex: testModuleIndex,
            cardCount: 5, // Generate 5 cards for quick test
        });

        if (result.success && result.deck) {
            console.log("   ✅ Generation successful!");
            console.log(`   Generated ${result.deck.cards.length} flashcards`);
            console.log(`   Processing time: ${result.metadata.processingTimeMs}ms`);

            console.log("\n6. Sample flashcards:");
            for (const card of result.deck.cards.slice(0, 3)) {
                console.log(`\n   [${card.difficulty.toUpperCase()}] ${card.card_id}`);
                console.log(`   Q: ${card.q}`);
                console.log(`   A: ${card.a.substring(0, 100)}${card.a.length > 100 ? "..." : ""}`);
            }
        } else {
            console.log("   ❌ Generation failed:", result.error);
        }

    } catch (error) {
        console.error("   ❌ Error:", error);
    }

    // Disconnect
    await mongoose.disconnect();
    console.log("\n" + "=".repeat(60));
    console.log("Test complete!");
    console.log("=".repeat(60));
}

quickTest().catch(console.error);
