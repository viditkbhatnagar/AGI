# Flashcard Generation Pipeline

A reproducible, two-stage prompt pipeline for generating high-quality educational flashcards with evidence-based answers.

## Overview

This pipeline uses a two-stage approach to maximize quality and reduce hallucination:

1. **Stage A (Summarization)**: Analyzes module content and produces structured summaries with citations
2. **Stage B (Flashcard Generation)**: Creates 10 flashcards with evidence-based answers
3. **Verification**: Validates that each answer is supported by cited excerpts
4. **Post-Processing**: Ensures quality, coverage, and proper distribution

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLASHCARD GENERATION PIPELINE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │ Vector DB   │───▶│   Stage A   │───▶│   Stage B   │───▶│ Verify   │ │
│  │ Retrieval   │    │ Summarize   │    │ Generate    │    │ Evidence │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────┘ │
│                                                                    │     │
│                                                                    ▼     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐ │
│  │   Cache &   │◀───│   Quality   │◀───│      Post-Processing        │ │
│  │   Serve     │    │   Review    │    │  (dedupe, balance, cover)   │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Preconditions

### What your backend must supply to the prompt:

```typescript
interface FlashcardGenerationInput {
  // Required fields
  module_id: string;              // Unique module identifier
  course_id: string;              // Parent course identifier
  module_title: string;           // Human-readable title
  retrieved_chunks: Chunk[];      // Top-K chunks from vector DB (K = 6-12)

  // Optional fields
  module_metadata?: {
    total_duration_sec?: number;
    course_outline_headings?: string[];
    quiz_questions_list?: { id: string; text: string }[];
    existing_quiz_QAs?: { question: string; answer: string }[];
  };
  prompt_settings?: {
    model_temperature?: number;   // 0.0-0.2 recommended
    max_output_tokens?: number;   // 1500 default
    max_context_tokens?: number;  // 8000 default
  };
}

interface Chunk {
  chunk_id: string;               // Unique chunk identifier (e.g., "c123")
  source_file: string;            // e.g., "HR_fundamentals_slides.pptx"
  provider: "google_drive" | "onedrive" | "local" | "cloudinary";
  slide_or_page: string | number | null;  // e.g., "slide 5", "p.12"
  start_sec: number | null;       // For audio/video (seconds)
  end_sec: number | null;         // For audio/video (seconds)
  heading: string | null;         // Nearest heading/topic
  text: string;                   // Cleaned chunk content
  tokens_est: number;             // Estimated token count
}
```

## API Endpoints

### Generate Flashcards

```http
POST /api/flashcards/generate
Content-Type: application/json

{
  "module_id": "mod123",
  "course_id": "course456",
  "module_title": "Introduction to HR Management",
  "retrieved_chunks": [...],
  "module_metadata": {...},
  "prompt_settings": {
    "model_temperature": 0.1
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "module_id": "mod123",
    "module_title": "Introduction to HR Management",
    "cards": [...],
    "stage_a_output": {...},
    "warnings": [],
    "generation_metadata": {...}
  },
  "message": "Generated 10 flashcards for module \"Introduction to HR Management\""
}
```

### Get Module Flashcards

```http
GET /api/modules/:module_id/flashcards?course_id=course456
```

### Get Review Queue

```http
GET /api/flashcards/review-queue
```

### Update Flashcard

```http
PUT /api/flashcards/:card_id
Content-Type: application/json

{
  "q": "Updated question?",
  "a": "Updated answer.",
  "reviewed_by": "admin@example.com"
}
```

### Approve Flashcard

```http
POST /api/flashcards/:card_id/approve
Content-Type: application/json

{
  "reviewed_by": "admin@example.com"
}
```

### Get Module Stats

```http
GET /api/modules/:module_id/flashcards/stats?course_id=course456
```

## Output Schema

### Stage A Output

```json
{
  "module_summary": [
    {"point": "Definition of X and its components", "supports": ["c12", "c34"]}
  ],
  "key_topics": [
    {"topic": "Topic name", "supports": ["c12"]}
  ],
  "coverage_map": [
    {"heading": "Heading Title", "status": "Covered", "supports": ["c12"]}
  ]
}
```

### Stage B Output (Flashcard Deck)

```json
{
  "module_id": "mod123",
  "module_title": "Introduction to HR Management",
  "generated_count": 10,
  "cards": [
    {
      "card_id": "Mmod123_C1",
      "q": "What is organizational culture?",
      "a": "A system of shared assumptions, values, and beliefs that governs behavior in organizations.",
      "difficulty": "easy",
      "bloom_level": "Remember",
      "evidence": [
        {
          "chunk_id": "c1",
          "source_file": "intro_slides.pptx",
          "loc": "slide 2",
          "start_sec": null,
          "end_sec": null,
          "excerpt": "Organizational culture is a system of shared assumptions, values, and beliefs which governs how people behave in organizations."
        }
      ],
      "sources": [
        {"type": "slides", "file": "intro_slides.pptx", "loc": "slide 2"}
      ],
      "confidence_score": 0.98,
      "rationale": "Core definition; basic concept necessary for subsequent topics.",
      "review_required": false
    }
  ],
  "warnings": [],
  "generation_metadata": {
    "model": "gemini-1.5-flash",
    "temperature": 0.1,
    "timestamp": "2024-12-11T20:18:16Z"
  }
}
```

