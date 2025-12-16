# Flashcard Orchestrator System

> **Complete, Production-Ready Prompt Templates & Batch Processing Pipeline**

This document provides all the prompts, schemas, and configuration needed to run the flashcard generation orchestrator as a background worker or batch processing system.

---

## Table of Contents

1. [Orchestrator System Prompt](#orchestrator-system-prompt)
2. [Input/Output Schemas](#inputoutput-schemas)
3. [Stage A Prompt (Summarization)](#stage-a-prompt-summarization)
4. [Stage B Prompt (Flashcard Generation)](#stage-b-prompt-flashcard-generation)
5. [Verification Prompt](#verification-prompt)
6. [Rebalance Prompt](#rebalance-prompt)
7. [Post-Processing Rules](#post-processing-rules)
8. [Triggers & Scheduling](#triggers--scheduling)
9. [Rate Limiting & Retry Policy](#rate-limiting--retry-policy)
10. [Monitoring Metrics](#monitoring-metrics)
11. [Example Payloads](#example-payloads)
12. [API Reference](#api-reference)

---

## Orchestrator System Prompt

```
You are the Flashcard Orchestrator Agent. Your job is to run a reliable, auditable 
pipeline that generates high-quality flashcards for every module across courses. 

For each module you must:

1. Ensure content is present and accessible (presentations, PDFs, videos, recordings, quizzes).

2. Request or retrieve top-K context chunks from the vector DB (K default 8). 
   If fewer than 4 chunks are returned, queue the module for re-indexing/transcription 
   and return status: NEED_MORE_CONTENT.

3. Call Stage A (Module Summarization) using only the retrieved_chunks.

4. Call Stage B (Flashcard Generation) passing Stage A output + ContextChunks.

5. Run Verification for every card. If any evidence excerpt does not exactly match 
   context, attempt automated correction (find closest sentence from chunk). 
   If automated correction fails, flag the card and set review_required=true.

6. Postprocess the cards (dedupe, difficulty/bloom balancing, enforce answer limits).

7. Save deck to DB with metadata (module_id, course_id, model_version, generation_time, 
   verified_rate, warnings).

8. Emit a module-level status object (success/partial/failure) with details and metrics.

9. Respect rate limits and use exponential backoff on API failures; retry up to N 
   times (N=3) before failing the module.

10. Log each major step and record raw model responses for auditing (redact PII).
```

---

## Input/Output Schemas

### Orchestrator Input Schema

```json
{
  "job_id": "string (UUID)",
  "mode": "single_module | course | all_courses",
  "target": {
    "module_id": "string (required if mode == single_module)",
    "course_id": "string (required if mode == single_module or course)"
  },
  "settings": {
    "retrieval_K": 8,
    "target_card_count": 10,
    "model": "gemini-1.5-flash",
    "temperature": 0.1,
    "max_output_tokens": 1500,
    "dedupe_threshold": 0.85,
    "difficulty_distribution": {"easy": 3, "medium": 4, "hard": 3},
    "min_higher_order_bloom": 3,
    "max_retries": 3,
    "concurrency": 4
  },
  "triggered_by": "manual | scheduled | content_update | api",
  "priority": "low | normal | high"
}
```

### Module Result Schema (per module)

```json
{
  "module_id": "string",
  "course_id": "string",
  "module_title": "string",
  "status": "SUCCESS | PARTIAL | FAILED | NEED_MORE_CONTENT | QUEUED | PROCESSING | SKIPPED",
  "generated_count": 10,
  "verified_count": 9,
  "warnings": ["1 card flagged for admin review: insufficient evidence for Q7"],
  "deck_id": "deck_mod-001_v2025-12-11-01",
  "metrics": {
    "time_ms": 95234,
    "api_calls": 6,
    "cost_estimate": 0.28,
    "chunks_retrieved": 8,
    "verification_rate": 0.9
  },
  "logs_url": "https://.../logs/job-uuid-1234/module-mod-001",
  "retry_count": 0,
  "error_message": null,
  "completed_at": "2025-12-11T20:18:16.000Z"
}
```

### Job Result Schema (aggregate)

```json
{
  "job_id": "uuid-1234",
  "status": "completed | completed_with_errors | failed | queued | processing",
  "mode": "course",
  "modules_total": 12,
  "modules_completed": 11,
  "modules_failed": 1,
  "modules_skipped": 0,
  "started_at": "2025-12-11T20:00:00.000Z",
  "completed_at": "2025-12-11T20:18:16.000Z",
  "module_results": [...],
  "aggregate_metrics": {
    "total_time_ms": 1142808,
    "total_api_calls": 72,
    "total_cost_estimate": 3.36,
    "average_verification_rate": 0.92,
    "total_cards_generated": 110,
    "total_cards_verified": 101
  }
}
```

### ContextChunk Object (required shape for all calls)

```json
{
  "chunk_id": "string",
  "source_file": "string",
  "provider": "google_drive | onedrive | local | other",
  "slide_or_page": "null | string (e.g., 'slide 5' or 'p.12')",
  "start_sec": "null | float (for audio/video)",
  "end_sec": "null | float",
  "heading": "null | string",
  "text": "string (cleaned content)",
  "tokens_est": "int"
}
```

---

## Stage A Prompt (Summarization)

### System Prompt

```
You are an expert instructional designer and domain summarizer. 

STRICT RULES:
- Use ONLY the provided ContextChunks
- Do NOT invent or assume any facts
- If information is missing, mark it "MISSING_INFO"
- Output MUST be valid JSON - no markdown, no explanatory prose
- Every claim must reference supporting chunk_ids

Your output must follow the exact JSON structure specified in the instructions.
```

### User Prompt Template

```
## INPUT DATA

module_id: "<module_id>"
module_title: "<module_title>"
course_id: "<course_id>"

### ContextChunks:
```json
[
  {"chunk_id": "c1", "source_file": "...", "text": "..."},
  ...
]
```

### Course Outline Headings (if available):
["Heading 1", "Heading 2", ...]

## INSTRUCTIONS

Read all ContextChunks carefully. Produce EXACTLY this JSON structure:

1. **module_summary**: Array of 6–10 numbered concise bullets
   - Each bullet: { "point": "statement", "supports": ["chunk_id1", "chunk_id2"] }

2. **key_topics**: Array of 6–12 topics
   - Each topic: { "topic": "topic name", "supports": ["chunk_id"] }

3. **coverage_map**: Array showing outline coverage
   - Each item: { "heading": "Heading Title", "status": "Covered" | "Not Covered", "supports": ["chunk_id"] }

## OUTPUT FORMAT

Return ONLY valid JSON:

{
  "module_summary": [...],
  "key_topics": [...],
  "coverage_map": [...]
}
```

### Expected Output

```json
{
  "module_summary": [
    {"point": "Project management applies knowledge and skills to project activities", "supports": ["c1"]},
    {"point": "Five process groups: Initiating, Planning, Executing, Monitoring, Closing", "supports": ["c2"]}
  ],
  "key_topics": [
    {"topic": "Definition of Project Management", "supports": ["c1"]},
    {"topic": "Five Process Groups", "supports": ["c2"]}
  ],
  "coverage_map": [
    {"heading": "Project Basics", "status": "Covered", "supports": ["c1"]},
    {"heading": "Advanced Topics", "status": "Not Covered", "supports": []}
  ]
}
```

---

## Stage B Prompt (Flashcard Generation)

### System Prompt

```
You are an expert exam-writer and instructional designer for higher education.

STRICT RULES:
- Create flashcards using ONLY the provided ContextChunks and Stage A outputs
- Do NOT hallucinate or invent facts
- If an answer cannot be fully supported, include the question but set evidence=[] 
  and add "INSUFFICIENT_INFORMATION" warning
- Every evidence excerpt must be EXACT text copied from chunks
- Output MUST be valid JSON only - no markdown, no explanatory prose
- Each answer must be ≤40 words and ≤300 characters
```

### User Prompt Template

```
## INPUT DATA

module_id: "<module_id>"
module_title: "<module_title>"
course_id: "<course_id>"
target_card_count: 10
difficulty_distribution: easy=3, medium=4, hard=3

### ContextChunks:
```json
[...]
```

### Module Summary (from Stage A):
```json
[...]
```

### Key Topics (from Stage A):
```json
[...]
```

## FEW-SHOT EXAMPLES

### Example 1 (Easy, Remember):
ContextChunk: {"chunk_id": "c1", "source_file": "intro.pptx", "slide_or_page": "slide 2", 
  "text": "Organizational culture is a system of shared assumptions, values, and beliefs..."}

Expected Card:
{
  "card_id": "M1_C1",
  "q": "What is organizational culture?",
  "a": "A system of shared assumptions, values, and beliefs that governs behavior in organizations.",
  "difficulty": "easy",
  "bloom_level": "Remember",
  "evidence": [{"chunk_id": "c1", "source_file": "intro.pptx", "loc": "slide 2", 
    "start_sec": null, "end_sec": null, 
    "excerpt": "Organizational culture is a system of shared assumptions, values, and beliefs..."}],
  "sources": [{"type": "slides", "file": "intro.pptx", "loc": "slide 2"}],
  "confidence_score": 0.98,
  "rationale": "Core definition; fundamental concept for understanding workplace dynamics.",
  "review_required": false
}

### Example 2 (Hard, Analyze):
...

## INSTRUCTIONS

Generate exactly 10 flashcards following the card object structure.

## OUTPUT FORMAT

{
  "module_id": "...",
  "module_title": "...",
  "generated_count": 10,
  "cards": [...],
  "warnings": [],
  "generation_metadata": {
    "model": "gemini-1.5-flash",
    "temperature": 0.1,
    "timestamp": "ISO8601"
  }
}
```

### Card Object Schema

```json
{
  "card_id": "M<module_id>_C<number>",
  "q": "Single clear question",
  "a": "Concise answer ≤40 words, ≤300 chars",
  "difficulty": "easy | medium | hard",
  "bloom_level": "Remember | Understand | Apply | Analyze | Evaluate | Create",
  "evidence": [{
    "chunk_id": "string",
    "source_file": "string",
    "loc": "slide 3 or 00:03:12-00:03:35 or p.5",
    "start_sec": "null | float",
    "end_sec": "null | float",
    "excerpt": "Exact 1-2 sentence text from chunk"
  }],
  "sources": [{
    "type": "video | slides | pdf | quiz | audio",
    "file": "filename",
    "loc": "location"
  }],
  "confidence_score": 0.0-1.0,
  "rationale": "1-2 sentences explaining importance",
  "review_required": false
}
```

---

## Verification Prompt

### System Prompt

```
You are an evidence verifier. Given a card and ContextChunks, verify every 
evidence.excerpt is exact in the chunk.text and supports the answer.

If exact match missing, return corrected_excerpt (the minimal sentence from chunk 
that supports answer) or set verified=false with reason.
```

### User Prompt Template

```
## CARD TO VERIFY
```json
{...card object...}
```

## AVAILABLE CONTEXT CHUNKS
```json
[...chunks...]
```

## VERIFICATION TASK

For each item in the card's "evidence" array:
1. Find the chunk with matching chunk_id
2. Check if evidence.excerpt exists EXACTLY in chunk.text
3. Verify the excerpt supports the card's answer

### Evaluation Criteria:
- **ok**: Excerpt is exact match AND supports answer → confidence 0.9-1.0
- **corrected**: Excerpt not exact but similar text exists → provide corrected_excerpt
- **missing**: No matching or supporting text found → confidence 0.0-0.3

## OUTPUT FORMAT

{
  "card_id": "...",
  "verified": true | false,
  "confidence": 0.0-1.0,
  "corrections": [
    {
      "evidence_index": 0,
      "status": "ok | corrected | missing",
      "corrected_excerpt": null | "...",
      "reason": "Optional explanation"
    }
  ]
}
```

---

## Rebalance Prompt

### System Prompt

```
You are an expert instructional designer. Your task is to adjust flashcard difficulty 
or Bloom's taxonomy level while keeping the core concept and evidence intact.

RULES:
- Keep the same underlying concept and topic
- Maintain the SAME evidence references (chunks) - do not change evidence
- Adjust the question phrasing to match target difficulty/Bloom level
- Update the answer if needed to match the new question
- Keep answer ≤40 words and ≤300 characters
- Output strictly as JSON
```

### Difficulty Guidance

| Level | Question Types | Complexity |
|-------|---------------|------------|
| **Easy** | "What is...?", "Define...", "Name the..." | Direct recall, single concept |
| **Medium** | "Explain how...", "How does X affect Y?" | Understanding, simple application |
| **Hard** | "Compare...", "Analyze why...", "What if...?" | Synthesis, critical thinking |

---

## Post-Processing Rules

Apply these rules in your backend code after Stage B and Verification:

### 1. Answer Length Enforcement
```javascript
if (answer.split(/\s+/).length > 40) {
  answer = answer.split(/\s+/).slice(0, 40).join(" ") + "...";
}
if (answer.length > 300) {
  answer = answer.substring(0, 297) + "...";
}
```

### 2. Deduplication
- Compute similarity for each question pair (Jaccard or cosine)
- If similarity > `dedupe_threshold` (0.85), keep higher-confidence card
- Or re-generate variant for different key_topic/Bloom level

### 3. Coverage Check
- Ensure each Stage A key_topic appears in at least 1 card
- If missing, call Stage B constrained to that topic

### 4. Difficulty Balancing
- Check distribution matches target (e.g., 3 easy, 4 medium, 3 hard)
- If imbalance > 2, trigger rebalance for subset

### 5. Bloom Distribution
- At least 3 cards should be Apply/Analyze/Evaluate/Create
- Flag warning if below threshold

### 6. Flag for Review
- Cards with `verified=false` or `confidence < 0.5` → `review_required=true`
- Include in admin review queue

---

## Triggers & Scheduling

### Automatic Triggers

| Trigger | Action |
|---------|--------|
| Content upload/modify | Queue regenerate for affected module |
| Nightly scheduled | Check all modules; regenerate if stale (>30 days) or has warnings |
| Manual via UI | Create job and return job_id for polling |

### Caching Policy
- Cache generated deck for module
- Re-generate only if:
  - Module content changes (file checksum or drive version)
  - Admin requests manual regeneration
  - Review cards older than 30 days

---

## Rate Limiting & Retry Policy

### Configuration
```javascript
const RETRY_CONFIG = {
  baseDelayMs: 1000,      // Initial delay
  maxDelayMs: 30000,      // Maximum delay cap
  maxRetries: 3           // Attempts before failure
};
```

### Exponential Backoff
```javascript
delay = min(baseDelayMs * 2^attempt, maxDelayMs)
```

### Error Handling
- On 429 or network error → exponential backoff
- On 3rd failure → mark module as FAILED
- Log each retry attempt for auditing

### Concurrency Control
- Default: 4 concurrent modules
- Use token bucket for API rate limiting
- For large content, split Stage A across calls

---

## Monitoring Metrics

Expose these metrics for observability:

| Metric | Description |
|--------|-------------|
| `decks_generated_total` | Total successful deck generations |
| `decks_failed_total` | Total failed generations |
| `decks_partial_total` | Partial success (with warnings) |
| `average_generation_time_ms` | Mean time per deck |
| `average_cards_verified_rate` | Mean verification success rate |
| `cards_flagged_for_review` | Cards pending human review |
| `cost_per_deck_estimate` | Average API cost per deck |
| `jobs_in_queue` | Current queue depth |
| `jobs_processing` | Currently running jobs |
| `last_successful_run` | Timestamp of last success |
| `last_failed_run` | Timestamp of last failure |

---

## Example Payloads

### Batch Request

```bash
POST /api/flashcards/orchestrator/generate-batch
Content-Type: application/json

{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "course",
  "target": {
    "course_id": "mba_hr_101"
  },
  "settings": {
    "retrieval_K": 8,
    "target_card_count": 10,
    "model": "gemini-1.5-flash",
    "temperature": 0.1
  }
}
```

### Quick Response (Queued)

```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "estimated_time_minutes": 10,
    "modules_to_process": 12,
    "position_in_queue": 1
  }
}
```

### Final Result (Stored)

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed_with_errors",
  "mode": "course",
  "modules_total": 12,
  "modules_completed": 11,
  "modules_failed": 1,
  "modules_skipped": 0,
  "aggregate_metrics": {
    "total_time_ms": 1142808,
    "total_api_calls": 72,
    "total_cost_estimate": 3.36,
    "average_verification_rate": 0.92,
    "total_cards_generated": 110,
    "total_cards_verified": 101
  }
}
```

---

## API Reference

### Batch Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flashcards/orchestrator/generate-batch` | Queue batch job |
| GET | `/api/flashcards/orchestrator/jobs/:job_id` | Get job status |
| GET | `/api/flashcards/orchestrator/jobs` | List all jobs |
| POST | `/api/flashcards/orchestrator/jobs/:job_id/cancel` | Cancel job |

### Triggers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flashcards/orchestrator/trigger/content-update` | Trigger on content change |
| POST | `/api/flashcards/orchestrator/trigger/scheduled` | Trigger scheduled refresh |
| POST | `/api/flashcards/orchestrator/trigger/manual` | Manual regeneration |

### Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flashcards/orchestrator/metrics` | Get all metrics |
| GET | `/api/flashcards/orchestrator/health` | Health check |

### Deck Access

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flashcards/orchestrator/decks/:course_id/:module_id` | Get stored deck |

---

## Recovery & Manual Review Flow

### If status is `NEED_MORE_CONTENT`:
1. Create ticket for admin to check missing files/transcripts
2. Re-run ingest/transcription pipeline
3. Trigger regeneration after content is available

### If `review_required` cards > 0:
1. Show in admin review queue
2. Display direct links to source snippets
3. Allow manual edit/approve
4. On approve: set `verified=true`, update deck

---

## Security & Compliance

- **Service Accounts**: Use app-only auth for Drive/OneDrive access
- **Secrets Management**: Store credentials in secure vault (not .env in prod)
- **Signed Links**: Use signed short links for media playback
- **PII Redaction**: Redact sensitive data from transcripts before processing
- **Audit Logging**: Store raw model responses with redaction for compliance

---

## Implementation Checklist

- [ ] Wire orchestrator endpoint to job queue (BullMQ/Redis)
- [ ] Implement worker that processes modules sequentially
- [ ] Integrate vector store for chunk retrieval
- [ ] Call Stage A, Stage B, Verification, Postprocessing
- [ ] Save decks to database
- [ ] Build admin UI for review queue
- [ ] Implement signed link generation for sources
- [ ] Add metrics endpoint for monitoring
- [ ] Set up scheduled job for nightly refresh
- [ ] Run end-to-end tests with real content
