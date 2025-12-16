/**
 * Flashcard Orchestrator - Prompt Templates
 * 
 * Complete, copy-paste ready prompts for the orchestrator system.
 * Includes Stage A, Stage B, Verification, and Rebalance prompts
 * with few-shot examples and strict JSON output requirements.
 */

import type { Chunk, StageAOutput, Flashcard } from "./types";
import type { OrchestratorSettings } from "./orchestratorTypes";

// =============================================================================
// ORCHESTRATOR SYSTEM PROMPT (for background worker agent)
// =============================================================================

export const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Flashcard Orchestrator Agent. Your job is to run a reliable, auditable pipeline that generates high-quality flashcards for every module across courses. For each module you must:

1. Ensure content is present and accessible (presentations, PDFs, videos, recordings, quizzes).

2. Request or retrieve top-K context chunks from the vector DB (K default 8). If fewer than 4 chunks are returned, queue the module for re-indexing/transcription and return status: NEED_MORE_CONTENT.

3. Call Stage A (Module Summarization) using only the retrieved_chunks.

4. Call Stage B (Flashcard Generation) passing Stage A output + ContextChunks.

5. Run Verification for every card. If any evidence excerpt does not exactly match context, attempt automated correction (find closest sentence from chunk). If automated correction fails, flag the card and set review_required=true.

6. Postprocess the cards (dedupe, difficulty/bloom balancing, enforce answer limits).

7. Save deck to DB with metadata (module_id, course_id, model_version, generation_time, verified_rate, warnings).

8. Emit a module-level status object (success/partial/failure) with details and metrics.

9. Respect rate limits and use exponential backoff on API failures; retry up to N times (N=3) before failing the module.

10. Log each major step and record raw model responses for auditing (redact PII).

IMPORTANT PRINCIPLES:
- Never hallucinate or fabricate information
- Every flashcard answer must be directly supported by evidence from chunks
- Mark insufficient evidence cases explicitly
- Maintain strict JSON output formats
- Prioritize quality over quantity`;

// =============================================================================
// STAGE A PROMPT - MODULE SUMMARIZATION (Complete with Few-Shot)
// =============================================================================

export const STAGE_A_SYSTEM_PROMPT_COMPLETE = `You are an expert instructional designer and domain summarizer. 

STRICT RULES:
- Use ONLY the provided ContextChunks
- Do NOT invent or assume any facts
- If information is missing, mark it "MISSING_INFO"
- Output MUST be valid JSON - no markdown, no explanatory prose
- Every claim must reference supporting chunk_ids

Your output must follow the exact JSON structure specified in the instructions.`;

export function buildStageACompletePrompt(params: {
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: Chunk[];
    course_outline_headings?: string[];
}): string {
    const { module_id, module_title, course_id, contextChunks, course_outline_headings } = params;

    const chunksJson = JSON.stringify(contextChunks, null, 2);

    // Few-shot example
    const fewShotExample = `
### FEW-SHOT EXAMPLE ###

Example ContextChunks (abbreviated):
[
  {"chunk_id": "ex1", "text": "Project management is the application of knowledge, skills, tools, and techniques to project activities."},
  {"chunk_id": "ex2", "text": "The five process groups are: Initiating, Planning, Executing, Monitoring and Controlling, and Closing."}
]

Expected Output:
{
  "module_summary": [
    {"point": "Project management applies knowledge, skills, tools, and techniques to project activities", "supports": ["ex1"]},
    {"point": "Five process groups govern project lifecycle: Initiating, Planning, Executing, Monitoring/Controlling, Closing", "supports": ["ex2"]}
  ],
  "key_topics": [
    {"topic": "Definition of Project Management", "supports": ["ex1"]},
    {"topic": "Five Process Groups", "supports": ["ex2"]}
  ],
  "coverage_map": []
}

