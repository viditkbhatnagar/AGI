/**
 * Flashcard Generation Pipeline - Prompt Templates
 * 
 * Contains all system and user prompts for:
 * - Stage A: Module Summarization
 * - Stage B: Flashcard Generation  
 * - Verification: Evidence Validation
 */

import type { Chunk, StageAOutput, ModuleMetadata, Flashcard } from "./types";

// =============================================================================
// STAGE A - SUMMARY PROMPT
// =============================================================================

export const STAGE_A_SYSTEM_PROMPT = `You are an expert instructional designer and domain summarizer. Use ONLY the text in the provided ContextChunks and the module metadata. If information necessary to form an accurate statement is missing, explicitly mark it "MISSING_INFO".

CRITICAL RULES:
1. Use ONLY information from ContextChunks - never invent or assume facts
2. Every bullet point MUST reference supporting chunk_ids in square brackets
3. If a statement requires assumption, mark it "MISSING_INFO" instead
4. Output MUST be valid JSON with exact keys specified
5. Be comprehensive but concise - each point should capture a distinct concept`;

export function buildStageAUserPrompt(params: {
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: Chunk[];
    module_metadata?: ModuleMetadata;
}): string {
    const { module_id, module_title, course_id, contextChunks, module_metadata } = params;

    const chunksJson = JSON.stringify(contextChunks, null, 2);
    const metadataJson = module_metadata ? JSON.stringify(module_metadata, null, 2) : "null";

    return `## INPUT DATA

module_id: "${module_id}"
module_title: "${module_title}"
course_id: "${course_id}"

### ContextChunks:
\`\`\`json
${chunksJson}
\`\`\`

### Module Metadata:
\`\`\`json
${metadataJson}
\`\`\`

## INSTRUCTIONS

Read all ContextChunks provided carefully. Produce:

a) **Module Summary**: 6–10 numbered bullet points listing the module's most important concepts and facts. Each bullet MUST reference the chunk_ids that support it in square brackets, e.g., "[c123]".

b) **Key Topics**: A list of 6–12 key topics (one-line each) extracted from headings and content, each mapped to supporting chunk_ids.

c) **Coverage Map**: If course_outline_headings are provided in module_metadata, for each heading mark "Covered" or "Not Covered" with supporting chunk_ids. If no outline provided, return empty array.

## STRICT RULES
- Use ONLY information from ContextChunks
- If a bullet requires an assumption, mark "MISSING_INFO" and do NOT invent facts
- Every claim must have chunk_id citations

## OUTPUT FORMAT

Return ONLY valid JSON with this exact structure (no markdown, no explanation):

{
  "module_summary": [
    {"point": "Description of key concept or fact", "supports": ["c12", "c34"]},
    ...
  ],
  "key_topics": [
    {"topic": "Topic name", "supports": ["c12"]},
    ...
  ],
  "coverage_map": [
    {"heading": "Heading Title", "status": "Covered", "supports": ["c12"]},
    ...
  ]
}`;
}

// =============================================================================
// STAGE B - FLASHCARD GENERATION PROMPT
// =============================================================================

export const STAGE_B_SYSTEM_PROMPT = `You are an expert instructional designer and exam-writer for higher education. Your job: from the provided module context, create exactly 10 distinct flashcards (question + concise answer), prioritized for learning and exam relevance.

CRITICAL RULES:
1. Use ONLY ContextChunks and Stage A outputs - NEVER hallucinate
2. If a fact cannot be supported by context, set evidence to [] and verification to "INSUFFICIENT_INFORMATION"
3. Each answer must be max 40 words and ≤300 characters
4. Every evidence excerpt must be EXACT text copied from chunks
5. Output MUST be valid JSON only - no prose or markdown`;

