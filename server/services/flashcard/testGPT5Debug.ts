/**
 * Debug GPT-5 API Response
 */

import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testGPT5Debug() {
    console.log("Testing GPT-5 API (Debug Mode)...\n");

    const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-5",
            messages: [
                { role: "user", content: "Say hello" }
            ],
            max_completion_tokens: 100,
        }),
    });

    console.log("Status:", response.status);
    
    const data = await response.json();
    console.log("\nFull Response:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices[0]) {
        console.log("\nMessage content:", data.choices[0].message?.content);
        console.log("Finish reason:", data.choices[0].finish_reason);
    }
}

testGPT5Debug();
