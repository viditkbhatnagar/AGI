/**
 * Test Full Flashcard Generation with Real Content (READ ONLY on DB)
 * 
 * This test:
 * 1. Connects to the database (READ ONLY)
 * 2. Fetches a real module with documents
 * 3. Extracts content from the documents
 * 4. Generates flashcards using OpenRouter
 * 5. Shows the generated flashcards
 * 
 * NOTE: This does NOT save anything to the database
 */

// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { generateFlashcardsForModule } from "./productionGenerator";

async function testFullGeneration() {
    console.log("Testing Full Flashcard Generation with Real Content...\n");
    console.log("=".repeat(60));
    console.log("NOTE: This is READ ONLY - no data will be saved to the database");
    console.log("=".repeat(60));

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/agi";
    
    try {
        await mongoose.connect(mongoUri);
        console.log("\n✅ Connected to MongoDB (READ ONLY)\n");

        // Test with Supply Chain course, Module 0
        const courseSlug = "certified-supply-chain-professional";
        const moduleIndex = 0;

        console.log(`Generating flashcards for: ${courseSlug}/module-${moduleIndex}\n`);
        console.log("This may take 1-2 minutes...\n");

        const startTime = Date.now();

        // Generate flashcards (this reads from DB but doesn't write)
        const result = await generateFlashcardsForModule({
            courseSlug,
            moduleIndex,
            cardCount: 10,
        });

        const duration = Date.now() - startTime;

        console.log("\n" + "=".repeat(60));
        console.log("📊 Generation Results:\n");

        if (result.success && result.deck) {
            console.log(`✅ SUCCESS!`);
            console.log(`   Generated: ${result.deck.cards.length} flashcards`);
            console.log(`   Processing time: ${duration}ms`);
            console.log(`   Model: ${result.metadata.model}`);

            console.log("\n" + "=".repeat(60));
            console.log("📚 Generated Flashcards:\n");

            for (let i = 0; i < result.deck.cards.length; i++) {
                const card = result.deck.cards[i];
                console.log(`\n[${i + 1}] ${card.difficulty.toUpperCase()}`);
                console.log(`Q: ${card.q}`);
                console.log(`A: ${card.a}`);
                console.log(`Confidence: ${(card.confidence_score * 100).toFixed(0)}%`);
                if (card.evidence && card.evidence.length > 0) {
                    console.log(`Source: ${card.evidence[0].source_file}`);
                }
            }

            console.log("\n" + "=".repeat(60));
            console.log("✅ Test completed successfully!");
            console.log("   Flashcards were generated from REAL document content.");
            console.log("   No data was saved to the database.");

        } else {
            console.log(`❌ FAILED: ${result.error}`);
        }

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB");

    } catch (error) {
        console.error("❌ Error:", error);
        await mongoose.disconnect();
    }
}

testFullGeneration();
