/**
 * Flashcard Orchestrator - Few-Shot Examples
 * 
 * Production few-shot examples for Stage A and Stage B prompts.
 * HR domain examples: Organizational Culture and Recruitment.
 */

import type { StageAOutput, StageBOutput, ContextChunk } from "./schemas";

// =============================================================================
// STAGE A FEW-SHOT EXAMPLES (Module Summarization)
// =============================================================================

/**
 * Example context chunks for Stage A demonstration
 */
export const STAGE_A_EXAMPLE_CHUNKS: ContextChunk[] = [
    {
        chunk_id: "c1",
        source_file: "organizational_culture.pptx",
        provider: "google_drive",
        slide_or_page: "slide 2",
        text: "Organizational culture is a system of shared assumptions, values, and beliefs that governs how people behave in organizations. These shared values have a strong influence on the people in the organization and dictate how they dress, act, and perform their jobs. Every organization develops and maintains a unique culture, which provides guidelines and boundaries for the behavior of the members of the organization.",
        tokens_est: 75,
    },
    {
        chunk_id: "c2",
        source_file: "organizational_culture.pptx",
        provider: "google_drive",
        slide_or_page: "slide 5",
        text: "Edgar Schein proposed three levels of organizational culture: Artifacts are the visible elements such as dress code, office layout, and rituals. Espoused Values are the stated values and rules of behavior. Basic Assumptions are deeply embedded, taken-for-granted behaviors which are usually unconscious. Understanding all three levels is essential for cultural change initiatives.",
        tokens_est: 68,
    },
    {
        chunk_id: "c3",
        source_file: "recruitment_process.pdf",
        provider: "google_drive",
        slide_or_page: "p.12",
        text: "The recruitment process consists of five key stages: job analysis, sourcing candidates, screening applications, interviewing, and selection. Effective recruitment ensures organizational fit while maintaining diversity and avoiding bias. Modern recruitment increasingly relies on applicant tracking systems (ATS) and structured interview formats to improve consistency and legal compliance.",
        tokens_est: 65,
    },
];

/**
 * Expected Stage A output for the example chunks
 */
export const STAGE_A_EXAMPLE_OUTPUT: StageAOutput = {
    module_summary: [
        {
            point: "Organizational culture comprises shared assumptions, values, and beliefs that govern workplace behavior and establish guidelines for members.",
            supports: ["c1"],
        },
        {
            point: "Edgar Schein's model identifies three cultural levels: Artifacts (visible elements), Espoused Values (stated rules), and Basic Assumptions (unconscious behaviors).",
            supports: ["c2"],
        },
        {
            point: "Understanding all three cultural levels is essential for successful organizational change initiatives.",
            supports: ["c2"],
        },
        {
            point: "The recruitment process follows five stages: job analysis, sourcing, screening, interviewing, and selection.",
            supports: ["c3"],
        },
        {
            point: "Effective recruitment balances organizational fit with diversity while avoiding bias through structured processes.",
            supports: ["c3"],
        },
        {
            point: "Modern HR practices utilize Applicant Tracking Systems and structured interviews for consistency and compliance.",
            supports: ["c3"],
        },
    ],
    key_topics: [
        { topic: "Organizational Culture Definition", supports: ["c1"] },
        { topic: "Schein's Three Levels of Culture", supports: ["c2"] },
        { topic: "Artifacts and Visible Culture", supports: ["c2"] },
        { topic: "Espoused Values", supports: ["c2"] },
        { topic: "Basic Assumptions", supports: ["c2"] },
        { topic: "Recruitment Process Stages", supports: ["c3"] },
        { topic: "Diversity in Recruitment", supports: ["c3"] },
        { topic: "Applicant Tracking Systems", supports: ["c3"] },
    ],
    coverage_map: [
        { heading: "Culture Fundamentals", status: "Covered", supports: ["c1", "c2"] },
        { heading: "Recruitment Basics", status: "Covered", supports: ["c3"] },
        { heading: "Performance Management", status: "Not Covered", supports: [] },
    ],
};

