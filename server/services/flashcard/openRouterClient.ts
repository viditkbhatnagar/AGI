/**
 * OpenRouter API Client
 * 
 * Uses OpenRouter to access various AI models including GPT-5.2
 */

// OpenRouter API configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

// Default model - Using Llama 3.3 70B (FREE on OpenRouter)
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export interface OpenRouterMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface OpenRouterResponse {
    id: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Call OpenRouter API
 */
export async function callOpenRouter(
    messages: OpenRouterMessage[],
    options: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    } = {}
): Promise<string> {
    const { 
        model = DEFAULT_MODEL, 
        temperature = 0.1, 
        maxTokens = 2000 // Reduced to stay within credit limits
    } = options;

    console.log(`[OpenRouter] Calling model: ${model}`);

    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://americanglobalinstitute.com",
            "X-Title": "AGI Flashcard Generator",
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenRouter] API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
        throw new Error("OpenRouter returned no choices");
    }

    const content = data.choices[0].message.content;
    console.log(`[OpenRouter] Response received: ${content.length} chars`);
    
    return content;
}

/**
 * Test the OpenRouter API connection
 */
export async function testOpenRouterConnection(): Promise<boolean> {
    try {
        console.log("[OpenRouter] Testing API connection...");
        
        const response = await callOpenRouter([
            { role: "user", content: "Say 'Hello, API is working!' in exactly those words." }
        ], {
            model: DEFAULT_MODEL,
            temperature: 0,
            maxTokens: 50,
        });

        console.log(`[OpenRouter] Test response: ${response}`);
        return response.toLowerCase().includes("hello") || response.toLowerCase().includes("working");
    } catch (error) {
        console.error("[OpenRouter] Connection test failed:", error);
        return false;
    }
}

/**
 * Generate content using OpenRouter
 */
export async function generateContent(prompt: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}): Promise<string> {
    const messages: OpenRouterMessage[] = [];
    
    if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
    }
    
    messages.push({ role: "user", content: prompt });
    
    return callOpenRouter(messages, options);
}

export default {
    callOpenRouter,
    testOpenRouterConnection,
    generateContent,
};