### END EXAMPLE ###`;

    const outlineSection = course_outline_headings?.length
        ? `
### Course Outline Headings (check coverage):
${JSON.stringify(course_outline_headings, null, 2)}`
        : '';

    return `## INPUT DATA

module_id: "${module_id}"
module_title: "${module_title}"
course_id: "${course_id}"

### ContextChunks:
\`\`\`json
${chunksJson}
\`\`\`
${outlineSection}
${fewShotExample}

## INSTRUCTIONS

Read all ContextChunks carefully. Produce EXACTLY this JSON structure:

1. **module_summary**: Array of 6–10 numbered concise bullets
   - Each bullet: { "point": "statement", "supports": ["chunk_id1", "chunk_id2"] }
   - Every point MUST have at least one supporting chunk_id

2. **key_topics**: Array of 6–12 topics
   - Each topic: { "topic": "topic name", "supports": ["chunk_id"] }
   - Extract from headings and main concepts in chunks

3. **coverage_map**: Array showing outline coverage (if headings provided)
   - Each item: { "heading": "Heading Title", "status": "Covered" | "Not Covered", "supports": ["chunk_id"] }
   - If no outline headings provided, return empty array []

## STRICT OUTPUT FORMAT

Return ONLY valid JSON, no other text:

{
  "module_summary": [
    {"point": "Concise statement about concept", "supports": ["c12", "c34"]},
    {"point": "Another key concept", "supports": ["c56"]}
  ],
  "key_topics": [
    {"topic": "Topic Name", "supports": ["c12"]},
    {"topic": "Another Topic", "supports": ["c34", "c56"]}
  ],
  "coverage_map": [
    {"heading": "Course Heading 1", "status": "Covered", "supports": ["c12"]},
    {"heading": "Course Heading 2", "status": "Not Covered", "supports": []}
  ]
}`;
}

// =============================================================================
// STAGE B PROMPT - FLASHCARD GENERATION (Complete with Few-Shot)
// =============================================================================

export const STAGE_B_SYSTEM_PROMPT_COMPLETE = `You are an expert exam-writer and instructional designer for higher education.

STRICT RULES:
- Create flashcards using ONLY the provided ContextChunks and Stage A outputs
- Do NOT hallucinate or invent facts
- If an answer cannot be fully supported, include the question but set evidence=[] and add "INSUFFICIENT_INFORMATION" warning
- Every evidence excerpt must be EXACT text copied from chunks
- Output MUST be valid JSON only - no markdown, no explanatory prose
- Each answer must be ≤40 words and ≤300 characters`;