// =============================================================================
// STAGE B FEW-SHOT EXAMPLES (Flashcard Generation)
// =============================================================================

/**
 * Example Stage B output demonstrating proper card format
 */
export const STAGE_B_EXAMPLE_OUTPUT: StageBOutput = {
    module_id: "mod-hr-101",
    module_title: "Introduction to HR Management",
    generated_count: 3,
    cards: [
        {
            card_id: "Mmod-hr-101_C1",
            q: "What is organizational culture?",
            a: "A system of shared assumptions, values, and beliefs that governs how people behave in organizations and provides guidelines for member behavior.",
            difficulty: "easy",
            bloom_level: "Remember",
            evidence: [
                {
                    chunk_id: "c1",
                    source_file: "organizational_culture.pptx",
                    loc: "slide 2",
                    start_sec: null,
                    end_sec: null,
                    excerpt: "Organizational culture is a system of shared assumptions, values, and beliefs that governs how people behave in organizations.",
                },
            ],
            sources: [
                { type: "slides", file: "organizational_culture.pptx", loc: "slide 2" },
            ],
            confidence_score: 0.98,
            rationale: "Core definition essential for understanding workplace dynamics and HR strategy.",
            review_required: false,
        },
        {
            card_id: "Mmod-hr-101_C2",
            q: "According to Edgar Schein's model, what are the three levels of organizational culture?",
            a: "Artifacts (visible elements like dress code), Espoused Values (stated rules of behavior), and Basic Assumptions (unconscious, taken-for-granted behaviors).",
            difficulty: "medium",
            bloom_level: "Understand",
            evidence: [
                {
                    chunk_id: "c2",
                    source_file: "organizational_culture.pptx",
                    loc: "slide 5",
                    start_sec: null,
                    end_sec: null,
                    excerpt: "Edgar Schein proposed three levels of organizational culture: Artifacts are the visible elements such as dress code, office layout, and rituals.",
                },
            ],
            sources: [
                { type: "slides", file: "organizational_culture.pptx", loc: "slide 5" },
            ],
            confidence_score: 0.95,
            rationale: "Schein's framework is foundational for cultural analysis and organizational change.",
            review_required: false,
        },
        {
            card_id: "Mmod-hr-101_C3",
            q: "What are the five key stages of the recruitment process?",
            a: "Job analysis, sourcing candidates, screening applications, interviewing, and selection.",
            difficulty: "easy",
            bloom_level: "Remember",
            evidence: [
                {
                    chunk_id: "c3",
                    source_file: "recruitment_process.pdf",
                    loc: "p.12",
                    start_sec: null,
                    end_sec: null,
                    excerpt: "The recruitment process consists of five key stages: job analysis, sourcing candidates, screening applications, interviewing, and selection.",
                },
            ],
            sources: [
                { type: "pdf", file: "recruitment_process.pdf", loc: "p.12" },
            ],
            confidence_score: 0.97,
            rationale: "Understanding recruitment stages is fundamental for HR practitioners.",
            review_required: false,
        },
    ],
    warnings: [],
    generation_metadata: {
        model: "gemini-1.5-flash",
        temperature: 0.1,
        timestamp: "2025-12-12T00:00:00.000Z",
        tokens_used: 850,
    },
};

// =============================================================================
// FORMATTED FEW-SHOT STRINGS FOR PROMPTS
// =============================================================================

/**
 * Format chunks as context string for LLM
 */
export function formatChunksForPrompt(chunks: ContextChunk[]): string {
    return chunks.map(chunk => {
        let header = `<chunk id="${chunk.chunk_id}" source="${chunk.source_file}"`;
        if (chunk.slide_or_page) {
            header += ` loc="${chunk.slide_or_page}"`;
        }
        if (chunk.start_sec !== null && chunk.start_sec !== undefined) {
            header += ` start_sec="${chunk.start_sec}"`;
        }
        if (chunk.end_sec !== null && chunk.end_sec !== undefined) {
            header += ` end_sec="${chunk.end_sec}"`;
        }
        header += ">";
        return `${header}\n${chunk.text}\n</chunk>`;
    }).join("\n\n");
}

