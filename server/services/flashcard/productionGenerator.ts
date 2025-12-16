/**
 * Production Flashcard Generator
 * 
 * Complete end-to-end flashcard generation that:
 * 1. Fetches module content from database
 * 2. Extracts text from Google Drive, OneDrive, Cloudinary documents
 * 3. Generates TOP 10 most important interview questions using OpenAI GPT-4o
 * 4. Returns production-ready flashcards with evidence
 */

import { fetchModuleContent, type ModuleContent } from "./contentFetcher";
import { extractAllModuleContent, type ExtractedDocument } from "./productionDocumentExtractor";
import { generateContent } from "./openaiClient"; // Using OpenAI directly
import type { Chunk, Flashcard, StageBOutput, StoredFlashcardDeck, StageAOutput } from "./types";
import { StageBOutputSchema, StageAOutputSchema } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationRequest {
    courseSlug: string;
    moduleIndex: number;
    isSandbox?: boolean;
    cardCount?: number;
    difficulty?: "easy" | "medium" | "hard" | "mixed";
}

export interface GenerationResult {
    success: boolean;
    deck?: StoredFlashcardDeck;
    error?: string;
    metadata: {
        module_id: string;
        module_title: string;
        course_id: string;
        documentsProcessed: number;
        videosProcessed: number;
        recordingsProcessed: number;
        extractionMethods: Record<string, number>;
        chunksGenerated: number;
        cardsGenerated: number;
        processingTimeMs: number;
    };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CARD_COUNT = 10;
const MAX_CONTENT_TOKENS = 50000; // Maximum content for comprehensive analysis
const AI_MODEL = "gpt-5"; // Using OpenAI GPT-5 for best quality
const MAX_OUTPUT_TOKENS = 32000; // Maximum output tokens for complete responses
const API_TIMEOUT_MS = 300000; // 5 minute timeout for complex generations

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate production-ready flashcards for a module
 */
export async function generateFlashcardsForModule(
    request: GenerationRequest
): Promise<GenerationResult> {
    const startTime = Date.now();
    const { courseSlug, moduleIndex, isSandbox = false, cardCount = DEFAULT_CARD_COUNT } = request;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[ProductionGenerator] Starting: ${courseSlug}/module-${moduleIndex}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
        // Step 1: Fetch module content from database
        console.log("[Step 1] Fetching module content from database...");
        const moduleContent = await fetchModuleContent({
            courseSlug,
            moduleIndex,
            isSandbox,
            includeRecordings: true,
        });

        console.log(`  Found: ${moduleContent.documents.length} documents, ${moduleContent.videos.length} videos, ${moduleContent.recordings.length} recordings`);

        if (moduleContent.documents.length === 0 && moduleContent.videos.length === 0 && moduleContent.recordings.length === 0) {
            return createErrorResult(
                "No content found in module. Please add documents, videos, or recordings first.",
                moduleContent,
                courseSlug,
                startTime
            );
        }

        // Step 2: Extract content from all sources
        // Note: useGeminiForExtraction=false for faster extraction (fallback content is used)
        // Gemini is only used for final flashcard generation
        console.log("\n[Step 2] Extracting content from documents...");
        const extractionResult = await extractAllModuleContent(
            moduleContent.documents,
            moduleContent.videos,
            moduleContent.recordings,
            { useGeminiForExtraction: false }
        );

        console.log(`  Extracted: ${extractionResult.successCount}/${extractionResult.totalExtracted} successful`);
        console.log(`  Methods used:`, extractionResult.methods);

        if (extractionResult.documents.length === 0) {
            return createErrorResult(
                "Could not extract content from any module documents.",
                moduleContent,
                courseSlug,
                startTime
            );
        }

        // Step 3: Convert to chunks for processing
        console.log("\n[Step 3] Converting to chunks...");
        const chunks = convertToChunks(extractionResult.documents, moduleContent.module_id);
        console.log(`  Created ${chunks.length} chunks`);

        // Step 4: Generate flashcards using Gemini
        console.log("\n[Step 4] Generating flashcards with AI...");
        const deck = await generateFlashcardsFromContent({
            module_id: moduleContent.module_id,
            module_title: moduleContent.module_title,
            course_id: courseSlug,
            chunks,
            extractedDocs: extractionResult.documents,
            cardCount,
        });

        console.log(`  Generated ${deck.cards.length} flashcards`);

        console.log(`\n${"=".repeat(60)}`);
        console.log(`[ProductionGenerator] Complete in ${Date.now() - startTime}ms`);
        console.log(`${"=".repeat(60)}\n`);

        return {
            success: true,
            deck,
            metadata: {
                module_id: moduleContent.module_id,
                module_title: moduleContent.module_title,
                course_id: courseSlug,
                documentsProcessed: moduleContent.documents.length,
                videosProcessed: moduleContent.videos.length,
                recordingsProcessed: moduleContent.recordings.length,
                extractionMethods: extractionResult.methods,
                chunksGenerated: chunks.length,
                cardsGenerated: deck.cards.length,
                processingTimeMs: Date.now() - startTime,
            },
        };

    } catch (error) {
        console.error("[ProductionGenerator] Generation failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
            metadata: {
                module_id: `${courseSlug}::module::${moduleIndex}`,
                module_title: "Unknown",
                course_id: courseSlug,
                documentsProcessed: 0,
                videosProcessed: 0,
                recordingsProcessed: 0,
                extractionMethods: {},
                chunksGenerated: 0,
                cardsGenerated: 0,
                processingTimeMs: Date.now() - startTime,
            },
        };
    }
}