export function buildStageBUserPrompt(params: {
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: Chunk[];
    stageAOutput: StageAOutput;
}): string {
    const { module_id, module_title, course_id, contextChunks, stageAOutput } = params;

    const chunksJson = JSON.stringify(contextChunks, null, 2);
    const summaryJson = JSON.stringify(stageAOutput.module_summary, null, 2);
    const keyTopicsJson = JSON.stringify(stageAOutput.key_topics, null, 2);

    return `## INPUT DATA

module_id: "${module_id}"
module_title: "${module_title}"
course_id: "${course_id}"

### ContextChunks:
\`\`\`json
${chunksJson}
\`\`\`

### Module Summary (from Stage A):
\`\`\`json
${summaryJson}
\`\`\`

### Key Topics (from Stage A):
\`\`\`json
${keyTopicsJson}
\`\`\`

## FEW-SHOT EXAMPLES

### Example ContextChunk:
\`\`\`json
{
  "chunk_id": "c1",
  "source_file": "intro_slides.pptx",
  "provider": "local",
  "slide_or_page": "slide 2",
  "start_sec": null,
  "end_sec": null,
  "heading": "Definition",
  "text": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations."
}
\`\`\`

### Expected Example Card:
\`\`\`json
{
  "card_id": "M1_C1",
  "q": "What is organizational culture?",
  "a": "A system of shared assumptions, values, and beliefs that governs behavior in organizations.",
  "difficulty": "easy",
  "bloom_level": "Remember",
  "evidence": [{
    "chunk_id": "c1",
    "source_file": "intro_slides.pptx",
    "loc": "slide 2",
    "start_sec": null,
    "end_sec": null,
    "excerpt": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations."
  }],
  "sources": [{"type": "slides", "file": "intro_slides.pptx", "loc": "slide 2"}],
  "confidence_score": 0.98,
  "rationale": "Core definition; basic concept necessary for subsequent topics."
}
\`\`\`

## INSTRUCTIONS

Generate exactly 10 flashcards following these rules:

### Card Format
Each card object must include:
- **card_id** (string): unique id format "M${module_id}_C<num>" (1-10)
- **q** (string): single clear question (one sentence)
- **a** (string): concise answer, max 40 words, ≤300 characters
- **difficulty**: one of ["easy", "medium", "hard"]
- **bloom_level**: one of ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
- **evidence**: array of evidence objects with {chunk_id, source_file, loc, start_sec, end_sec, excerpt}
  - excerpt must be EXACT 1-2 sentences from the chunk supporting the answer
- **sources**: array of short citations for UI: {type, file, loc}
- **confidence_score**: float 0.0-1.0 (how confident answer is fully supported)
- **rationale**: 1-2 sentence explanation of question importance

### Distribution Requirements
- **Difficulty**: aim for ~3 easy, ~4 medium, ~3 hard
- **Bloom levels**: at least 3 cards should be Apply/Analyze/Evaluate/Create (higher-order)
- **Coverage**: ensure questions cover different key_topics from Stage A; avoid duplicate topics

### Evidence Rules
- For every evidence item include chunk_id and EXACT excerpt (copy the phrase exactly as it appears)
- If excerpt > 250 chars, truncate to complete sentence and add "…"
- If no supporting text exists for a fact, set evidence to [] and confidence_score to 0.0

### If Insufficient Content
If context doesn't contain enough distinct factual material for 10 cards:
- Generate as many as possible with proper evidence
- Set "generated_count" accordingly
- Add explanation to "warnings" array

## OUTPUT FORMAT

Return ONLY this JSON structure (no markdown, no prose):

{
  "module_id": "${module_id}",
  "module_title": "${module_title}",
  "generated_count": 10,
  "cards": [
    { /* card object */ },
    ...
  ],
  "warnings": [],
  "generation_metadata": {
    "model": "gemini-1.5-flash",
    "temperature": 0.1,
    "timestamp": "<ISO8601 timestamp>"
  }
}

If any rule is broken, return:
{"error": "RULE_VIOLATION", "details": "Which rule was violated"}`;
}

// =============================================================================
// VERIFICATION PROMPT
// =============================================================================

export const VERIFICATION_SYSTEM_PROMPT = `You are an evidence verifier. For this card and the original ContextChunks, verify that each excerpt cited actually appears in the provided chunk text and that the excerpt supports the answer.

Your task:
1. Check if each evidence excerpt exists EXACTLY in the corresponding chunk
2. Verify the excerpt actually supports the answer given
3. If excerpt is not exact, find the minimal actual sentence that supports the answer
4. Return verification status and corrections`;

