/**
 * OpenAI GPT API Client
 * 
 * Direct integration with OpenAI's GPT models for high-quality flashcard generation
 */

import { recordAPICall } from "../apiUsage";

// OpenAI API configuration
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Using GPT-5 for best quality
const DEFAULT_MODEL = "gpt-5";

export interface OpenAIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface OpenAIResponse {
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
 * Call OpenAI API directly (GPT-5)
 * Maximum tokens and timeout for best quality generation
 */
export async function callOpenAI(
    messages: OpenAIMessage[],
    options: {
        model?: string;
        maxTokens?: number;
        timeoutMs?: number;
    } = {}
): Promise<string> {
    const { 
        model = DEFAULT_MODEL, 
        maxTokens = 32000, // Maximum output tokens for GPT-5
        timeoutMs = 300000 // 5 minute timeout for complex generations
    } = options;

    console.log(`[OpenAI] Calling model: ${model} with max_completion_tokens: ${maxTokens}, timeout: ${timeoutMs}ms`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();
    
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                messages,
                max_completion_tokens: maxTokens, // GPT-5 uses max_completion_tokens
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OpenAI] API error: ${response.status} - ${errorText}`);
            
            // Record failed call
            recordAPICall({
                provider: "openai",
                model,
                endpoint: "/v1/chat/completions",
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                latencyMs,
                success: false,
                errorMessage: `${response.status} - ${errorText}`,
                timestamp: new Date(),
            });
            
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data: OpenAIResponse = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error("OpenAI returned no choices");
        }

        const content = data.choices[0].message.content || "";
        const finishReason = data.choices[0].finish_reason;
        
        console.log(`[OpenAI] Response received: ${content.length} chars, finish_reason: ${finishReason}`);
        
        // Record successful call with usage stats
        const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        recordAPICall({
            provider: "openai",
            model,
            endpoint: "/v1/chat/completions",
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            latencyMs,
            success: true,
            timestamp: new Date(),
            metadata: { finishReason, responseLength: content.length },
        });
        
        if (data.usage) {
            console.log(`[OpenAI] Tokens used: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
        }
        
        return content;
    } catch (error: any) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        
        if (error.name === 'AbortError') {
            recordAPICall({
                provider: "openai",
                model,
                endpoint: "/v1/chat/completions",
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                latencyMs,
                success: false,
                errorMessage: `Request timed out after ${timeoutMs}ms`,
                timestamp: new Date(),
            });
            throw new Error(`OpenAI API request timed out after ${timeoutMs}ms`);
        }
        throw error;
    }
}

/**
 * Test the OpenAI GPT-5 API connection
 */
export async function testOpenAIConnection(): Promise<boolean> {
    try {
        console.log("[OpenAI] Testing GPT-5 API connection...");
        console.log("[OpenAI] API Key present:", !!OPENAI_API_KEY);
        
        // Direct API call for testing
        const testResponse = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: [{ role: "user", content: "Say hello" }],
                max_completion_tokens: 1000, // Enough for test response
            }),
        });
        
        console.log("[OpenAI] Response status:", testResponse.status);
        const data = await testResponse.json();
        console.log("[OpenAI] Full response:", JSON.stringify(data, null, 2));
        
        const content = data.choices?.[0]?.message?.content || "";
        
        console.log(`[OpenAI] Test response: ${content}`);
        return content.toLowerCase().includes("hello") || content.length > 0;
    } catch (error) {
        console.error("[OpenAI] Connection test failed:", error);
        return false;
    }
}

/**
 * Generate content using OpenAI GPT-5
 * Uses maximum tokens and timeout for comprehensive generation
 */
export async function generateContent(prompt: string, options?: {
    model?: string;
    maxTokens?: number;
    timeoutMs?: number;
    systemPrompt?: string;
}): Promise<string> {
    const messages: OpenAIMessage[] = [];
    
    // Add system prompt for interview-focused generation
    const defaultSystemPrompt = `You are an expert career coach and interview preparation specialist. Your goal is to help students prepare for job interviews by creating high-quality, accurate flashcards based on course materials. Focus on:
1. Key concepts that employers frequently ask about
2. Industry-standard terminology and definitions
3. Practical applications and real-world scenarios
4. Best practices and methodologies
Always provide accurate, concise answers that would impress an interviewer.`;
    
    messages.push({ 
        role: "system", 
        content: options?.systemPrompt || defaultSystemPrompt 
    });
    
    messages.push({ role: "user", content: prompt });
    
    return callOpenAI(messages, {
        model: options?.model,
        maxTokens: options?.maxTokens || 32000, // Maximum output tokens
        timeoutMs: options?.timeoutMs || 300000, // 5 minute timeout
    });
}

export default {
    callOpenAI,
    testOpenAIConnection,
    generateContent,
};