## Configuration

### Pipeline Configuration

```typescript
const config = {
  retrieval_K: 8,                    // Top-K chunks to retrieve
  model_temperature: 0.1,            // Low temperature for factuality
  max_output_tokens: 1500,          
  embedding_similarity_threshold: 0.85,  // Duplicate detection threshold
  evidence_excerpt_min_chars: 20,
  evidence_excerpt_max_chars: 250,
  max_answer_words: 40,
  max_answer_chars: 300,
  target_card_count: 10,
  difficulty_distribution: { easy: 3, medium: 4, hard: 3 },
  min_higher_order_bloom: 3          // Apply/Analyze/Evaluate/Create
};
```

## Quality Rules

### Card Requirements

- **Question**: Single clear sentence
- **Answer**: Max 40 words, ≤300 characters
- **Evidence**: Exact excerpt from source chunk
- **Confidence**: 0.0-1.0 based on evidence support

### Distribution Requirements

| Category | Target |
|----------|--------|
| Difficulty | ~3 easy, ~4 medium, ~3 hard |
| Bloom's Taxonomy | ≥3 higher-order (Apply/Analyze/Evaluate/Create) |
| Topic Coverage | Cover all key topics from Stage A |

### Verification Rules

1. Every excerpt must exist exactly in the cited chunk
2. Every answer must be supported by its evidence
3. Cards with insufficient evidence are flagged for review
4. Duplicate questions are detected and merged

## Edge Cases

### Insufficient Content

If the module doesn't have enough content for 10 distinct flashcards:
- Generate as many as possible with proper evidence
- Set `generated_count` accordingly
- Add warning: "not enough distinct facts to generate 10 cards"

### Missing Transcripts

For video content without transcripts:
- Set `sources: [{file: "...", loc: "no transcript available"}]`
- Set verification to `INSUFFICIENT_INFORMATION`
- Queue transcription job
- Flag deck as incomplete

### Failed Verification

If evidence verification fails for a card:
- Set `review_required: true`
- Set `confidence_score` to 0.0-0.3
- Add to admin review queue

## Integration

### Register Routes

Add to your `server/routes.ts`:

```typescript
import flashcardRoutes, { 
  moduleFlashcardsRoute, 
  moduleFlashcardStatsRoute 
} from "./services/flashcard/flashcardRoutes";

// Register flashcard routes
app.use("/api/flashcards", flashcardRoutes);
app.get(moduleFlashcardsRoute.path, moduleFlashcardsRoute.handler);
app.get(moduleFlashcardStatsRoute.path, moduleFlashcardStatsRoute.handler);
```

### Environment Variables

Required:
```env
GEMINI_API_KEY=your-gemini-api-key
# or
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### Usage Example

```typescript
import { createFlashcardService } from "./services/flashcard";

// Create service
const service = createFlashcardService({
  model_temperature: 0.1,
  target_card_count: 10
});

// Generate flashcards
const deck = await service.generateFlashcardDeck({
  module_id: "mod123",
  course_id: "course456",
  module_title: "Introduction to HR",
  retrieved_chunks: chunksFromVectorDB
});

console.log(`Generated ${deck.cards.length} flashcards`);
```

## File Structure

```
server/services/flashcard/
├── index.ts              # Module exports
├── types.ts              # TypeScript types and Zod schemas
├── prompts.ts            # System and user prompts for all stages
├── flashcardService.ts   # Main orchestration service
├── flashcardController.ts # Express route handlers
├── flashcardRoutes.ts    # Route definitions
└── README.md             # This documentation
```

## Testing

### Sample Request

```bash
curl -X POST http://localhost:5003/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "module_id": "test_mod_1",
    "course_id": "test_course_1", 
    "module_title": "Test Module",
    "retrieved_chunks": [
      {
        "chunk_id": "c1",
        "source_file": "test.pptx",
        "provider": "local",
        "slide_or_page": "slide 1",
        "start_sec": null,
        "end_sec": null,
        "heading": "Introduction",
        "text": "Machine learning is a subset of artificial intelligence that enables systems to learn from data without being explicitly programmed.",
        "tokens_est": 25
      }
    ]
  }'
```

## Tips for Quality

1. **Always use two-stage approach** - Summary first helps reduce hallucination
2. **Force exact evidence excerpts** - Single best way to reduce hallucination
3. **Keep temperature low** - 0.0-0.2 for factual generation
4. **Use few-shot examples** - If model deviates from expected JSON format
5. **Add human-in-loop initially** - Until automated verification is robust
