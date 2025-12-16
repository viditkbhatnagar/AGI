# E2E Pipeline Harness

> Reproducible end-to-end testing for the Flashcard Orchestrator pipeline.

---

## Quick Start

### Run in Mock Mode (No API Keys Required)

```bash
# Run with sample module using local chunks
npx ts-node scripts/e2e/run_e2e_module.ts \
  --module=e2e-test-module \
  --mode=mock \
  --use-local-chunks \
  --verbose

# Output:
# - Report: ./e2e_report.json
# - Deck: server/tmp/decks/e2e-test-module_<timestamp>.json
```

### Run in Real Mode (Requires API Keys)

```bash
# Set environment variables
export GEMINI_API_KEY=your-gemini-key
export OPENAI_API_KEY=your-openai-key  # Alternative
export VECTOR_DB_PROVIDER=qdrant
export QDRANT_URL=http://localhost:6333

# Run with real services
npx ts-node scripts/e2e/run_e2e_module.ts \
  --module=mod-hr-101 \
  --mode=real \
  --verbose
```

---

## Command-Line Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--module=<id>` | Module ID to process | `e2e-test-module` |
| `--course=<id>` | Optional course ID for context | - |
| `--mode=mock\|real` | Execution mode | `mock` |
| `--use-local-chunks` | Skip transcription, use pre-chunked fixtures | `false` |
| `--mock-llm` | Force mock LLM even in real mode | `false` |
| `--mock-embeddings` | Force mock embeddings even in real mode | `false` |
| `--verbose` | Enable verbose logging | `false` |
| `--output=<path>` | Output report path | `./e2e_report.json` |

---

## Pipeline Stages

The harness runs through these stages:

1. **Ingest** - Load module manifest and file references
2. **Transcribe** - Convert audio/video to text segments (mock or WhisperX)
3. **Chunk** - Split segments into context chunks
4. **Embed** - Generate embeddings (mock or Gemini/OpenAI)
5. **Upsert** - Store vectors in vector DB (skipped in mock mode)
6. **StageA** - Summarize content and extract learning objectives
7. **StageB** - Generate flashcards with evidence
8. **Verify** - Validate cards against evidence
9. **Save** - Persist deck to filesystem

---

## Report Structure

```json
{
  "run_id": "uuid",
  "module_id": "e2e-test-module",
  "mode": "mock",
  "started_at": "2024-01-15T10:00:00.000Z",
  "completed_at": "2024-01-15T10:00:05.000Z",
  "duration_ms": 5000,
  "status": "success",
  "stages": {
    "ingest": { "status": "success", "duration_ms": 10 },
    "transcribe": { "status": "skipped", "duration_ms": 0 },
    "chunk": { "status": "success", "duration_ms": 5 },
    "embed": { "status": "success", "duration_ms": 100 },
    "upsert": { "status": "success", "duration_ms": 50 },
    "stageA": { "status": "success", "duration_ms": 200 },
    "stageB": { "status": "success", "duration_ms": 500 },
    "verify": { "status": "success", "duration_ms": 300 },
    "save": { "status": "success", "duration_ms": 10 }
  },
  "deck_path": "server/tmp/decks/e2e-test-module_1705312800000.json",
  "card_count": 10,
  "verified_count": 8,
  "warnings": [],
  "errors": []
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `success` | All stages passed, ≥10 cards generated |
| `partial` | Pipeline completed but <10 cards or some warnings |
| `failed` | Critical stage failed, no deck produced |

---

## Testing the Harness

```bash
# Run E2E validation tests
npm run test:run -- test/e2e/e2e_validation.test.ts

# Run with coverage
npm run test:coverage -- test/e2e/
```

---

## Sample Module Manifest

Location: `test/fixtures/e2e/sample_module_manifest.json`

```json
{
  "module_id": "e2e-test-module",
  "module_title": "Introduction to HR",
  "files": [
    {
      "file_id": "slides-001",
      "name": "slides.pptx",
      "type": "slides",
      "path": "test/fixtures/e2e/sample_slides.pptx",
      "provider": "local"
    }
  ],
  "chunks": [
    {
      "chunk_id": "chunk_0",
      "text": "Content for chunk...",
      "source_file": "slides.pptx"
    }
  ]
}
```

---

## Docker Compose for Local Services

```bash
# Start Redis and Qdrant for real mode testing
docker compose -f docker-compose.dev.yml up -d redis qdrant

# Run harness with real vector DB
npx ts-node scripts/e2e/run_e2e_module.ts \
  --mode=real \
  --mock-llm \
  --verbose
```

---

## Troubleshooting

### "Manifest not found"

```bash
# Ensure fixture exists
cat test/fixtures/e2e/sample_module_manifest.json
```

### "No chunks available"

- Use `--use-local-chunks` flag for mock mode
- Or provide `chunks` array in manifest

### "LLM credentials missing"

```bash
# Set API key
export GEMINI_API_KEY=your-key

# Or use mock mode
--mode=mock
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success or partial success |
| 1 | Failed - check report for errors |

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      
      - name: Run E2E in mock mode
        run: |
          npx ts-node scripts/e2e/run_e2e_module.ts \
            --module=e2e-test-module \
            --mode=mock \
            --use-local-chunks \
            --output=./e2e_report.json
      
      - name: Validate E2E report
        run: |
          npm run test:run -- test/e2e/e2e_validation.test.ts
      
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report
          path: ./e2e_report.json
```

---

## Next Steps

1. Add more fixture modules for different domains
2. Implement real transcription testing with sample audio files
3. Add performance benchmarks to CI
4. Create Grafana dashboard for E2E metrics
