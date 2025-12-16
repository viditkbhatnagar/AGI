/**
 * Test OpenRouter API Connection
 * 
 * Run with: npx tsx server/services/flashcard/testOpenRouter.ts
 */

import { testOpenRouterConnection, generateContent } from "./openRouterClient";

async function main() {
    console.log("=".repeat(60));
    console.log("Testing OpenRouter API Connection");
    console.log("=".repeat(60));

    // Test 1: Basic connection
    console.log("\n1. Testing basic connection...");
    const isConnected = await testOpenRouterConnection();
    console.log(`   Result: ${isConnected ? "✅ Connected" : "❌ Failed"}`);

    if (!isConnected) {
        console.log("\n❌ API connection failed. Please check your API key.");
        process.exit(1);
    }

    // Test 2: Generate educational content
    console.log("\n2. Testing content generation...");
    try {
        const content = await generateContent(
            "Generate 2 flashcard questions about basic accounting principles. Return as JSON with format: {\"cards\": [{\"q\": \"question\", \"a\": \"answer\"}]}",
            {
                temperature: 0.1,
                maxTokens: 500,
            }
        );
        console.log("   Generated content:");
        console.log(content);
        console.log("   ✅ Content generation successful");
    } catch (error) {
        console.error("   ❌ Content generation failed:", error);
    }

    console.log("\n" + "=".repeat(60));
    console.log("Test complete!");
    console.log("=".repeat(60));
}

main().catch(console.error);
