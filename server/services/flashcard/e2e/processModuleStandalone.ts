/**
 * Standalone Module Processor
 * 
 * Processes a single module through the flashcard generation pipeline.
 * Integrates retrieveChunks, Stage A/B, verification, and persistence.
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Chunk, StageAOutput, StageBOutput, Flashcard } from "../types";
import { StageAOutputSchema, StageBOutputSchema } from "../types";
import type { ModuleResult, OrchestratorSettings, CardVerificationResult } from "../orchestratorTypes";
import {
  STAGE_A_SYSTEM_PROMPT_COMPLETE,
  STAGE_B_SYSTEM_PROMPT_COMPLETE,
  buildStageACompletePrompt,
  buildStageBCompletePrompt,
} from "../orchestratorPrompts";
import { retrieveChunks } from "../vectorDb/retrieveChunks";
import { saveDeckToStore } from "../persistence/deckStore";
import { enqueueTranscription } from "../workers/transcriptionQueue";
import { getMockStageAOutput, getMockStageBOutput } from "./mockResponses";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_SETTINGS: OrchestratorSettings = {
  retrieval_K: 8,
  target_card_count: 10,
  model: "gemini-1.5-flash",
  temperature: 0.1,
  max_output_tokens: 2000,
  dedupe_threshold: 0.85,
  difficulty_distribution: { easy: 3, medium: 4, hard: 3 },
  min_higher_order_bloom: 3,
  max_retries: 2,
  concurrency: 1,
};

const STAGE_TIMEOUT_MS = 30000; // 30 seconds

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

export interface ProcessModuleParams {
  module_id: string;
  course_id: string;
  module_title: string;
  settings?: Partial<OrchestratorSettings>;
}

/**
 * Process a single module through the complete pipeline.
 */