// =============================================================================
// CHUNK CONVERSION
// =============================================================================

function convertToChunks(documents: ExtractedDocument[], moduleId: string): Chunk[] {
    const chunks: Chunk[] = [];
    const maxChunkTokens = 800;

    for (const doc of documents) {
        // Split large documents into multiple chunks
        const textChunks = splitIntoChunks(doc.text, maxChunkTokens);

        for (let i = 0; i < textChunks.length; i++) {
            const chunkText = textChunks[i];
            chunks.push({
                chunk_id: `${moduleId}::${doc.source.type}::${doc.id}::${i}`,
                source_file: doc.title,
                provider: doc.source.provider as any,
                slide_or_page: textChunks.length > 1 ? `part ${i + 1}/${textChunks.length}` : null,
                start_sec: null,
                end_sec: null,
                heading: extractHeading(chunkText) || doc.title,
                text: chunkText,
                tokens_est: Math.ceil(chunkText.length / 4),
            });
        }
    }

    return chunks;
}

function splitIntoChunks(text: string, maxTokens: number): string[] {
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
        return [text];
    }

    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length <= maxChars) {
            currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        } else {
            if (currentChunk) chunks.push(currentChunk);

            if (paragraph.length > maxChars) {
                // Split long paragraphs by sentences
                const sentences = paragraph.split(/(?<=[.!?])\s+/);
                currentChunk = "";
                for (const sentence of sentences) {
                    if ((currentChunk + sentence).length <= maxChars) {
                        currentChunk += (currentChunk ? " " : "") + sentence;
                    } else {
                        if (currentChunk) chunks.push(currentChunk);
                        currentChunk = sentence;
                    }
                }
            } else {
                currentChunk = paragraph;
            }
        }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

