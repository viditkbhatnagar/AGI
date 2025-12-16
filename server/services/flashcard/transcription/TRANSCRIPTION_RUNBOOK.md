# Transcription Worker Runbook

> Production-grade transcription pipeline for converting audio/video to timestamped ContextChunks.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running Locally](#running-locally)
5. [Docker Deployment](#docker-deployment)
6. [Testing](#testing)
7. [One-off Transcription](#one-off-transcription)
8. [Troubleshooting](#troubleshooting)
9. [CI Configuration](#ci-configuration)

---

## Overview

The transcription pipeline:

1. **Downloads** media files (Google Drive, OneDrive, local)
2. **Transcribes** using WhisperX (local) or Google Speech-to-Text (cloud)
3. **Chunks** into ContextChunks with timestamps
4. **Redacts** PII (emails, phone numbers, SSNs)
5. **Indexes** via embedText + upsertChunks into vector DB

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Transcription Worker                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌───────────────┐    ┌──────────────┐  │
│  │ BullMQ Job  │ ──▶ │ transcribeAnd │ ──▶│ chunkTranscr │  │
│  │   Queue     │     │ Chunk()       │    │ ipt()        │  │
│  └─────────────┘     └───────────────┘    └──────────────┘  │
│                              │                     │         │
│                              ▼                     ▼         │
│                    ┌─────────────────┐    ┌──────────────┐  │
│                    │ WhisperX / GSTT │    │ ContextChunk │  │
│                    │ Runner          │    │ Array        │  │
│                    └─────────────────┘    └──────────────┘  │
│                                                    │         │
│                                                    ▼         │
│                                           ┌──────────────┐  │
│                                           │ upsertChunks │  │
│                                           │ (Vector DB)  │  │
│                                           └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

```bash
# Node.js 18+
node --version  # Should be >= 18

# Install project dependencies
npm install

# Install whisper (choose one):
```

### Option 1: WhisperX (Recommended)

```bash
# With pip
pip install whisperx

# With conda
conda install -c conda-forge whisperx

# Verify
whisperx --help
```

### Option 2: OpenAI Whisper

```bash
pip install openai-whisper

# Verify
whisper --help
```

### Option 3: Whisper.cpp (Fastest)

```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# Download model
bash models/download-ggml-model.sh base

# Verify
./main --help
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRANSCRIBE_PROVIDER` | No | `whisper` | `whisper`, `google_stt`, or `mock` |
| `WHISPER_BINARY_PATH` | No | `whisper` | Path to whisper binary |
| `WHISPER_MODEL` | No | `base` | Model: tiny, base, small, medium, large |
| `WHISPER_LANGUAGE` | No | `en` | Language code |
| `WHISPER_MAX_CHUNK_SECONDS` | No | `90` | Max seconds per chunk |
| `CHUNK_TOKENS` | No | `800` | Max tokens per chunk |
| `TRANSCRIPTION_TMP_DIR` | No | `./server/tmp/transcripts` | Temp directory |
| `JOB_RETRY_ATTEMPTS` | No | `3` | Max retries on failure |
| `JOB_RETRY_BACKOFF_MS` | No | `2000` | Retry backoff |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis for BullMQ |

### Google STT Configuration

```bash
# Required for Google STT
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GCS_BUCKET=your-gcs-bucket-name
export TRANSCRIBE_PROVIDER=google_stt
```

---

## Running Locally

### 1. Start Redis

```bash
docker compose -f docker-compose.redis.yml up -d
```

### 2. Start the Worker

```bash
# With whisper installed locally
TRANSCRIBE_PROVIDER=whisper \
WHISPER_BINARY_PATH=/usr/local/bin/whisperx \
WHISPER_MODEL=base \
npx tsx server/services/flashcard/workers/transcriptionWorker.ts
```

### 3. Enqueue a Test Job

```bash
# Via API
curl -X POST http://localhost:5000/api/flashcards/orchestrator/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "module_id": "mod-test-001",
    "files": [{
      "file_id": "file-001",
      "provider": "local",
      "path": "/path/to/audio.mp3"
    }]
  }'
```

---

## Docker Deployment

### GPU-enabled WhisperX

```bash
# Start whisperx container
docker compose -f docker-compose.transcriber.yml up -d whisperx

# Exec into container for transcription
docker exec flashcard-whisperx whisperx \
  /input/audio.mp3 \
  --model base \
  --language en \
  --output_dir /output \
  --output_format json
```

### CPU-only WhisperX

```bash
docker compose -f docker-compose.transcriber.yml --profile cpu up -d whisperx-cpu
```

### Production Deployment

```yaml
# Add to your main docker-compose.yml
services:
  transcription-worker:
    build: .
    command: npx tsx server/services/flashcard/workers/transcriptionWorker.ts
    environment:
      - REDIS_URL=redis://redis:6379
      - TRANSCRIBE_PROVIDER=whisper
      - WHISPER_BINARY_PATH=/usr/local/bin/whisper
    volumes:
      - ./server/tmp:/app/server/tmp
    depends_on:
      - redis
      - whisperx
```

---

## Testing

### Unit Tests

```bash
# Chunker tests
npm run test:run -- test/transcription/chunker.unit.test.ts

# WhisperX runner tests (mocked)
npm run test:run -- test/transcription/whisperxRunner.unit.test.ts
```

### Integration Tests

```bash
# Full pipeline test with mock whisper
TRANSCRIBE_PROVIDER=mock \
npm run test:run -- test/transcription/transcribeAndChunk.integration.test.ts
```

### All Transcription Tests

```bash
npm run test:run -- test/transcription/
```

---

## One-off Transcription

### CLI Usage

```bash
# Process a single file
TRANSCRIBE_PROVIDER=whisper \
npx tsx server/services/flashcard/workers/transcriptionWorker.ts \
  --run-one \
  --file /path/to/audio.mp3 \
  --module mod-hr-101 \
  --file-id gdrive-123

# Using mock (for testing)
TRANSCRIBE_PROVIDER=mock \
npx tsx server/services/flashcard/workers/transcriptionWorker.ts \
  --run-one \
  --file test/fixtures/short_sample.wav \
  --module mod-test \
  --file-id test-file
```

### Programmatic Usage

```typescript
import { transcribeAndChunk } from './server/services/flashcard/transcription';

const result = await transcribeAndChunk({
  filePath: '/path/to/audio.mp3',
  file_id: 'gdrive-123',
  file_name: 'lecture.mp3',
  provider: 'google_drive',
  module_id: 'mod-hr-101',
});

console.log(`Created ${result.chunks.length} chunks`);
console.log(`Duration: ${result.duration}s`);
```

---

## Troubleshooting

### "Whisper binary not found"

```bash
# Check whisper is installed
which whisper  # or whisperx

# Set path explicitly
export WHISPER_BINARY_PATH=/path/to/whisper
```

### "Model not found"

```bash
# Download model (OpenAI whisper downloads automatically)
whisper --model base --help

# For whisper.cpp
cd whisper.cpp
bash models/download-ggml-model.sh base
```

### "Google STT permission denied"

1. Check credentials file exists:
   ```bash
   ls $GOOGLE_APPLICATION_CREDENTIALS
   ```

2. Verify Speech-to-Text API is enabled in Google Cloud Console

3. Check service account has Speech-to-Text permissions

### Slow Transcription

- Use smaller model: `WHISPER_MODEL=base` instead of `large`
- Enable GPU if available
- For long files (>1 hour), consider splitting first

### Out of Memory

- Reduce model size
- Increase container memory limit
- Use streaming for long files

---

## CI Configuration

### GitHub Actions

```yaml
name: Test Transcription

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run transcription unit tests
        run: npm run test:run -- test/transcription/

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run integration tests with mock
        run: |
          TRANSCRIBE_PROVIDER=mock \
          npm run test:run -- test/transcription/transcribeAndChunk.integration.test.ts
```

---

## Metrics & Observability

### Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `transcription_jobs_processed_total` | Counter | Total jobs processed |
| `transcription_jobs_failed_total` | Counter | Total jobs failed |
| `transcription_job_duration_seconds` | Histogram | Job duration |
| `transcription_chunks_indexed_total` | Counter | Chunks indexed |

### Logging

All logs include:
- `jobId`
- `module_id`
- `file_id`
- `worker hostname`

Raw transcripts are saved to `server/tmp/logs/` with job ID prefix.

---

## Security Notes

1. **PII Redaction**: Enabled by default. Set `redactPii: false` to disable.

2. **Raw Transcripts**: Stored in `server/tmp/logs/`. Restrict access in production.

3. **API Keys**: Never commit credentials. Use environment variables.

4. **S3 Storage**: For production, configure presigned URLs for raw output storage.