export async function processModuleStandalone(
  params: ProcessModuleParams
): Promise<ModuleResult> {
  const { module_id, course_id, module_title } = params;
  const settings = { ...DEFAULT_SETTINGS, ...params.settings };
  const startTime = Date.now();
  let apiCalls = 0;
  const warnings: string[] = [];

  console.log(`[Processor] Starting module: ${module_id}`);

  try {
    // Step 1: Retrieve chunks
    console.log("[Processor] Step 1: Retrieving chunks...");
    const chunks = await getChunks(module_id, settings.retrieval_K);

    if (chunks.length < 4) {
      console.log(`[Processor] Insufficient chunks (${chunks.length}), queueing transcription`);
      
      // Enqueue transcription job
      const { job_id } = await enqueueTranscription(module_id);
      
      return createResult(module_id, course_id, module_title, "NEED_MORE_CONTENT", startTime, {
        chunks_retrieved: chunks.length,
        warnings: [
          `Insufficient content: only ${chunks.length} chunks found (minimum 4 required)`,
          `Transcription job queued: ${job_id}`,
        ],
      });
    }

    console.log(`[Processor] Retrieved ${chunks.length} chunks`);

    // Step 2: Stage A - Summarization
    console.log("[Processor] Step 2: Running Stage A (Summarization)...");
    let stageAOutput: StageAOutput;
    
    try {
      stageAOutput = await runStageA(module_id, module_title, course_id, chunks, settings);
      apiCalls++;
      console.log(`[Processor] Stage A complete: ${stageAOutput.key_topics.length} topics identified`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Processor] Stage A failed:", errorMsg);
      
      return createResult(module_id, course_id, module_title, "FAILED", startTime, {
        apiCalls,
        chunks_retrieved: chunks.length,
        error: `Stage A failed: ${errorMsg}`,
      });
    }

    // Step 3: Stage B - Flashcard Generation
    console.log("[Processor] Step 3: Running Stage B (Flashcard Generation)...");
    let stageBOutput: StageBOutput;
    
    try {
      stageBOutput = await runStageB(module_id, module_title, course_id, chunks, stageAOutput, settings);
      apiCalls++;
      warnings.push(...stageBOutput.warnings);
      console.log(`[Processor] Stage B complete: ${stageBOutput.cards.length} cards generated`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Processor] Stage B failed:", errorMsg);
      
      return createResult(module_id, course_id, module_title, "FAILED", startTime, {
        apiCalls,
        chunks_retrieved: chunks.length,
        error: `Stage B failed: ${errorMsg}`,
      });
    }

    // Step 4: Verification
    console.log("[Processor] Step 4: Verifying cards...");
    const { cards: verifiedCards, verifiedCount } = verifyCards(stageBOutput.cards, chunks);
    console.log(`[Processor] Verification complete: ${verifiedCount}/${verifiedCards.length} verified`);

    // Step 5: Post-processing
    console.log("[Processor] Step 5: Post-processing...");
    const { cards: processedCards, warnings: postWarnings } = postProcess(verifiedCards, settings);
    warnings.push(...postWarnings);

    // Step 6: Save deck
    console.log("[Processor] Step 6: Saving deck...");
    const { path: deckPath, deck_id } = await saveDeckToStore(module_id, {
      ...stageBOutput,
      cards: processedCards,
      module_id,
      module_title,
    });
    console.log(`[Processor] Deck saved: ${deckPath}`);

    // Determine status
    const reviewCount = processedCards.filter(c => c.review_required).length;
    if (reviewCount > 0) {
      warnings.push(`${reviewCount} cards flagged for review`);
    }

    const status = processedCards.length === 0
      ? "FAILED"
      : processedCards.length < settings.target_card_count || reviewCount > 0
        ? "PARTIAL"
        : "SUCCESS";

    return createResult(module_id, course_id, module_title, status, startTime, {
      apiCalls,
      chunks_retrieved: chunks.length,
      generated_count: processedCards.length,
      verified_count: verifiedCount,
      deck_id,
      warnings,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Processor] Fatal error:", errorMsg);
    
    return createResult(module_id, course_id, module_title, "FAILED", startTime, {
      apiCalls,
      chunks_retrieved: 0,
      error: errorMsg,
    });
  }
}

// =============================================================================
// CHUNK RETRIEVAL
// =============================================================================

async function getChunks(module_id: string, topK: number): Promise<Chunk[]> {
  // Check if using local chunks
  if (process.env.USE_LOCAL_CHUNKS === "true") {
    console.log("[Processor] Using local fixture chunks");
    return loadLocalChunks();
  }

  // Use real vector DB retrieval
  const result = await retrieveChunks({
    module_id,
    retrieval_K: topK,
  });

  return result.chunks as Chunk[];
}

function loadLocalChunks(): Chunk[] {
  const fixturePath = path.join(process.cwd(), "test", "fixtures", "module-sample-chunks.json");
  
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Local chunks fixture not found: ${fixturePath}`);
  }

  const content = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(content) as Chunk[];
}

// =============================================================================
// STAGE A
// =============================================================================

async function runStageA(
  module_id: string,
  module_title: string,
  course_id: string,
  chunks: Chunk[],
  settings: OrchestratorSettings
): Promise<StageAOutput> {
  // Check if using mock LLM
  if (process.env.MOCK_LLM === "true") {
    console.log("[Processor] Using mock Stage A response");
    return getMockStageAOutput(chunks);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: settings.model,
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.max_output_tokens,
    },
  });

  const userPrompt = buildStageACompletePrompt({
    module_id,
    module_title,
    course_id,
    contextChunks: chunks,
  });

  // Retry logic
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < settings.max_retries; attempt++) {
    try {
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: STAGE_A_SYSTEM_PROMPT_COMPLETE }] },
          { role: "model", parts: [{ text: "I understand. I will analyze the chunks and produce JSON output." }] },
        ],
      });

      const result = await Promise.race([
        chat.sendMessage(userPrompt),
        timeout<never>(STAGE_TIMEOUT_MS, "Stage A timeout"),
      ]) as Awaited<ReturnType<typeof chat.sendMessage>>;

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from Stage A response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return StageAOutputSchema.parse(parsed);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < settings.max_retries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`[Stage A] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("Stage A failed after retries");
}

// =============================================================================
// STAGE B
// =============================================================================

async function runStageB(
  module_id: string,
  module_title: string,
  course_id: string,
  chunks: Chunk[],
  stageAOutput: StageAOutput,
  settings: OrchestratorSettings
): Promise<StageBOutput> {
  // Check if using mock LLM
  if (process.env.MOCK_LLM === "true") {
    console.log("[Processor] Using mock Stage B response");
    return getMockStageBOutput(module_id, module_title, chunks, settings);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: settings.model,
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.max_output_tokens,
    },
  });

  const userPrompt = buildStageBCompletePrompt({
    module_id,
    module_title,
    course_id,
    contextChunks: chunks,
    module_summary: stageAOutput.module_summary,
    key_topics: stageAOutput.key_topics,
    settings: {
      target_card_count: settings.target_card_count,
      difficulty_distribution: settings.difficulty_distribution,
    },
  });

  // Retry logic
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < settings.max_retries; attempt++) {
    try {
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: STAGE_B_SYSTEM_PROMPT_COMPLETE }] },
          { role: "model", parts: [{ text: "I understand. I will generate flashcards with proper evidence." }] },
        ],
      });

      const result = await Promise.race([
        chat.sendMessage(userPrompt),
        timeout<never>(STAGE_TIMEOUT_MS, "Stage B timeout"),
      ]) as Awaited<ReturnType<typeof chat.sendMessage>>;

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from Stage B response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.error) {
        throw new Error(`Stage B error: ${parsed.details}`);
      }

      return StageBOutputSchema.parse(parsed);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < settings.max_retries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`[Stage B] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("Stage B failed after retries");
}

// =============================================================================
// VERIFICATION
// =============================================================================

function verifyCards(
  cards: Flashcard[],
  chunks: Chunk[]
): { cards: Flashcard[]; verifiedCount: number } {
  const verifiedCards: Flashcard[] = [];
  let verifiedCount = 0;

  for (const card of cards) {
    const result = programmaticVerify(card, chunks);
    
    verifiedCards.push({
      ...card,
      review_required: !result.verified,
      confidence_score: result.verified 
        ? Math.max(card.confidence_score, result.confidence)
        : Math.min(card.confidence_score, result.confidence),
    });

    if (result.verified) {
      verifiedCount++;
    }
  }

  return { cards: verifiedCards, verifiedCount };
}

function programmaticVerify(card: Flashcard, chunks: Chunk[]): CardVerificationResult {
  let allVerified = true;
  const corrections: CardVerificationResult["corrections"] = [];

  for (let i = 0; i < card.evidence.length; i++) {
    const evidence = card.evidence[i];
    const chunk = chunks.find(c => c.chunk_id === evidence.chunk_id);

    if (!chunk) {
      corrections.push({
        evidence_index: i,
        status: "missing",
        corrected_excerpt: null,
        reason: `Chunk ${evidence.chunk_id} not found`,
      });
      allVerified = false;
      continue;
    }

    const normalizedChunk = chunk.text.toLowerCase().replace(/\s+/g, " ").trim();
    const normalizedExcerpt = evidence.excerpt.toLowerCase().replace(/\s+/g, " ").trim();

    if (normalizedChunk.includes(normalizedExcerpt)) {
      corrections.push({ evidence_index: i, status: "ok", corrected_excerpt: null });
    } else {
      // Try to find similar sentence
      const sentences = chunk.text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
      const similar = sentences.find(s => {
        const normalizedSentence = s.toLowerCase().replace(/\s+/g, " ").trim();
        return calculateSimilarity(normalizedSentence, normalizedExcerpt) > 0.5;
      });

      if (similar) {
        corrections.push({
          evidence_index: i,
          status: "corrected",
          corrected_excerpt: similar,
          reason: "Excerpt adjusted to match chunk",
        });
      } else {
        corrections.push({
          evidence_index: i,
          status: "missing",
          corrected_excerpt: null,
          reason: "No matching text found in chunk",
        });
        allVerified = false;
      }
    }
  }

  return {
    card_id: card.card_id,
    verified: allVerified,
    confidence: allVerified ? 0.95 : 0.4,
    corrections,
  };
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

// =============================================================================
// POST-PROCESSING
// =============================================================================

function postProcess(
  cards: Flashcard[],
  settings: OrchestratorSettings
): { cards: Flashcard[]; warnings: string[] } {
  const warnings: string[] = [];
  let processedCards = [...cards];

  // 1. Enforce answer limits
  processedCards = processedCards.map(card => {
    const words = card.a.split(/\s+/);
    if (words.length > 40) {
      return { ...card, a: words.slice(0, 40).join(" ") + "..." };
    }
    if (card.a.length > 300) {
      return { ...card, a: card.a.substring(0, 297) + "..." };
    }
    return card;
  });

  // 2. Deduplicate
  const { cards: dedupedCards, removed } = deduplicateCards(processedCards, settings.dedupe_threshold);
  processedCards = dedupedCards;
  if (removed > 0) {
    warnings.push(`Removed ${removed} duplicate questions`);
  }

  // 3. Check difficulty balance
  const diffs = {
    easy: processedCards.filter(c => c.difficulty === "easy").length,
    medium: processedCards.filter(c => c.difficulty === "medium").length,
    hard: processedCards.filter(c => c.difficulty === "hard").length,
  };
  
  if (Math.abs(diffs.easy - settings.difficulty_distribution.easy) > 2 ||
      Math.abs(diffs.medium - settings.difficulty_distribution.medium) > 2 ||
      Math.abs(diffs.hard - settings.difficulty_distribution.hard) > 2) {
    warnings.push(`Difficulty imbalance: easy=${diffs.easy}, medium=${diffs.medium}, hard=${diffs.hard}`);
  }

  return { cards: processedCards, warnings };
}

function deduplicateCards(
  cards: Flashcard[],
  threshold: number
): { cards: Flashcard[]; removed: number } {
  const unique: Flashcard[] = [];
  const seenQuestions: string[] = [];
  let removed = 0;

  for (const card of cards) {
    const normalized = card.q.toLowerCase().replace(/[^\w\s]/g, "").trim();

    let isDuplicate = false;
    for (const seen of seenQuestions) {
      if (calculateSimilarity(normalized, seen) > threshold) {
        isDuplicate = true;
        removed++;
        break;
      }
    }

    if (!isDuplicate) {
      seenQuestions.push(normalized);
      unique.push(card);
    }
  }

  return { cards: unique, removed };
}

// =============================================================================
// HELPERS
// =============================================================================

function createResult(
  module_id: string,
  course_id: string,
  module_title: string,
  status: ModuleResult["status"],
  startTime: number,
  opts: {
    apiCalls?: number;
    chunks_retrieved?: number;
    generated_count?: number;
    verified_count?: number;
    deck_id?: string;
    warnings?: string[];
    error?: string;
  }
): ModuleResult {
  return {
    module_id,
    course_id,
    module_title,
    status,
    generated_count: opts.generated_count || 0,
    verified_count: opts.verified_count || 0,
    warnings: opts.warnings || [],
    deck_id: opts.deck_id || null,
    metrics: {
      time_ms: Date.now() - startTime,
      api_calls: opts.apiCalls || 0,
      cost_estimate: 0,
      chunks_retrieved: opts.chunks_retrieved || 0,
      verification_rate: opts.generated_count && opts.verified_count
        ? opts.verified_count / opts.generated_count
        : 0,
    },
    logs_url: null,
    error_message: opts.error,
    retry_count: 0,
    completed_at: new Date().toISOString(),
  };
}

function timeout<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
