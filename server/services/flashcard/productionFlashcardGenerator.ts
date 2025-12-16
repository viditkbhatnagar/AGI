/**
 * Production Flashcard Generator
 * 
 * Complete end-to-end flashcard generation that:
 * 1. Fetches module content from database
 * 2. Extracts text from Google Drive & OneDrive documents
 * 3. Generates top 10 important questions using Gemini AI
 * 4. Returns production-ready flashcards
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchModuleContent, prepareChunksWithExtraction } from "./contentFetcher";
import type { Chunk, Flashcard, StageBOutput, StoredFlashcardDeck, StageAOutput } from "./types";
import { StageBOutputSchema, StageAOutputSchema } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateFlashcardsRequest {
  courseSlug: string;
  moduleIndex: number;
  isSandbox?: boolean;
  cardCount?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
}

export interface GenerateFlashcardsResult {
  success: boolean;
  deck?: StoredFlashcardDeck;
  error?: string;
  metadata: {
    module_id: string;
    module_title: string;
    course_id: string;
    documentsProcessed: number;
    videosProcessed: number;
    chunksGenerated: number;
    cardsGenerated: number;
    processingTimeMs: number;
  };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CARD_COUNT = 10;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate production-ready flashcards for a module
 */
export async function generateFlashcardsForModule(
  request: GenerateFlashcardsRequest
): Promise<GenerateFlashcardsResult> {
  const startTime = Date.now();
  const { courseSlug, moduleIndex, isSandbox = false, cardCount = DEFAULT_CARD_COUNT } = request;

  console.log(`[FlashcardGenerator] Starting generation for ${courseSlug}/module-${moduleIndex}`);

  try {
    // Step 1: Fetch module content from database
    console.log("[FlashcardGenerator] Step 1: Fetching module content...");
    const moduleContent = await fetchModuleContent({
      courseSlug,
      moduleIndex,
      isSandbox,
      includeRecordings: true,
    });

    if (moduleContent.documents.length === 0 && moduleContent.videos.length === 0) {
      return {
        success: false,
        error: "No content found in module. Please add documents or videos first.",
        metadata: {
          module_id: moduleContent.module_id,
          module_title: moduleContent.module_title,
          course_id: courseSlug,
          documentsProcessed: 0,
          videosProcessed: 0,
          chunksGenerated: 0,
          cardsGenerated: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // Step 2: Extract content from all documents (Google Drive, OneDrive, etc.)
    console.log("[FlashcardGenerator] Step 2: Extracting content from documents...");
    const chunks = await prepareChunksWithExtraction(moduleContent, {
      maxChunkTokens: 800,
      useGeminiForExtraction: true,
    });

    if (chunks.length === 0) {
      return {
        success: false,
        error: "Could not extract content from module documents. Please check document permissions.",
        metadata: {
          module_id: moduleContent.module_id,
          module_title: moduleContent.module_title,
          course_id: courseSlug,
          documentsProcessed: moduleContent.documents.length,
          videosProcessed: moduleContent.videos.length,
          chunksGenerated: 0,
          cardsGenerated: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    console.log(`[FlashcardGenerator] Extracted ${chunks.length} content chunks`);

    // Step 3: Generate flashcards using Gemini
    console.log("[FlashcardGenerator] Step 3: Generating flashcards with AI...");
    const deck = await generateFlashcardsFromChunks({
      module_id: moduleContent.module_id,
      module_title: moduleContent.module_title,
      course_id: courseSlug,
      chunks,
      cardCount,
    });

    console.log(`[FlashcardGenerator] Generated ${deck.cards.length} flashcards`);

    return {
      success: true,
      deck,
      metadata: {
        module_id: moduleContent.module_id,
        module_title: moduleContent.module_title,
        course_id: courseSlug,
        documentsProcessed: moduleContent.documents.length,
        videosProcessed: moduleContent.videos.length,
        chunksGenerated: chunks.length,
        cardsGenerated: deck.cards.length,
        processingTimeMs: Date.now() - startTime,
      },
    };

  } catch (error) {
    console.error("[FlashcardGenerator] Generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      metadata: {
        module_id: `${courseSlug}::module::${moduleIndex}`,
        module_title: "Unknown",
        course_id: courseSlug,
        documentsProcessed: 0,
        videosProcessed: 0,
        chunksGenerated: 0,
        cardsGenerated: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}

// =============================================================================
// FLASHCARD GENERATION FROM CHUNKS
// =============================================================================

interface GenerateFromChunksParams {
  module_id: string;
  module_title: string;
  course_id: string;
  chunks: Chunk[];
  cardCount: number;
}

async function generateFlashcardsFromChunks(
  params: GenerateFromChunksParams
): Promise<StoredFlashcardDeck> {
  const { module_id, module_title, course_id, chunks, cardCount } = params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4000,
    },
  });

  // Combine all chunk content for context
  const combinedContent = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.source_file}]\n${c.text}`)
    .join("\n\n---\n\n");

  // Generate Stage A: Summary and Key Topics
  console.log("[FlashcardGenerator] Running Stage A: Summarization...");
  const stageAOutput = await runStageA(model, module_id, module_title, combinedContent, chunks);

  // Generate Stage B: Flashcards
  console.log("[FlashcardGenerator] Running Stage B: Flashcard Generation...");
  const stageBOutput = await runStageB(model, module_id, module_title, combinedContent, chunks, stageAOutput, cardCount);

  // Build final deck
  const deck: StoredFlashcardDeck = {
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

  return deck;
}

// =============================================================================
// STAGE A: SUMMARIZATION
// =============================================================================

async function runStageA(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  module_id: string,
  module_title: string,
  content: string,
  _chunks: Chunk[] // Available for future use (e.g., source tracking)
): Promise<StageAOutput> {
  const prompt = `You are an expert educator analyzing course content to identify the most important concepts for student learning.

## Module Information
- Module ID: ${module_id}
- Module Title: ${module_title}

## Content to Analyze
${content.substring(0, 15000)} ${content.length > 15000 ? "\n\n[Content truncated for processing...]" : ""}

## Task
Analyze this educational content and produce a structured summary identifying:
1. The 6-10 most important concepts/points students must understand
2. The 6-12 key topics that should be tested
3. Coverage of main subject areas

## Output Format
Return ONLY valid JSON in this exact format:
{
  "module_summary": [
    {"point": "Clear statement of important concept", "supports": ["source1", "source2"]}
  ],
  "key_topics": [
    {"topic": "Topic Name", "supports": ["source1"]}
  ],
  "coverage_map": []
}

Focus on concepts that are:
- Fundamental to understanding the subject
- Likely to appear on exams
- Essential for practical application
- Building blocks for advanced topics`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Return default structure if parsing fails
    return {
      module_summary: [{ point: "Module content analyzed", supports: [] }],
      key_topics: [{ topic: module_title, supports: [] }],
      coverage_map: [],
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return StageAOutputSchema.parse(parsed);
  } catch {
    return {
      module_summary: [{ point: "Module content analyzed", supports: [] }],
      key_topics: [{ topic: module_title, supports: [] }],
      coverage_map: [],
    };
  }
}

// =============================================================================
// STAGE B: FLASHCARD GENERATION
// =============================================================================

async function runStageB(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  module_id: string,
  module_title: string,
  content: string,
  _chunks: Chunk[], // Available for future use (e.g., evidence validation)
  stageAOutput: StageAOutput,
  cardCount: number
): Promise<StageBOutput> {
  const keyTopicsStr = stageAOutput.key_topics.map(t => t.topic).join(", ");
  const summaryStr = stageAOutput.module_summary.map(s => s.point).join("\n- ");

  const prompt = `You are an expert exam writer creating high-quality flashcards for students.

## Module Information
- Module ID: ${module_id}
- Module Title: ${module_title}

## Key Topics to Cover
${keyTopicsStr}

## Summary Points
- ${summaryStr}

## Source Content
${content.substring(0, 12000)} ${content.length > 12000 ? "\n\n[Content truncated...]" : ""}

## Task
Generate exactly ${cardCount} flashcards that test the most important concepts from this module.

## Requirements
1. Questions must be clear, specific, and test understanding (not just recall)
2. Answers must be concise (max 40 words) and directly supported by the content
3. Include a mix of difficulties: 3 easy, 4 medium, 3 hard
4. Cover different key topics - don't repeat the same concept
5. Each card must have evidence from the source content

## Difficulty Guidelines
- Easy: Direct definitions, basic facts ("What is X?")
- Medium: Explanations, relationships ("How does X relate to Y?")
- Hard: Analysis, application, comparison ("Compare X and Y", "Why is X important for Z?")

## Output Format
Return ONLY valid JSON:
{
  "module_id": "${module_id}",
  "module_title": "${module_title}",
  "generated_count": ${cardCount},
  "cards": [
    {
      "card_id": "M${module_id.replace(/[^a-zA-Z0-9]/g, "")}_C1",
      "q": "Clear question?",
      "a": "Concise answer (max 40 words).",
      "difficulty": "easy|medium|hard",
      "bloom_level": "Remember|Understand|Apply|Analyze|Evaluate|Create",
      "evidence": [{"chunk_id": "source", "source_file": "filename", "loc": "location", "start_sec": null, "end_sec": null, "excerpt": "exact quote from content"}],
      "sources": [{"type": "slides|pdf|video", "file": "filename", "loc": "location"}],
      "confidence_score": 0.95,
      "rationale": "Why this question is important",
      "review_required": false
    }
  ],
  "warnings": [],
  "generation_metadata": {
    "model": "${GEMINI_MODEL}",
    "temperature": 0.1,
    "timestamp": "${new Date().toISOString()}"
  }
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to generate flashcards - no valid JSON in response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return StageBOutputSchema.parse(parsed);
  } catch (parseError) {
    console.error("[FlashcardGenerator] JSON parse error:", parseError);
    
    // Try to salvage partial response
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      module_id,
      module_title,
      generated_count: parsed.cards?.length || 0,
      cards: parsed.cards || [],
      warnings: ["Some cards may need review due to parsing issues"],
      generation_metadata: {
        model: GEMINI_MODEL,
        temperature: 0.1,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// =============================================================================
// QUICK GENERATE (Simplified API)
// =============================================================================

/**
 * Quick generate flashcards - simplified API for direct use
 */
export async function quickGenerateFlashcards(
  courseSlug: string,
  moduleIndex: number,
  options?: {
    isSandbox?: boolean;
    cardCount?: number;
  }
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

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  generateFlashcardsForModule,
  quickGenerateFlashcards,
};
