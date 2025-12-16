/**
 * Test OpenAI GPT-5 API Connection
 */

import dotenv from "dotenv";
dotenv.config();

import { testOpenAIConnection, generateContent } from "./openaiClient";

async function testGPT5() {
    console.log("Testing OpenAI GPT-5 API...\n");
    console.log("=".repeat(60));

    // Test 1: Connection test
    console.log("\n1. Testing GPT-5 API connection...");
    const isConnected = await testOpenAIConnection();
    
    if (!isConnected) {
        console.log("❌ GPT-5 connection failed");
        return;
    }
    console.log("✅ GPT-5 API connected successfully!");

    // Test 2: Generate sample content
    console.log("\n2. Testing content generation with GPT-5...");
    
    const testPrompt = `Create 2 interview flashcards about Supply Chain Management.

Return ONLY valid JSON:
{
  "cards": [
    {"q": "Question?", "a": "Answer"}
  ]
}`;

    try {
        const response = await generateContent(testPrompt, {
            maxTokens: 500,
        });

        console.log("\nResponse:");
        console.log(response);

        // Try to parse JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("\n✅ JSON parsed successfully!");
            console.log(`Generated ${parsed.cards?.length || 0} cards`);
            
            if (parsed.cards && parsed.cards.length > 0) {
                console.log("\nSample cards:");
                for (const card of parsed.cards) {
                    console.log(`Q: ${card.q}`);
                    console.log(`A: ${card.a}`);
                    console.log("---");
                }
            }
        }
    } catch (error) {
        console.error("❌ Generation failed:", error);
    }

    console.log("\n" + "=".repeat(60));
    console.log("GPT-5 Test complete!");
}

testGPT5();