export function buildStageBCompletePrompt(params: {
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: Chunk[];
    module_summary: StageAOutput["module_summary"];
    key_topics: StageAOutput["key_topics"];
    settings: {
        target_card_count: number;
        difficulty_distribution: { easy: number; medium: number; hard: number };
    };
}): string {
    const { module_id, module_title, course_id, contextChunks, module_summary, key_topics, settings } = params;

    const chunksJson = JSON.stringify(contextChunks, null, 2);
    const summaryJson = JSON.stringify(module_summary, null, 2);
    const topicsJson = JSON.stringify(key_topics, null, 2);

    const fewShotExamples = `
### FEW-SHOT EXAMPLE 1 ###

ContextChunk:
{"chunk_id": "c1", "source_file": "intro_slides.pptx", "slide_or_page": "slide 2", "text": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations."}

Expected Card (Easy, Remember):
{
  "card_id": "M1_C1",
  "q": "What is organizational culture?",
  "a": "A system of shared assumptions, values, and beliefs that governs behavior in organizations.",
  "difficulty": "easy",
  "bloom_level": "Remember",
  "evidence": [{"chunk_id": "c1", "source_file": "intro_slides.pptx", "loc": "slide 2", "start_sec": null, "end_sec": null, "excerpt": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations."}],
  "sources": [{"type": "slides", "file": "intro_slides.pptx", "loc": "slide 2"}],
  "confidence_score": 0.98,
  "rationale": "Core definition; fundamental concept for understanding workplace dynamics.",
  "review_required": false
}

### FEW-SHOT EXAMPLE 2 ###

ContextChunk:
{"chunk_id": "c5", "source_file": "leadership.mp4", "start_sec": 245.0, "end_sec": 310.0, "text": "Transformational leaders inspire followers by appealing to higher ideals and moral values. They create a vision that motivates employees beyond their self-interest, whereas transactional leaders focus on exchanges and rewards."}

Expected Card (Hard, Analyze):
{
  "card_id": "M1_C2",
  "q": "How do transformational leaders differ from transactional leaders in their approach to employee motivation?",
  "a": "Transformational leaders inspire through vision and higher ideals beyond self-interest, while transactional leaders focus on exchanges, rewards, and compliance-based motivation.",
  "difficulty": "hard",
  "bloom_level": "Analyze",
  "evidence": [{"chunk_id": "c5", "source_file": "leadership.mp4", "loc": "04:05-05:10", "start_sec": 245.0, "end_sec": 310.0, "excerpt": "Transformational leaders inspire followers by appealing to higher ideals and moral values. They create a vision that motivates employees beyond their self-interest, whereas transactional leaders focus on exchanges and rewards."}],
  "sources": [{"type": "video", "file": "leadership.mp4", "loc": "04:05-05:10"}],
  "confidence_score": 0.95,
  "rationale": "Comparative analysis question testing deeper understanding of leadership styles.",
  "review_required": false
}

### END EXAMPLES ###`;

    return `## INPUT DATA

module_id: "${module_id}"
module_title: "${module_title}"  
course_id: "${course_id}"
target_card_count: ${settings.target_card_count}
difficulty_distribution: easy=${settings.difficulty_distribution.easy}, medium=${settings.difficulty_distribution.medium}, hard=${settings.difficulty_distribution.hard}

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
${topicsJson}
\`\`\`

${fewShotExamples}

## INSTRUCTIONS

Generate exactly ${settings.target_card_count} flashcards following these requirements:

### Card Object Structure (required for each card):
- **card_id**: "M${module_id}_C<number>" (1 through ${settings.target_card_count})
- **q**: Single clear question (one sentence)
- **a**: Concise answer, max 40 words, ≤300 characters
- **difficulty**: "easy" | "medium" | "hard"
- **bloom_level**: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
- **evidence**: Array of evidence objects:
  - {chunk_id, source_file, loc, start_sec, end_sec, excerpt}
  - excerpt MUST be exact 1-2 sentence snippet from chunk.text
- **sources**: Array for UI display: {type, file, loc}
  - type: "video" | "slides" | "pdf" | "quiz" | "audio"
  - loc: "slide 3" or "00:03:12-00:03:35" or "p.5"
- **confidence_score**: 0.0-1.0 (how well evidence supports answer)
- **rationale**: 1-2 sentences explaining why this question matters
- **review_required**: false (set true only if evidence is weak)

### Distribution Requirements:
- Difficulty: ~${settings.difficulty_distribution.easy} easy, ~${settings.difficulty_distribution.medium} medium, ~${settings.difficulty_distribution.hard} hard
- Bloom levels: At least 3 cards should be Apply/Analyze/Evaluate/Create (higher-order)
- Coverage: Cover different key_topics; avoid duplicate topics

### Evidence Rules:
- Every excerpt must be EXACT text from the chunk
- If excerpt > 250 chars, truncate to complete sentence and add "…"
- If no supporting evidence exists, set evidence=[] and confidence_score=0.0

### Insufficient Content:
If fewer than ${settings.target_card_count} cards can be fully supported:
- Generate only fully-supported cards
- Set "generated_count" to actual number
- Add warning: "Insufficient content for ${settings.target_card_count} cards; generated N"

## OUTPUT FORMAT

Return ONLY this JSON structure:

{
  "module_id": "${module_id}",
  "module_title": "${module_title}",
  "generated_count": ${settings.target_card_count},
  "cards": [
    {
      "card_id": "M${module_id}_C1",
      "q": "Question text?",
      "a": "Concise answer text.",
      "difficulty": "easy",
      "bloom_level": "Remember",
      "evidence": [{"chunk_id": "c1", "source_file": "file.pptx", "loc": "slide 1", "start_sec": null, "end_sec": null, "excerpt": "Exact text from chunk."}],
      "sources": [{"type": "slides", "file": "file.pptx", "loc": "slide 1"}],
      "confidence_score": 0.95,
      "rationale": "Why this question matters.",
      "review_required": false
    }
  ],
  "warnings": [],
  "generation_metadata": {
    "model": "gemini-1.5-flash",
    "temperature": 0.1,
    "timestamp": "${new Date().toISOString()}"
  }
}`;
}

