/**
 * Test Real Module Content Extraction (READ ONLY)
 * 
 * This test:
 * 1. Connects to the database (READ ONLY)
 * 2. Fetches a real module with documents
 * 3. Extracts content from the documents
 * 4. Shows what content would be used for flashcard generation
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fetchModuleContent } from "./contentFetcher";
import { extractAllModuleContent } from "./productionDocumentExtractor";

dotenv.config();

async function testRealModuleExtraction() {
    console.log("Testing Real Module Content Extraction (READ ONLY)...\n");
    console.log("=".repeat(60));

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/agi";
    
    try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB (READ ONLY)\n");

        // Test with Supply Chain course, Module 0
        const courseSlug = "certified-supply-chain-professional";
        const moduleIndex = 0;

        console.log(`Fetching module: ${courseSlug}/module-${moduleIndex}\n`);

        // Step 1: Fetch module content from database
        const moduleContent = await fetchModuleContent({
            courseSlug,
            moduleIndex,
            includeRecordings: false,
        });

        console.log(`Module: ${moduleContent.module_title}`);
        console.log(`Course: ${moduleContent.course_title}`);
        console.log(`Documents: ${moduleContent.documents.length}`);
        console.log(`Videos: ${moduleContent.videos.length}`);

        // Show document details
        console.log("\n📄 Documents:");
        for (const doc of moduleContent.documents) {
            console.log(`  - ${doc.title}`);
            console.log(`    Provider: ${doc.provider}`);
            console.log(`    URL: ${doc.url.substring(0, 60)}...`);
        }

        // Step 2: Extract content from documents
        console.log("\n" + "=".repeat(60));
        console.log("Extracting content from documents...\n");

        const extractionResult = await extractAllModuleContent(
            moduleContent.documents,
            [], // Skip videos for this test
            [],
            { useGeminiForExtraction: false } // Don't use AI fallback, only real extraction
        );

        console.log(`\n✅ Extraction Results:`);
        console.log(`   Total: ${extractionResult.totalExtracted}`);
        console.log(`   Successful: ${extractionResult.successCount}`);
        console.log(`   Failed: ${extractionResult.failedCount}`);
        console.log(`   Methods:`, extractionResult.methods);

        // Show extracted content
        console.log("\n" + "=".repeat(60));
        console.log("📚 Extracted Content:\n");

        let totalChars = 0;
        for (const doc of extractionResult.documents) {
            console.log(`\n${doc.title}:`);
            console.log(`   Method: ${doc.metadata.method}`);
            console.log(`   Success: ${doc.metadata.success}`);
            console.log(`   Length: ${doc.text.length} characters`);
            totalChars += doc.text.length;
            
            // Show preview
            if (doc.text.length > 100) {
                console.log(`   Preview: ${doc.text.substring(0, 300).replace(/\n/g, ' ')}...`);
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log(`📊 Summary:`);
        console.log(`   Total extracted text: ${totalChars} characters`);
        console.log(`   Estimated tokens: ~${Math.ceil(totalChars / 4)}`);
        
        if (totalChars > 5000) {
            console.log(`\n✅ GOOD! Substantial content extracted for flashcard generation.`);
        } else if (totalChars > 1000) {
            console.log(`\n⚠️ Some content extracted, but may need AI enhancement.`);
        } else {
            console.log(`\n❌ Limited content extracted. Will need AI fallback.`);
        }

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB");

    } catch (error) {
        console.error("❌ Error:", error);
        await mongoose.disconnect();
    }
}

testRealModuleExtraction();