export function buildVerificationUserPrompt(params: {
    card: Flashcard;
    contextChunks: Chunk[];
}): string {
    const { card, contextChunks } = params;

    const cardJson = JSON.stringify(card, null, 2);
    const chunksJson = JSON.stringify(contextChunks, null, 2);

    return `## CARD TO VERIFY
\`\`\`json
${cardJson}
\`\`\`

## AVAILABLE CONTEXT CHUNKS
\`\`\`json
${chunksJson}
\`\`\`

## INSTRUCTIONS

For each evidence entry in the card:
1. Find the chunk with matching chunk_id
2. Check if the excerpt exists EXACTLY in the chunk's text
3. Verify the excerpt supports the card's answer

### Verification Logic
- If excerpt is exact match AND supports answer → verified = true, confidence = 0.9-1.0
- If excerpt is close match (minor differences) AND supports answer → verified = true, provide corrected_excerpt, confidence = 0.7-0.9
- If no matching text found → verified = false, reason = "excerpt not in chunk"
- If excerpt exists but doesn't support answer → verified = false, reason = "excerpt does not support answer"

## OUTPUT FORMAT

Return ONLY this JSON:

{
  "card_id": "${card.card_id}",
  "verified": true | false,
  "confidence": 0.0-1.0,
  "corrections": [
    {
      "evidence_index": 0,
      "original_excerpt": "...",
      "corrected_excerpt": "..." | null,
      "reason": "..." 
    }
  ]
}

- If all evidence is valid, return empty corrections array
- If any issues found, include correction objects for those`;
}

// =============================================================================
// SUPPLEMENTARY CARD GENERATION PROMPT (for uncovered topics)
// =============================================================================

export function buildSupplementaryCardPrompt(params: {
    module_id: string;
    module_title: string;
    uncovered_topic: string;
    contextChunks: Chunk[];
    existing_cards: Flashcard[];
}): string {
    const { module_id, module_title, uncovered_topic, contextChunks, existing_cards } = params;

    // Filter chunks that might be relevant to the uncovered topic
    const relevantChunks = contextChunks.filter(chunk =>
        chunk.text.toLowerCase().includes(uncovered_topic.toLowerCase()) ||
        chunk.heading?.toLowerCase().includes(uncovered_topic.toLowerCase())
    );

    if (relevantChunks.length === 0) {
        return `NO_RELEVANT_CHUNKS: Cannot generate card for topic "${uncovered_topic}" - no supporting chunks found.`;
    }

    const chunksJson = JSON.stringify(relevantChunks, null, 2);
    const existingQuestionsJson = JSON.stringify(
        existing_cards.map(c => ({ card_id: c.card_id, q: c.q })),
        null, 2
    );

    return `## TASK
Generate 1 additional flashcard specifically covering the topic: "${uncovered_topic}"

module_id: "${module_id}"
module_title: "${module_title}"

### Relevant ContextChunks:
\`\`\`json
${chunksJson}
\`\`\`

### Existing Questions (avoid duplicates):
\`\`\`json
${existingQuestionsJson}
\`\`\`

## INSTRUCTIONS
- Generate exactly 1 card focused on the topic "${uncovered_topic}"
- Follow all standard card format rules
- card_id should be "M${module_id}_C${existing_cards.length + 1}"
- Do NOT duplicate any existing questions
- If topic cannot be covered with available chunks, return error

## OUTPUT
Return ONLY the single card object JSON, or:
{"error": "INSUFFICIENT_INFO", "details": "Cannot generate card for this topic"}`;
}

// =============================================================================
// DIFFICULTY ADJUSTMENT PROMPT
// =============================================================================

export function buildDifficultyAdjustmentPrompt(params: {
    card: Flashcard;
    target_difficulty: "easy" | "medium" | "hard";
}): string {
    const { card, target_difficulty } = params;

    const cardJson = JSON.stringify(card, null, 2);

    return `## TASK
Adjust this flashcard's difficulty level from "${card.difficulty}" to "${target_difficulty}".

### Original Card:
\`\`\`json
${cardJson}
\`\`\`

## ADJUSTMENT GUIDELINES

**For EASY difficulty:**
- Question should ask for basic recall (definitions, simple facts)
- Use "What is...", "Define...", "Name..." question stems
- Answer should be straightforward with clear terminology

**For MEDIUM difficulty:**
- Question should require understanding relationships or comparisons
- Use "Explain...", "Compare...", "Describe how..." question stems  
- Answer may require understanding context

**For HARD difficulty:**
- Question should require application, analysis, or synthesis
- Use "Analyze...", "Evaluate...", "What would happen if..." question stems
- Answer may require combining multiple concepts

## RULES
- Keep the same core concept/topic covered
- Maintain the SAME evidence references (chunks)
- Update bloom_level appropriately for new difficulty
- Adjust rationale to reflect the change

## OUTPUT
Return ONLY the modified card JSON with updated q, a, difficulty, bloom_level, and rationale.
Keep all other fields (card_id, evidence, sources, confidence_score) unchanged.`;
}