// =============================================================================
// VERIFICATION PROMPT (Per-card or batch)
// =============================================================================

export const VERIFICATION_SYSTEM_PROMPT_COMPLETE = `You are an evidence verifier. Your task is to verify that every evidence excerpt in a flashcard exactly matches text in the source chunk and actually supports the answer given.

VERIFICATION RULES:
1. For each evidence item, find the chunk with matching chunk_id
2. Check if the excerpt exists EXACTLY in the chunk's text field
3. Verify the excerpt logically supports the card's answer
4. If exact match missing, find the closest supporting sentence and return it as corrected_excerpt
5. If no supporting text exists at all, mark as "missing"

OUTPUT STRICTLY AS JSON.`;

export function buildVerificationPrompt(params: {
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

## VERIFICATION TASK

For each item in the card's "evidence" array:

1. Find the chunk with matching chunk_id
2. Check if evidence.excerpt exists EXACTLY in chunk.text
3. Verify the excerpt supports the card's answer (q and a)

### Evaluation Criteria:
- **ok**: Excerpt is exact match AND supports answer → confidence 0.9-1.0
- **corrected**: Excerpt not exact but similar text exists that supports answer → provide corrected_excerpt, confidence 0.7-0.9
- **missing**: No matching or supporting text found → confidence 0.0-0.3

## OUTPUT FORMAT

Return ONLY this JSON:

{
  "card_id": "${card.card_id}",
  "verified": true | false,
  "confidence": 0.0-1.0,
  "corrections": [
    {
      "evidence_index": 0,
      "status": "ok" | "corrected" | "missing",
      "corrected_excerpt": null | "The corrected excerpt text...",
      "reason": "Optional explanation"
    }
  ]
}

- If all evidence items are "ok", set verified=true and return empty corrections array
- If any item is "corrected", set verified=true and include the correction
- If any item is "missing", set verified=false`;
}

// =============================================================================
// REBALANCE PROMPT (Adjust difficulty/bloom level)
// =============================================================================

export const REBALANCE_SYSTEM_PROMPT = `You are an expert instructional designer. Your task is to adjust flashcard difficulty or Bloom's taxonomy level while keeping the core concept and evidence intact.

RULES:
- Keep the same underlying concept and topic
- Maintain the SAME evidence references (chunks) - do not change evidence
- Adjust the question phrasing to match target difficulty/Bloom level
- Update the answer if needed to match the new question
- Keep answer ≤40 words and ≤300 characters
- Output strictly as JSON`;

export function buildRebalancePrompt(params: {
    card: Flashcard;
    target_difficulty?: "easy" | "medium" | "hard";
    target_bloom_level?: string;
}): string {
    const { card, target_difficulty, target_bloom_level } = params;

    const cardJson = JSON.stringify(card, null, 2);
    const targetDesc = [];
    if (target_difficulty) targetDesc.push(`difficulty to "${target_difficulty}"`);
    if (target_bloom_level) targetDesc.push(`Bloom level to "${target_bloom_level}"`);

    const difficultyGuidance = `
### DIFFICULTY GUIDANCE

**Easy (Remember/Understand):**
- "What is...?" / "Define..." / "Name the..."
- Direct recall of facts or definitions
- Single concept, straightforward answer

**Medium (Understand/Apply):**
- "Explain how..." / "Describe the relationship..." / "How does X affect Y?"
- Requires understanding context or connections
- May involve applying concept to simple scenario

**Hard (Analyze/Evaluate/Create):**
- "Compare and contrast..." / "Analyze why..." / "What would happen if...?"
- Requires synthesis of multiple concepts
- Critical thinking, evaluation, or hypothetical scenarios`;

    return `## ORIGINAL CARD
\`\`\`json
${cardJson}
\`\`\`

## TARGET ADJUSTMENT
Change ${targetDesc.join(" and ")}

${difficultyGuidance}

## INSTRUCTIONS

1. Rewrite the question (q) to match the target ${target_difficulty ? "difficulty" : "Bloom level"}
2. Adjust the answer (a) if needed (keep ≤40 words, ≤300 chars)
3. Update difficulty and bloom_level fields
4. Keep card_id, evidence, sources, and confidence_score UNCHANGED
5. Update rationale to reflect the adjusted question

## OUTPUT FORMAT

Return ONLY the modified card JSON:

{
  "card_id": "${card.card_id}",
  "q": "Adjusted question?",
  "a": "Adjusted answer.",
  "difficulty": "${target_difficulty || card.difficulty}",
  "bloom_level": "${target_bloom_level || card.bloom_level}",
  "evidence": <KEEP UNCHANGED>,
  "sources": <KEEP UNCHANGED>,
  "confidence_score": ${card.confidence_score},
  "rationale": "Updated rationale for new difficulty.",
  "review_required": false
}`;
}

// =============================================================================
// SUPPLEMENTARY CARD PROMPT (for uncovered topics)
// =============================================================================

export function buildSupplementaryCardPromptComplete(params: {
    module_id: string;
    module_title: string;
    uncovered_topic: string;
    contextChunks: Chunk[];
    existing_questions: string[];
    target_difficulty?: "easy" | "medium" | "hard";
    target_bloom_level?: string;
    card_number: number;
}): string {
    const {
        module_id, module_title, uncovered_topic, contextChunks,
        existing_questions, target_difficulty, target_bloom_level, card_number
    } = params;

    // Filter chunks relevant to the topic
    const relevantChunks = contextChunks.filter(chunk =>
        chunk.text.toLowerCase().includes(uncovered_topic.toLowerCase()) ||
        chunk.heading?.toLowerCase().includes(uncovered_topic.toLowerCase())
    );

    if (relevantChunks.length === 0) {
        return `ERROR: No chunks found relevant to topic "${uncovered_topic}". Cannot generate supplementary card.`;
    }

    const chunksJson = JSON.stringify(relevantChunks, null, 2);
    const existingQJson = JSON.stringify(existing_questions.slice(0, 5), null, 2);

    return `## SUPPLEMENTARY CARD GENERATION

Generate 1 flashcard specifically covering this topic: "${uncovered_topic}"

module_id: "${module_id}"
module_title: "${module_title}"
card_number: ${card_number}
${target_difficulty ? `target_difficulty: "${target_difficulty}"` : ''}
${target_bloom_level ? `target_bloom_level: "${target_bloom_level}"` : ''}

### Relevant ContextChunks:
\`\`\`json
${chunksJson}
\`\`\`

### Existing Questions (avoid duplicates):
\`\`\`json
${existingQJson}
\`\`\`

## REQUIREMENTS

1. Create ONE card focused specifically on "${uncovered_topic}"
2. Use card_id: "M${module_id}_C${card_number}"
3. Do NOT duplicate any existing question
4. Follow all standard card format rules (evidence, sources, etc.)
${target_difficulty ? `5. Set difficulty to "${target_difficulty}"` : ''}
${target_bloom_level ? `6. Set bloom_level to "${target_bloom_level}"` : ''}

## OUTPUT FORMAT

Return ONLY the single card object JSON:

{
  "card_id": "M${module_id}_C${card_number}",
  "q": "Question about ${uncovered_topic}?",
  "a": "Concise answer.",
  "difficulty": "${target_difficulty || 'medium'}",
  "bloom_level": "${target_bloom_level || 'Understand'}",
  "evidence": [...],
  "sources": [...],
  "confidence_score": 0.0-1.0,
  "rationale": "...",
  "review_required": false
}

If the topic cannot be covered with available chunks, return:
{"error": "INSUFFICIENT_CONTENT", "details": "Cannot generate card for topic: ${uncovered_topic}"}`;
}

// =============================================================================
// ERROR RESPONSE FORMAT
// =============================================================================

export const ERROR_RESPONSE_SCHEMA = `
If any rule is violated or an error occurs, return:
{
  "error": "ERROR_TYPE",
  "details": "Human-readable description of what went wrong",
  "stage": "stage_a | stage_b | verification | rebalance"
}

ERROR_TYPES:
- "RULE_VIOLATION": Model violated output format or content rules
- "INSUFFICIENT_CONTENT": Not enough context to generate valid output
- "PARSING_ERROR": Could not parse input correctly
- "GENERATION_FAILED": Model failed to generate valid output
`;
