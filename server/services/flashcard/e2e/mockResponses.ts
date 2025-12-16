/**
 * Mock LLM Responses for E2E Testing
 * 
 * Provides deterministic mock responses for Stage A and Stage B
 * to enable testing without real LLM API calls.
 */

import type { Chunk, StageAOutput, StageBOutput, Flashcard } from "../types";
import type { OrchestratorSettings } from "../orchestratorTypes";

// =============================================================================
// HR-FOCUSED FEW-SHOT EXAMPLES (embedded in prompts)
// =============================================================================

export const HR_FEW_SHOT_EXAMPLES = {
  organizationalCulture: {
    chunk: {
      chunk_id: "ex-oc1",
      text: "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations.",
    },
    card: {
      q: "What is organizational culture?",
      a: "A system of shared assumptions, values, and beliefs that governs behavior in organizations.",
      difficulty: "easy" as const,
      bloom_level: "Remember" as const,
    },
  },
  recruitment: {
    chunk: {
      chunk_id: "ex-rec1",
      text: "Recruitment refers to the overall process of attracting, shortlisting, selecting and appointing suitable candidates for jobs within an organization.",
    },
    card: {
      q: "What are the main steps in the recruitment process?",
      a: "Attracting candidates, shortlisting applicants, selecting suitable candidates, and appointing them to positions within the organization.",
      difficulty: "medium" as const,
      bloom_level: "Understand" as const,
    },
  },
};

// =============================================================================
// MOCK STAGE A OUTPUT
// =============================================================================

/**
 * Generate a mock Stage A output based on provided chunks.
 */
export function getMockStageAOutput(chunks: Chunk[]): StageAOutput {
  // Extract topics from chunk headings and text
  const topics = chunks
    .filter(c => c.heading)
    .map(c => ({
      topic: c.heading!,
      supports: [c.chunk_id],
    }));

  // Generate summary points from chunks
  const summaryPoints = chunks.slice(0, 6).map(chunk => {
    // Extract first sentence as summary point
    const firstSentence = chunk.text.split(/[.!?]/)[0].trim();
    return {
      point: firstSentence.length > 100 
        ? firstSentence.substring(0, 100) + "..."
        : firstSentence,
      supports: [chunk.chunk_id],
    };
  });

  return {
    module_summary: summaryPoints,
    key_topics: topics.length > 0 ? topics : [
      { topic: "Core Concepts", supports: [chunks[0]?.chunk_id || "c1"] },
      { topic: "Key Definitions", supports: [chunks[1]?.chunk_id || "c2"] },
    ],
    coverage_map: [],
  };
}

// =============================================================================
// MOCK STAGE B OUTPUT
// =============================================================================

/**
 * Generate a mock Stage B output with deterministic flashcards.
 */
