/**
 * StageA - Content Summarization & Learning Objective Extraction
 * 
 * Takes chunked content and produces:
 * - Module/section summaries
 * - Learning objectives (Bloom's taxonomy aligned)
 * - Key terms and concepts
 * 
 * This stage runs BEFORE card generation to give StageB context.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { Counter, Histogram } from "prom-client";

// =============================================================================
// TYPES
// =============================================================================

export interface Chunk {
    chunk_id: string;
    text: string;
    source_file: string;
    provider: "local" | "google_drive" | "onedrive" | "cloudinary" | "other";
    slide_or_page: string | number | null;
    heading: string | null;
    tokens_est: number;
    start_sec?: number | null;
    end_sec?: number | null;
}

export interface StageAInput {
    chunks: Chunk[];
    module_id: string;
    module_title?: string;
    course_id?: string;
}

export interface StageAOutput {
    module_id: string;
    summaries: string[];
    learning_objectives: string[];
    key_terms: string[];
    content_themes: string[];
    estimated_difficulty: "beginner" | "intermediate" | "advanced";
    chunk_count: number;
    processing_time_ms: number;
}

// Schema for LLM response validation
const StageAResponseSchema = z.object({
    summary: z.string().min(50).max(2000),
    learning_objectives: z.array(z.string().min(10).max(300)).min(2).max(10),
    key_terms: z.array(z.string()).min(1).max(20),
    content_themes: z.array(z.string()).min(1).max(5),
    estimated_difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

type StageAResponse = z.infer<typeof StageAResponseSchema>;

// =============================================================================
// METRICS
// =============================================================================

export const stageACallsTotal = new Counter({
    name: "flashcard_stageA_calls_total",
    help: "Total StageA LLM calls",
    labelNames: ["status"],
});

export const stageALatency = new Histogram({
    name: "flashcard_stageA_latency_seconds",
    help: "StageA processing latency",
    buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export const stageATokensUsed = new Counter({
    name: "flashcard_stageA_tokens_total",
    help: "Total tokens used in StageA",
    labelNames: ["type"],
});

// =============================================================================
// PROMPTS
// =============================================================================

const STAGE_A_SYSTEM_PROMPT = `You are an expert educational content analyst. Your task is to analyze course content and extract:
1. A comprehensive summary of the material
2. Clear learning objectives (use Bloom's taxonomy verbs: remember, understand, apply, analyze, evaluate, create)
3. Key terms and concepts that learners should know
4. Main content themes
5. Estimated difficulty level

Respond ONLY with valid JSON matching this schema:
{
  "summary": "A 2-4 paragraph comprehensive summary of the content...",
  "learning_objectives": [
    "Understand the concept of...",
    "Apply knowledge of... to...",
    "Analyze the relationship between..."
  ],
  "key_terms": ["term1", "term2", "term3"],
  "content_themes": ["Theme 1", "Theme 2"],
  "estimated_difficulty": "beginner" | "intermediate" | "advanced"
}

Guidelines:
- Learning objectives should start with Bloom's taxonomy verbs
- Include 3-6 learning objectives
- Key terms should be important vocabulary from the content
- Be specific and actionable in objectives
- Base difficulty on vocabulary complexity and concept depth`;

function buildStageAPrompt(chunks: Chunk[], moduleTitle?: string): string {
    const contentSections = chunks.map((chunk, i) => {
        const source = chunk.slide_or_page
            ? `[Source: ${chunk.source_file}, Page/Slide: ${chunk.slide_or_page}]`
            : `[Source: ${chunk.source_file}]`;
        return `--- Section ${i + 1} ${source} ---\n${chunk.text}`;
    }).join("\n\n");

    return `${moduleTitle ? `Module Title: ${moduleTitle}\n\n` : ""}Content to analyze:\n\n${contentSections}

Analyze this educational content and provide a summary, learning objectives, key terms, themes, and difficulty level.`;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export async function runStageA(
    chunks: Chunk[],
    moduleId: string,
    moduleTitle?: string
): Promise<StageAOutput> {
    const startTime = Date.now();
    const timer = stageALatency.startTimer();

    console.log(`[StageA] Starting for module ${moduleId} with ${chunks.length} chunks`);

    // Validate we have chunks
    if (!chunks || chunks.length === 0) {
        throw new Error("StageA requires at least one chunk");
    }

    // Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required for StageA");
    }

    try {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
            },
        });

        // Build prompt - combine system prompt with user content
        const userPrompt = buildStageAPrompt(chunks, moduleTitle);
        const fullPrompt = `${STAGE_A_SYSTEM_PROMPT}\n\n${userPrompt}`;

        // Estimate input tokens
        const inputTokensEst = Math.ceil(fullPrompt.length / 4);
        stageATokensUsed.inc({ type: "input" }, inputTokensEst);

        console.log(`[StageA] Sending request to LLM (est. ${inputTokensEst} input tokens)`);

        // Call LLM with retry logic for rate limiting
        const { withRetryThrow, GEMINI_RETRY_OPTIONS } = await import("../utils/retry");

        const result = await withRetryThrow(
            () => model.generateContent(fullPrompt),
            {
                ...GEMINI_RETRY_OPTIONS,
                onRetry: (attempt, error, delayMs) => {
                    console.log(`[StageA] Retry attempt ${attempt} in ${delayMs}ms - ${error.message?.substring(0, 80)}`);
                    stageACallsTotal.inc({ status: "retry" });
                },
            }
        );

        const responseText = result.response.text();

        // Estimate output tokens
        const outputTokensEst = Math.ceil(responseText.length / 4);
        stageATokensUsed.inc({ type: "output" }, outputTokensEst);

        console.log(`[StageA] Received response (est. ${outputTokensEst} output tokens)`);

        // Parse JSON response
        let parsed: unknown;
        try {
            // Clean potential markdown code blocks
            const cleanedResponse = responseText
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
            parsed = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error("[StageA] Failed to parse JSON response:", responseText.substring(0, 500));
            stageACallsTotal.inc({ status: "parse_error" });
            throw new Error(`StageA: Invalid JSON response from LLM`);
        }

        // Validate against schema
        const validated = StageAResponseSchema.safeParse(parsed);
        if (!validated.success) {
            console.error("[StageA] Schema validation failed:", validated.error.errors);
            stageACallsTotal.inc({ status: "validation_error" });
            throw new Error(`StageA: Response validation failed - ${validated.error.errors[0]?.message}`);
        }

        const response = validated.data;

        // Build output
        const output: StageAOutput = {
            module_id: moduleId,
            summaries: [response.summary],
            learning_objectives: response.learning_objectives,
            key_terms: response.key_terms,
            content_themes: response.content_themes,
            estimated_difficulty: response.estimated_difficulty,
            chunk_count: chunks.length,
            processing_time_ms: Date.now() - startTime,
        };

        timer();
        stageACallsTotal.inc({ status: "success" });

        console.log(`[StageA] Completed in ${output.processing_time_ms}ms:
  - Learning objectives: ${output.learning_objectives.length}
  - Key terms: ${output.key_terms.length}
  - Difficulty: ${output.estimated_difficulty}`);

        return output;

    } catch (error) {
        timer();
        stageACallsTotal.inc({ status: "error" });
        console.error("[StageA] Error:", error);
        throw error;
    }
}

// =============================================================================
// MOCK FUNCTION (for testing without API)
// =============================================================================

export function runStageAMock(
    chunks: Chunk[],
    moduleId: string,
    moduleTitle?: string
): StageAOutput {
    const startTime = Date.now();

    // Extract key content from chunks
    const allText = chunks.map(c => c.text).join(" ");
    const words = allText.split(/\s+/);
    const summary = words.slice(0, 100).join(" ") + "...";

    // Generate mock learning objectives based on content themes
    const learningObjectives = [
        "Understand the key concepts presented in this module",
        "Apply knowledge to practical scenarios and real-world situations",
        "Analyze relationships between different concepts",
        "Evaluate the effectiveness of various approaches discussed",
    ];

    // Extract potential key terms (capitalized words, excluding common ones)
    const commonWords = new Set(["The", "A", "An", "This", "That", "It", "Is", "Are", "Was", "Were"]);
    const keyTerms = [...new Set(
        words
            .filter(w => w.length > 4 && w[0] === w[0].toUpperCase() && !commonWords.has(w))
            .slice(0, 10)
    )];

    return {
        module_id: moduleId,
        summaries: [summary],
        learning_objectives: learningObjectives,
        key_terms: keyTerms.length > 0 ? keyTerms : ["Concept 1", "Concept 2", "Concept 3"],
        content_themes: ["Main Theme", "Supporting Theme"],
        estimated_difficulty: "intermediate",
        chunk_count: chunks.length,
        processing_time_ms: Date.now() - startTime,
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    runStageA,
    runStageAMock,
};
