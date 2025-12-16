/**
 * StageB - Flashcard Generation
 * 
 * Takes chunked content and learning objectives from StageA to generate:
 * - Question/Answer pairs
 * - Evidence excerpts linking Q/A to source content
 * - Bloom's level classification
 * - Difficulty rating
 * - Confidence scores
 * 
 * This stage produces draft flashcards for verification.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { Counter, Histogram } from "prom-client";
import { randomUUID } from "crypto";

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

export interface StageBInput {
    chunks: Chunk[];
    module_id: string;
    learning_objectives: string[];
    target_card_count?: number;
    bloom_levels?: string[];
    difficulty_distribution?: {
        easy: number;
        medium: number;
        hard: number;
    };
}

export interface GeneratedCard {
    card_id: string;
    question: string;
    answer: string;
    rationale: string;
    evidence: Array<{
        chunk_id: string;
        text: string;
        start_char?: number;
        end_char?: number;
    }>;
    bloom_level: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
    difficulty: "easy" | "medium" | "hard";
    confidence_score: number;
    learning_objective_ref?: string;
    sources: Array<{
        file: string;
        location: string | number | null;
    }>;
}

export interface StageBOutput {
    module_id: string;
    cards: GeneratedCard[];
    generated_count: number;
    processing_time_ms: number;
    warnings: string[];
}

// Schema for LLM response validation
const CardSchema = z.object({
    question: z.string().min(10).max(500),
    answer: z.string().min(20).max(2000),
    rationale: z.string().max(500).optional().default(""),
    evidence_quote: z.string().min(10).max(500),
    bloom_level: z.enum(["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    confidence: z.number().min(0).max(1).optional().default(0.8),
});

const StageBResponseSchema = z.object({
    cards: z.array(CardSchema).min(1).max(20),
});

type StageBResponse = z.infer<typeof StageBResponseSchema>;

// =============================================================================
// METRICS
// =============================================================================

export const stageBCallsTotal = new Counter({
    name: "flashcard_stageB_calls_total",
    help: "Total StageB LLM calls",
    labelNames: ["status"],
});

export const stageBLatency = new Histogram({
    name: "flashcard_stageB_latency_seconds",
    help: "StageB processing latency",
    buckets: [1, 2, 5, 10, 30, 60, 120],
});

export const stageBTokensUsed = new Counter({
    name: "flashcard_stageB_tokens_total",
    help: "Total tokens used in StageB",
    labelNames: ["type"],
});

export const cardsGeneratedTotal = new Counter({
    name: "flashcard_cards_generated_total",
    help: "Total cards generated",
    labelNames: ["bloom_level", "difficulty"],
});

// =============================================================================
// PROMPTS
// =============================================================================

const STAGE_B_SYSTEM_PROMPT = `You are an expert educational flashcard creator. Your task is to generate high-quality flashcards from educational content.

For each flashcard, you must:
1. Create a clear, specific question
2. Provide a complete, accurate answer
3. Include an exact quote from the source as evidence
4. Classify the Bloom's taxonomy level
5. Rate the difficulty
6. Provide a confidence score (0-1) based on evidence strength

Bloom's Taxonomy Levels:
- Remember: Recall facts and basic concepts (define, list, name)
- Understand: Explain ideas or concepts (describe, explain, summarize)
- Apply: Use information in new situations (demonstrate, solve, use)
- Analyze: Draw connections among ideas (compare, contrast, examine)
- Evaluate: Justify a decision or course of action (argue, assess, critique)
- Create: Produce new or original work (design, construct, develop)

Respond ONLY with valid JSON:
{
  "cards": [
    {
      "question": "What is...?",
      "answer": "The answer is...",
      "rationale": "This tests understanding of...",
      "evidence_quote": "Exact quote from source content",
      "bloom_level": "Understand",
      "difficulty": "medium",
      "confidence": 0.9
    }
  ]
}

Rules:
- Evidence quotes MUST be exact excerpts from the source content
- Questions should test meaningful learning, not trivial facts
- Answers should be complete but concise (1-3 sentences typically)
- Vary Bloom's levels across cards
- Avoid yes/no questions
- Do not include information not present in the source`;

function buildStageBPrompt(
    chunks: Chunk[],
    learningObjectives: string[],
    targetCount: number
): string {
    const contentSections = chunks.map((chunk, i) => {
        const location = chunk.slide_or_page
            ? `Page/Slide: ${chunk.slide_or_page}`
            : chunk.start_sec !== undefined
                ? `Time: ${formatTime(chunk.start_sec)}`
                : "";
        return `--- Chunk ${chunk.chunk_id} [${chunk.source_file}${location ? ", " + location : ""}] ---
${chunk.text}`;
    }).join("\n\n");

    const objectivesSection = learningObjectives.length > 0
        ? `\nLearning Objectives to address:\n${learningObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n`
        : "";

    return `${objectivesSection}
Source Content:

${contentSections}

Generate ${targetCount} high-quality flashcards from this content. Ensure:
- Each card's evidence_quote is an EXACT excerpt from the source
- Cover different learning objectives where possible
- Mix of Bloom's levels (primarily Understand and Apply)
- Clear, specific questions that test meaningful knowledge`;
}

function formatTime(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// =============================================================================
// EVIDENCE MATCHING
// =============================================================================

function findEvidenceInChunks(
    evidenceQuote: string,
    chunks: Chunk[]
): { chunk_id: string; text: string; start_char?: number; end_char?: number } | null {
    // Clean and normalize the quote
    const normalizedQuote = evidenceQuote.toLowerCase().replace(/\s+/g, " ").trim();

    for (const chunk of chunks) {
        const normalizedChunk = chunk.text.toLowerCase().replace(/\s+/g, " ");
        const index = normalizedChunk.indexOf(normalizedQuote);

        if (index !== -1) {
            return {
                chunk_id: chunk.chunk_id,
                text: evidenceQuote,
                start_char: index,
                end_char: index + normalizedQuote.length,
            };
        }

        // Try partial match (first 50 chars)
        const partialQuote = normalizedQuote.substring(0, 50);
        const partialIndex = normalizedChunk.indexOf(partialQuote);
        if (partialIndex !== -1) {
            return {
                chunk_id: chunk.chunk_id,
                text: evidenceQuote,
                start_char: partialIndex,
            };
        }
    }

    // Fallback: assign to first chunk
    if (chunks.length > 0) {
        return {
            chunk_id: chunks[0].chunk_id,
            text: evidenceQuote,
        };
    }

    return null;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export async function runStageB(
    chunks: Chunk[],
    moduleId: string,
    learningObjectives: string[],
    targetCardCount: number = 10
): Promise<StageBOutput> {
    const startTime = Date.now();
    const timer = stageBLatency.startTimer();
    const warnings: string[] = [];

    console.log(`[StageB] Starting for module ${moduleId} with ${chunks.length} chunks`);
    console.log(`[StageB] Target: ${targetCardCount} cards, ${learningObjectives.length} learning objectives`);

    // Validate we have chunks
    if (!chunks || chunks.length === 0) {
        throw new Error("StageB requires at least one chunk");
    }

    // Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required for StageB");
    }

    try {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 4096,
            },
        });

        // Build prompt - combine system prompt with user content
        const userPrompt = buildStageBPrompt(chunks, learningObjectives, targetCardCount);
        const fullPrompt = `${STAGE_B_SYSTEM_PROMPT}\n\n${userPrompt}`;

        // Estimate input tokens
        const inputTokensEst = Math.ceil(fullPrompt.length / 4);
        stageBTokensUsed.inc({ type: "input" }, inputTokensEst);

        console.log(`[StageB] Sending request to LLM (est. ${inputTokensEst} input tokens)`);

        // Call LLM with retry logic for rate limiting
        const { withRetryThrow, GEMINI_RETRY_OPTIONS } = await import("../utils/retry");

        const result = await withRetryThrow(
            () => model.generateContent(fullPrompt),
            {
                ...GEMINI_RETRY_OPTIONS,
                onRetry: (attempt, error, delayMs) => {
                    console.log(`[StageB] Retry attempt ${attempt} in ${delayMs}ms - ${error.message?.substring(0, 80)}`);
                    stageBCallsTotal.inc({ status: "retry" });
                },
            }
        );

        const responseText = result.response.text();

        // Estimate output tokens
        const outputTokensEst = Math.ceil(responseText.length / 4);
        stageBTokensUsed.inc({ type: "output" }, outputTokensEst);

        console.log(`[StageB] Received response (est. ${outputTokensEst} output tokens)`);

        // Parse JSON response
        let parsed: unknown;
        try {
            const cleanedResponse = responseText
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
            parsed = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error("[StageB] Failed to parse JSON response:", responseText.substring(0, 500));
            stageBCallsTotal.inc({ status: "parse_error" });
            throw new Error(`StageB: Invalid JSON response from LLM`);
        }

        // Validate against schema
        const validated = StageBResponseSchema.safeParse(parsed);
        if (!validated.success) {
            console.error("[StageB] Schema validation failed:", validated.error.errors);
            stageBCallsTotal.inc({ status: "validation_error" });
            throw new Error(`StageB: Response validation failed - ${validated.error.errors[0]?.message}`);
        }

        const response = validated.data;

        // Process cards and match evidence
        const cards: GeneratedCard[] = response.cards.map((card, index) => {
            // Find evidence in chunks
            const evidence = findEvidenceInChunks(card.evidence_quote, chunks);

            if (!evidence) {
                warnings.push(`Card ${index + 1}: Could not match evidence quote to chunks`);
            }

            // Find source information
            const sourceChunk = evidence
                ? chunks.find(c => c.chunk_id === evidence.chunk_id)
                : chunks[0];

            // Track metrics
            cardsGeneratedTotal.inc({
                bloom_level: card.bloom_level,
                difficulty: card.difficulty
            });

            return {
                card_id: `${moduleId}::${randomUUID().substring(0, 8)}`,
                question: card.question,
                answer: card.answer,
                rationale: card.rationale || "",
                evidence: evidence ? [evidence] : [{
                    chunk_id: chunks[0]?.chunk_id || "unknown",
                    text: card.evidence_quote,
                }],
                bloom_level: card.bloom_level,
                difficulty: card.difficulty,
                confidence_score: card.confidence || 0.8,
                sources: [{
                    file: sourceChunk?.source_file || "unknown",
                    location: sourceChunk?.slide_or_page || null,
                }],
            };
        });

        // Build output
        const output: StageBOutput = {
            module_id: moduleId,
            cards,
            generated_count: cards.length,
            processing_time_ms: Date.now() - startTime,
            warnings,
        };

        timer();
        stageBCallsTotal.inc({ status: "success" });

        console.log(`[StageB] Completed in ${output.processing_time_ms}ms:
  - Cards generated: ${output.generated_count}
  - Warnings: ${warnings.length}`);

        return output;

    } catch (error) {
        timer();
        stageBCallsTotal.inc({ status: "error" });
        console.error("[StageB] Error:", error);
        throw error;
    }
}

// =============================================================================
// MOCK FUNCTION (for testing without API)
// =============================================================================

export function runStageBMock(
    chunks: Chunk[],
    moduleId: string,
    learningObjectives: string[],
    targetCardCount: number = 10
): StageBOutput {
    const startTime = Date.now();

    const mockCards: GeneratedCard[] = [];
    const bloomLevels: Array<"Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"> =
        ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
    const difficulties: Array<"easy" | "medium" | "hard"> = ["easy", "medium", "hard"];

    // Generate mock cards based on chunks
    for (let i = 0; i < Math.min(targetCardCount, chunks.length * 2); i++) {
        const chunkIndex = i % chunks.length;
        const chunk = chunks[chunkIndex];
        const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const sentence = sentences[0] || chunk.text.substring(0, 100);

        mockCards.push({
            card_id: `${moduleId}::mock-${i + 1}`,
            question: `What is the key concept discussed in: "${sentence.substring(0, 50)}..."?`,
            answer: sentence.trim() + ".",
            rationale: `Tests understanding of content from ${chunk.source_file}`,
            evidence: [{
                chunk_id: chunk.chunk_id,
                text: sentence.trim(),
            }],
            bloom_level: bloomLevels[i % bloomLevels.length],
            difficulty: difficulties[i % difficulties.length],
            confidence_score: 0.75 + Math.random() * 0.2,
            learning_objective_ref: learningObjectives[i % learningObjectives.length] || undefined,
            sources: [{
                file: chunk.source_file,
                location: chunk.slide_or_page,
            }],
        });
    }

    return {
        module_id: moduleId,
        cards: mockCards,
        generated_count: mockCards.length,
        processing_time_ms: Date.now() - startTime,
        warnings: [],
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    runStageB,
    runStageBMock,
};