/**
 * Stage A few-shot example formatted for prompt
 */
export const STAGE_A_FEW_SHOT_TEXT = `
## FEW-SHOT EXAMPLE

### Input ContextChunks:
${formatChunksForPrompt(STAGE_A_EXAMPLE_CHUNKS)}

### Expected Output:
\`\`\`json
${JSON.stringify(STAGE_A_EXAMPLE_OUTPUT, null, 2)}
\`\`\`
`;

/**
 * Stage B few-shot example formatted for prompt
 */
export const STAGE_B_FEW_SHOT_TEXT = `
## FEW-SHOT EXAMPLE

### Given the Stage A summary and context chunks above, generate flashcards:

### Example Card 1 (Easy, Remember):
ContextChunk excerpt: "Organizational culture is a system of shared assumptions, values, and beliefs that governs how people behave in organizations."

Card output:
\`\`\`json
{
  "card_id": "Mmod-hr-101_C1",
  "q": "What is organizational culture?",
  "a": "A system of shared assumptions, values, and beliefs that governs how people behave in organizations and provides guidelines for member behavior.",
  "difficulty": "easy",
  "bloom_level": "Remember",
  "evidence": [{
    "chunk_id": "c1",
    "source_file": "organizational_culture.pptx",
    "loc": "slide 2",
    "start_sec": null,
    "end_sec": null,
    "excerpt": "Organizational culture is a system of shared assumptions, values, and beliefs that governs how people behave in organizations."
  }],
  "sources": [{"type": "slides", "file": "organizational_culture.pptx", "loc": "slide 2"}],
  "confidence_score": 0.98,
  "rationale": "Core definition essential for understanding workplace dynamics.",
  "review_required": false
}
\`\`\`

### Example Card 2 (Medium, Understand):
\`\`\`json
{
  "card_id": "Mmod-hr-101_C2",
  "q": "According to Edgar Schein's model, what are the three levels of organizational culture?",
  "a": "Artifacts (visible elements), Espoused Values (stated rules), and Basic Assumptions (unconscious behaviors).",
  "difficulty": "medium",
  "bloom_level": "Understand",
  "evidence": [{
    "chunk_id": "c2",
    "source_file": "organizational_culture.pptx",
    "loc": "slide 5",
    "start_sec": null,
    "end_sec": null,
    "excerpt": "Edgar Schein proposed three levels of organizational culture: Artifacts are the visible elements such as dress code, office layout, and rituals."
  }],
  "sources": [{"type": "slides", "file": "organizational_culture.pptx", "loc": "slide 5"}],
  "confidence_score": 0.95,
  "rationale": "Schein's framework is foundational for cultural analysis.",
  "review_required": false
}
\`\`\`
`;

// =============================================================================
// SYSTEM PROMPT TEMPLATES
// =============================================================================

export const STAGE_A_SYSTEM_PROMPT = `You are an expert instructional designer and domain summarizer.

STRICT RULES:
- Use ONLY the provided ContextChunks as your source of truth
- Do NOT invent, assume, or hallucinate any facts not in the chunks
- If information is genuinely missing, acknowledge gaps honestly
- Every claim must reference supporting chunk_ids
- Output MUST be valid JSON only - no markdown, no explanatory prose before/after

OUTPUT REQUIREMENTS:
1. module_summary: Array of 6-10 numbered concise bullets
   - Each bullet: { "point": "statement", "supports": ["chunk_id1", "chunk_id2"] }
   
2. key_topics: Array of 6-12 topics
   - Each topic: { "topic": "topic name", "supports": ["chunk_id"] }

3. coverage_map: Array showing outline coverage (if outline provided)
   - Each item: { "heading": "Title", "status": "Covered" | "Not Covered" | "Partially Covered", "supports": ["chunk_id"] }

${STAGE_A_FEW_SHOT_TEXT}`;