export function getMockStageBOutput(
  module_id: string,
  module_title: string,
  chunks: Chunk[],
  settings: OrchestratorSettings
): StageBOutput {
  const cards: Flashcard[] = [];
  const targetCount = Math.min(settings.target_card_count, chunks.length);

  // Generate cards based on chunks
  for (let i = 0; i < targetCount; i++) {
    const chunk = chunks[i % chunks.length];
    const cardNum = i + 1;

    // Determine difficulty based on distribution
    let difficulty: "easy" | "medium" | "hard";
    if (i < settings.difficulty_distribution.easy) {
      difficulty = "easy";
    } else if (i < settings.difficulty_distribution.easy + settings.difficulty_distribution.medium) {
      difficulty = "medium";
    } else {
      difficulty = "hard";
    }

    // Determine Bloom level based on difficulty
    const bloomLevels: Record<string, Flashcard["bloom_level"]> = {
      easy: "Remember",
      medium: "Understand",
      hard: "Analyze",
    };

    // Extract excerpt from chunk
    const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const excerpt = sentences[0]?.trim() || chunk.text.substring(0, 150);

    // Generate question based on chunk content
    const question = generateQuestionFromChunk(chunk, difficulty);
    const answer = generateAnswerFromChunk(chunk, excerpt);

    // Determine source type
    const sourceType = getSourceType(chunk.source_file);
    const loc = chunk.slide_or_page || (chunk.start_sec 
      ? formatTimestamp(chunk.start_sec, chunk.end_sec)
      : "p.1");

    cards.push({
      card_id: `M${module_id}_C${cardNum}`,
      q: question,
      a: answer,
      difficulty,
      bloom_level: bloomLevels[difficulty],
      evidence: [{
        chunk_id: chunk.chunk_id,
        source_file: chunk.source_file,
        loc: String(loc),
        start_sec: chunk.start_sec,
        end_sec: chunk.end_sec,
        excerpt: excerpt.length > 250 ? excerpt.substring(0, 247) + "..." : excerpt,
      }],
      sources: [{
        type: sourceType,
        file: chunk.source_file,
        loc: String(loc),
      }],
      confidence_score: 0.92,
      rationale: `Tests understanding of ${chunk.heading || "key concept"} from ${chunk.source_file}.`,
      review_required: false,
    });
  }

  return {
    module_id,
    module_title,
    generated_count: cards.length,
    cards,
    warnings: cards.length < settings.target_card_count 
      ? [`Generated ${cards.length} cards (target: ${settings.target_card_count})`]
      : [],
    generation_metadata: {
      model: "mock-model",
      temperature: 0.1,
      timestamp: new Date().toISOString(),
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateQuestionFromChunk(chunk: Chunk, difficulty: string): string {
  const heading = chunk.heading || "this concept";
  
  switch (difficulty) {
    case "easy":
      return `What is ${heading.toLowerCase()}?`;
    case "medium":
      return `Explain the key aspects of ${heading.toLowerCase()}.`;
    case "hard":
      return `How does ${heading.toLowerCase()} impact organizational effectiveness?`;
    default:
      return `Define ${heading.toLowerCase()}.`;
  }
}

function generateAnswerFromChunk(chunk: Chunk, excerpt: string): string {
  // Simplify the excerpt into an answer
  let answer = excerpt;
  
  // Remove common prefixes
  answer = answer.replace(/^(The |A |An )/i, "");
  
  // Ensure it's not too long
  const words = answer.split(/\s+/);
  if (words.length > 35) {
    answer = words.slice(0, 35).join(" ") + "...";
  }
  
  // Capitalize first letter
  answer = answer.charAt(0).toUpperCase() + answer.slice(1);
  
  // Ensure it ends with a period
  if (!answer.endsWith(".") && !answer.endsWith("...")) {
    answer += ".";
  }
  
  return answer;
}

function getSourceType(filename: string): "video" | "slides" | "pdf" | "audio" | "quiz" {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  switch (ext) {
    case "mp4":
    case "webm":
    case "mov":
      return "video";
    case "pptx":
    case "ppt":
      return "slides";
    case "pdf":
      return "pdf";
    case "mp3":
    case "wav":
    case "m4a":
      return "audio";
    default:
      return "pdf";
  }
}

function formatTimestamp(startSec: number | null, endSec: number | null): string {
  if (startSec === null) return "";
  
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  
  if (endSec !== null) {
    return `${formatTime(startSec)}-${formatTime(endSec)}`;
  }
  
  return formatTime(startSec);
}

// =============================================================================
// EXPORTS FOR PROMPT ENHANCEMENT
// =============================================================================

/**
 * Get HR-specific few-shot examples for Stage A prompts.
 */
export function getStageAFewShotExamples(): string {
  return `
### HR-SPECIFIC FEW-SHOT EXAMPLE 1: Organizational Culture ###

ContextChunk:
{"chunk_id": "hr-oc1", "heading": "Organizational Culture", "text": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations. These shared values have a strong influence on the people in the organization."}

Expected Summary Point:
{"point": "Organizational culture comprises shared assumptions, values, and beliefs that govern workplace behavior", "supports": ["hr-oc1"]}

Expected Key Topic:
{"topic": "Organizational Culture Definition", "supports": ["hr-oc1"]}

### HR-SPECIFIC FEW-SHOT EXAMPLE 2: Recruitment ###

ContextChunk:
{"chunk_id": "hr-rec1", "heading": "Recruitment Process", "text": "Recruitment refers to the overall process of attracting, shortlisting, selecting and appointing suitable candidates for jobs within an organization. The process includes job analysis, sourcing, screening, and selection."}

Expected Summary Point:
{"point": "Recruitment encompasses attracting, shortlisting, selecting, and appointing candidates through systematic processes", "supports": ["hr-rec1"]}

Expected Key Topic:
{"topic": "Recruitment Process Overview", "supports": ["hr-rec1"]}
`;
}

/**
 * Get HR-specific few-shot examples for Stage B prompts.
 */
export function getStageBFewShotExamples(): string {
  return `
### HR-SPECIFIC FEW-SHOT EXAMPLE 1: Organizational Culture (Easy/Remember) ###

ContextChunk:
{"chunk_id": "hr-oc1", "source_file": "hr_slides.pptx", "slide_or_page": "slide 3", "text": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations."}

Expected Card:
{
  "card_id": "M1_C1",
  "q": "What is organizational culture?",
  "a": "A system of shared assumptions, values, and beliefs that governs how people behave in organizations.",
  "difficulty": "easy",
  "bloom_level": "Remember",
  "evidence": [{"chunk_id": "hr-oc1", "source_file": "hr_slides.pptx", "loc": "slide 3", "start_sec": null, "end_sec": null, "excerpt": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations."}],
  "sources": [{"type": "slides", "file": "hr_slides.pptx", "loc": "slide 3"}],
  "confidence_score": 0.98,
  "rationale": "Core definition question testing fundamental HR concept.",
  "review_required": false
}

### HR-SPECIFIC FEW-SHOT EXAMPLE 2: Recruitment (Hard/Analyze) ###

ContextChunk:
{"chunk_id": "hr-rec2", "source_file": "recruitment.pdf", "slide_or_page": "p.15", "text": "Internal recruitment involves filling vacancies with existing employees through promotions or transfers. External recruitment brings in new talent from outside. Internal recruitment improves morale and reduces training costs, while external recruitment brings fresh perspectives."}

Expected Card:
{
  "card_id": "M1_C2",
  "q": "Compare the advantages of internal versus external recruitment strategies.",
  "a": "Internal recruitment improves employee morale and reduces training costs by promoting existing staff. External recruitment brings fresh perspectives and new skills from outside the organization.",
  "difficulty": "hard",
  "bloom_level": "Analyze",
  "evidence": [{"chunk_id": "hr-rec2", "source_file": "recruitment.pdf", "loc": "p.15", "start_sec": null, "end_sec": null, "excerpt": "Internal recruitment improves morale and reduces training costs, while external recruitment brings fresh perspectives."}],
  "sources": [{"type": "pdf", "file": "recruitment.pdf", "loc": "p.15"}],
  "confidence_score": 0.95,
  "rationale": "Comparative analysis question requiring synthesis of recruitment strategy trade-offs.",
  "review_required": false
}
`;
}