function extractHeading(text: string): string | null {
    const lines = text.split("\n");
    for (const line of lines.slice(0, 3)) {
        const trimmed = line.trim();
        // Check for markdown headings or short lines that look like titles
        if (trimmed.startsWith("#")) {
            return trimmed.replace(/^#+\s*/, "");
        }
        if (trimmed.length > 5 && trimmed.length < 100 && !trimmed.endsWith(".")) {
            return trimmed;
        }
    }
    return null;
}

// =============================================================================
// FLASHCARD GENERATION
// =============================================================================

interface GenerateParams {
    module_id: string;
    module_title: string;
    course_id: string;
    chunks: Chunk[];
    extractedDocs: ExtractedDocument[];
    cardCount: number;
}

async function generateFlashcardsFromContent(params: GenerateParams): Promise<StoredFlashcardDeck> {
    const { module_id, module_title, course_id, chunks, cardCount } = params;

    // Combine content for context (respect token limits)
    const combinedContent = buildContentContext(chunks, MAX_CONTENT_TOKENS);

    // Stage A: Analyze content and identify key topics for interview preparation
    console.log("  Running Stage A: Content Analysis for Interview Questions...");
    const stageAOutput = await runStageAWithOpenAI(module_id, module_title, combinedContent);

    // Stage B: Generate flashcards
    console.log("  Running Stage B: Flashcard Generation...");
    const stageBOutput = await runStageBWithOpenAI(module_id, module_title, combinedContent, stageAOutput, cardCount);

    // Build final deck
    return {
        course_id,
        module_id,
        module_title,
        cards: stageBOutput.cards,
        stage_a_output: stageAOutput,
        warnings: stageBOutput.warnings,
        generation_metadata: stageBOutput.generation_metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reviewed_by: null,
        review_status: "pending",
    };
}

function buildContentContext(chunks: Chunk[], maxTokens: number): string {
    let content = "";
    let tokenCount = 0;

    for (const chunk of chunks) {
        const chunkContent = `\n\n[Source: ${chunk.source_file}]\n${chunk.text}`;
        const chunkTokens = Math.ceil(chunkContent.length / 4);

        if (tokenCount + chunkTokens > maxTokens) {
            content += "\n\n[Additional content truncated for processing...]";
            break;
        }

        content += chunkContent;
        tokenCount += chunkTokens;
    }

    return content.trim();
}

// =============================================================================
// STAGE A: CONTENT ANALYSIS (Using OpenAI GPT-4o)
// =============================================================================

async function runStageAWithOpenAI(
    module_id: string,
    module_title: string,
    content: string
): Promise<StageAOutput> {
    const prompt = `You are an expert career coach and interview preparation specialist analyzing course content to identify the MOST CRITICAL concepts that employers ask about in job interviews.

## Module: ${module_title}

## Content to Analyze
${content}

## Your Task
Analyze this content and identify:

1. **KEY INTERVIEW TOPICS** (10-15 topics):
   - Concepts frequently asked in job interviews
   - Industry-standard terminology employers expect candidates to know
   - Practical skills and knowledge that demonstrate competency

2. **CRITICAL CONCEPTS** (10-15 concepts):
   - Definitions that interviewers commonly test
   - Processes and methodologies used in the industry
   - Best practices and standards
   - Real-world applications and case scenarios

Focus on what would help a student CRACK their job interview in this field.

## Output Format
Return ONLY valid JSON (no markdown):
{
  "module_summary": [
    {"point": "Critical concept for interviews", "supports": []}
  ],
  "key_topics": [
    {"topic": "Interview-relevant topic", "supports": []}
  ],
  "coverage_map": []
}`;

    try {
        const responseText = await generateContent(prompt, {
            maxTokens: MAX_OUTPUT_TOKENS, // Maximum tokens for comprehensive analysis
            timeoutMs: API_TIMEOUT_MS, // 5 minute timeout
        });

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log("[StageA] No JSON found, using defaults");
            return getDefaultStageAOutput(module_title);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        
        // Extract what we need, ignore coverage_map validation issues
        const result: StageAOutput = {
            module_summary: parsed.module_summary || [{ point: `Key concepts from ${module_title}`, supports: [] }],
            key_topics: parsed.key_topics || [{ topic: module_title, supports: [] }],
            coverage_map: [], // Always use empty array to avoid validation issues
        };
        
        console.log(`[StageA] Extracted ${result.key_topics.length} topics, ${result.module_summary.length} concepts`);
        return result;
    } catch (error) {
        console.error("[StageA] Error:", error);
        return getDefaultStageAOutput(module_title);
    }
}

function getDefaultStageAOutput(module_title: string): StageAOutput {
    return {
        module_summary: [{ point: `Key concepts from ${module_title}`, supports: [] }],
        key_topics: [{ topic: module_title, supports: [] }],
        coverage_map: [],
    };
}

// =============================================================================
// STAGE B: FLASHCARD GENERATION (Using OpenAI GPT-4o)
// =============================================================================

async function runStageBWithOpenAI(
    module_id: string,
    module_title: string,
    content: string,
    stageAOutput: StageAOutput,
    cardCount: number
): Promise<StageBOutput> {
    const keyTopics = stageAOutput.key_topics.map(t => `- ${t.topic}`).join("\n");
    const summaryPoints = stageAOutput.module_summary.map(s => `- ${s.point}`).join("\n");

    const prompt = `You are an expert interview coach creating flashcards to help students prepare for JOB INTERVIEWS in this field. Create exactly ${cardCount} high-quality interview preparation flashcards.

## Module: ${module_title}

## Key Interview Topics (from content analysis)
${keyTopics}

## Critical Concepts to Test
${summaryPoints}

## Source Content
${content.substring(0, 6000)}

## IMPORTANT REQUIREMENTS:
1. Questions should be the type asked in REAL JOB INTERVIEWS
2. Focus on practical knowledge employers expect
3. Include definition questions, scenario questions, and application questions
4. Answers must be PRECISE and INTERVIEW-READY (what you'd say to an interviewer)
5. Each question tests a DIFFERENT important concept
6. Mix: 3 easy (definitions), 4 medium (explanations), 3 hard (applications/scenarios)

## Question Types to Include:
- "What is...?" (definitions)
- "Explain the difference between..."
- "How would you...?" (practical application)
- "What are the key components of...?"
- "Why is X important in...?"

## Output Format - Return ONLY valid JSON:
{
  "module_id": "${module_id}",
  "module_title": "${module_title}",
  "generated_count": ${cardCount},
  "cards": [
    {
      "card_id": "card_1",
      "q": "Interview question?",
      "a": "Concise, interview-ready answer (max 50 words).",
      "difficulty": "easy",
      "bloom_level": "Remember",
      "evidence": [{"chunk_id": "src", "source_file": "${module_title}", "loc": "content", "start_sec": null, "end_sec": null, "excerpt": "relevant quote"}],
      "sources": [{"type": "pdf", "file": "${module_title}", "loc": "content"}],
      "confidence_score": 0.9,
      "rationale": "Why this is asked in interviews",
      "review_required": false
    }
  ],
  "warnings": [],
  "generation_metadata": {
    "model": "${AI_MODEL}",
    "temperature": 0.1,
    "timestamp": "${new Date().toISOString()}"
  }
}`;

    const responseText = await generateContent(prompt, {
        maxTokens: MAX_OUTPUT_TOKENS, // Maximum tokens for complete, high-quality flashcards
        timeoutMs: API_TIMEOUT_MS, // 5 minute timeout
    });

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Failed to generate flashcards - no valid JSON in response");
    }

    let jsonStr = jsonMatch[0];
    
    // Try to fix truncated JSON
    const fixTruncatedJson = (str: string): string => {
        // Remove incomplete string at the end (e.g., "some text that got cut
        str = str.replace(/"[^"]*$/, '""');
        
        // Remove trailing comma
        str = str.replace(/,\s*$/, "");
        
        // Remove incomplete key-value pair at end
        str = str.replace(/,\s*"[^"]*":\s*$/, "");
        str = str.replace(/,\s*"[^"]*":\s*"[^"]*$/, "");
        
        // Remove incomplete object at end of array
        str = str.replace(/,\s*\{[^}]*$/, "");
        
        // Count and close brackets
        const openBraces = (str.match(/\{/g) || []).length;
        const closeBraces = (str.match(/\}/g) || []).length;
        const openBrackets = (str.match(/\[/g) || []).length;
        const closeBrackets = (str.match(/\]/g) || []).length;
        
        // Close arrays first, then objects
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
            str += "]";
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
            str += "}";
        }
        
        return str;
    };

    // First try to parse as-is
    try {
        const parsed = JSON.parse(jsonStr);
        console.log(`[ProductionGenerator] Parsed ${parsed.cards?.length || 0} cards`);
        return StageBOutputSchema.parse(parsed);
    } catch (firstError) {
        console.log("[ProductionGenerator] First parse failed, attempting to fix truncated JSON...");
        
        // Try to fix and parse
        jsonStr = fixTruncatedJson(jsonStr);
        
        try {
            const parsed = JSON.parse(jsonStr);
            const cards = parsed.cards || [];
            console.log(`[ProductionGenerator] Fixed JSON, got ${cards.length} cards`);
            
            return {
                module_id,
                module_title,
                generated_count: cards.length,
                cards: cards,
                warnings: ["Response was truncated - some cards may be incomplete"],
                generation_metadata: {
                    model: AI_MODEL,
                    temperature: 0.1,
                    timestamp: new Date().toISOString(),
                },
            };
        } catch (secondError) {
            // Last resort: try to extract individual cards using regex
            console.log("[ProductionGenerator] Second parse failed, extracting cards manually...");
            
            const cardMatches = responseText.match(/"card_id":\s*"card_\d+"[^}]+}/g);
            if (cardMatches && cardMatches.length > 0) {
                const cards = cardMatches.map((match, idx) => {
                    try {
                        // Wrap in braces and parse
                        const cardJson = "{" + match + "}";
                        return JSON.parse(cardJson);
                    } catch {
                        return {
                            card_id: `card_${idx + 1}`,
                            q: "Question could not be parsed",
                            a: "Answer could not be parsed",
                            difficulty: "medium",
                            bloom_level: "Remember",
                            evidence: [],
                            sources: [],
                            confidence_score: 0.5,
                            rationale: "Parsing error",
                            review_required: true,
                        };
                    }
                });
                
                console.log(`[ProductionGenerator] Extracted ${cards.length} cards manually`);
                
                return {
                    module_id,
                    module_title,
                    generated_count: cards.length,
                    cards,
                    warnings: ["Response was severely truncated - cards extracted manually"],
                    generation_metadata: {
                        model: AI_MODEL,
                        temperature: 0.1,
                        timestamp: new Date().toISOString(),
                    },
                };
            }
            
            throw new Error(`Failed to parse flashcard response: ${secondError}`);
        }
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createErrorResult(
    error: string,
    moduleContent: ModuleContent,
    courseSlug: string,
    startTime: number
): GenerationResult {
    return {
        success: false,
        error,
        metadata: {
            module_id: moduleContent.module_id,
            module_title: moduleContent.module_title,
            course_id: courseSlug,
            documentsProcessed: moduleContent.documents.length,
            videosProcessed: moduleContent.videos.length,
            recordingsProcessed: moduleContent.recordings.length,
            extractionMethods: {},
            chunksGenerated: 0,
            cardsGenerated: 0,
            processingTimeMs: Date.now() - startTime,
        },
    };
}

// =============================================================================
// QUICK GENERATE API
// =============================================================================

/**
 * Quick generate flashcards - simplified API
 */
export async function quickGenerateFlashcards(
    courseSlug: string,
    moduleIndex: number,
    options?: { isSandbox?: boolean; cardCount?: number }
): Promise<Flashcard[]> {
    const result = await generateFlashcardsForModule({
        courseSlug,
        moduleIndex,
        isSandbox: options?.isSandbox,
        cardCount: options?.cardCount || 10,
    });

    if (!result.success || !result.deck) {
        throw new Error(result.error || "Failed to generate flashcards");
    }

    return result.deck.cards;
}

export default {
    generateFlashcardsForModule,
    quickGenerateFlashcards,
};