export const STAGE_B_SYSTEM_PROMPT = `You are an expert exam writer and instructional designer for higher education.

STRICT RULES:
- Create flashcards using ONLY the provided ContextChunks and Stage A summary
- Do NOT hallucinate or invent facts not present in the source material
- Every evidence.excerpt must be EXACT text copied from chunks (verbatim)
- Each answer must be ≤40 words and ≤300 characters
- If an answer cannot be fully supported, add "INSUFFICIENT_INFORMATION" to warnings and set confidence_score < 0.5
- Output MUST be valid JSON only - no markdown, no explanatory prose

CARD REQUIREMENTS:
- card_id format: M<module_id>_C<number>
- Balanced difficulty: Easy (Remember/Understand), Medium (Apply/Analyze), Hard (Evaluate/Create)
- Each card needs at least 1 evidence item with exact excerpt
- confidence_score: 0.9+ for fully supported, 0.5-0.9 for partial, <0.5 if uncertain
- review_required: true if confidence < 0.7 or evidence issues

${STAGE_B_FEW_SHOT_TEXT}`;

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

/**
 * Build complete Stage A user prompt
 */
export function buildStageAPrompt(params: {
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: ContextChunk[];
    outlineHeadings?: string[];
}): string {
    const chunksText = formatChunksForPrompt(params.contextChunks);
    const outlineSection = params.outlineHeadings?.length
        ? `\n### Course Outline Headings:\n${params.outlineHeadings.map(h => `- ${h}`).join("\n")}`
        : "";

    return `## MODULE INFORMATION
module_id: "${params.module_id}"
module_title: "${params.module_title}"
course_id: "${params.course_id}"
${outlineSection}

## CONTEXT CHUNKS (Source Material)
${chunksText}

## TASK
Analyze the ContextChunks above and produce the JSON output with module_summary, key_topics, and coverage_map.

Return ONLY valid JSON matching this structure:
{
  "module_summary": [{"point": "...", "supports": ["chunk_id"]}],
  "key_topics": [{"topic": "...", "supports": ["chunk_id"]}],
  "coverage_map": [{"heading": "...", "status": "Covered|Not Covered|Partially Covered", "supports": ["chunk_id"]}]
}`;
}

/**
 * Build complete Stage B user prompt
 */
export function buildStageBPrompt(params: {
    module_id: string;
    module_title: string;
    course_id: string;
    contextChunks: ContextChunk[];
    stageAOutput: StageAOutput;
    targetCardCount?: number;
    difficultyDistribution?: { easy: number; medium: number; hard: number };
}): string {
    const chunksText = formatChunksForPrompt(params.contextChunks);
    const targetCards = params.targetCardCount || 10;
    const dist = params.difficultyDistribution || { easy: 3, medium: 4, hard: 3 };

    return `## MODULE INFORMATION
module_id: "${params.module_id}"
module_title: "${params.module_title}"
course_id: "${params.course_id}"
target_card_count: ${targetCards}
difficulty_distribution: easy=${dist.easy}, medium=${dist.medium}, hard=${dist.hard}

## STAGE A SUMMARY (Use as guidance for topics)
${JSON.stringify(params.stageAOutput, null, 2)}

## CONTEXT CHUNKS (Source Material - use for evidence excerpts)
${chunksText}

## TASK
Generate exactly ${targetCards} flashcards following the card schema.
Each card must have:
- Unique card_id in format M${params.module_id}_C1, M${params.module_id}_C2, etc.
- Question and concise answer (max 40 words)
- At least 1 evidence item with EXACT excerpt from chunks
- Appropriate difficulty and Bloom level

Return ONLY valid JSON:
{
  "module_id": "${params.module_id}",
  "module_title": "${params.module_title}",
  "generated_count": ${targetCards},
  "cards": [...],
  "warnings": [],
  "generation_metadata": {
    "model": "...",
    "temperature": 0.1,
    "timestamp": "ISO8601",
    "tokens_used": 0
  }
}`;
}
