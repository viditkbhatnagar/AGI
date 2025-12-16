# Vector Database & Embeddings Module

> Production-ready embeddings and vector storage for the Flashcard Orchestrator RAG pipeline.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Quick Start](#quick-start)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Metrics & Observability](#metrics--observability)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This module provides:

- **Embeddings**: Generate text embeddings using Gemini, OpenAI, or a local service
- **Vector Storage**: Store and retrieve vectors using Pinecone or Qdrant
- **Batching**: Automatic batching for optimal API throughput
- **Idempotency**: Consistent vector IDs ensure safe re-upserts
- **Retries**: Exponential backoff for transient failures

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Transcription Worker / Orchestrator              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          upsertChunks()                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ Validate Chunks │ ──▶│ embedText()     │ ──▶│ Vector DB       │  │
│  │                 │    │ (if needed)     │    │ Upsert          │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌───────────────────────┐               ┌───────────────────────┐
│   Embedding Provider  │               │   Vector Database     │
├───────────────────────┤               ├───────────────────────┤
│ • Gemini (default)    │               │ • Pinecone (default)  │
│ • OpenAI              │               │ • Qdrant              │
│ • Local HTTP service  │               │                       │
└───────────────────────┘               └───────────────────────┘
```

---

## Configuration

### Environment Variables

#### Embedding Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | No | `gemini` | Provider: `gemini`, `openai`, `local` |
| `GEMINI_API_KEY` | If gemini | - | Gemini API key |
| `OPENAI_API_KEY` | If openai | - | OpenAI API key |
| `EMBEDDINGS_LOCAL_URL` | If local | - | Local service URL |
| `EMBEDDING_BATCH_SIZE` | No | `64` | Texts per API call |
| `EMBEDDING_RETRY_ATTEMPTS` | No | `3` | Max retries |
| `EMBEDDING_DIMENSION` | No | `768` | Vector dimension |

#### Vector Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VECTOR_DB_PROVIDER` | No | `pinecone` | Provider: `pinecone`, `qdrant` |
| `PINECONE_API_KEY` | If pinecone | - | Pinecone API key |
| `PINECONE_INDEX` | No | `flashcard-chunks` | Pinecone index name |
| `QDRANT_URL` | If qdrant | `http://localhost:6333` | Qdrant server URL |
| `QDRANT_API_KEY` | If cloud | - | Qdrant Cloud API key |
| `QDRANT_COLLECTION` | No | `flashcard-chunks` | Qdrant collection name |
| `VECTOR_UPSERT_BATCH_SIZE` | No | `100` | Vectors per upsert |

### Example `.env` File

```bash
# Embeddings
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
EMBEDDING_BATCH_SIZE=64

# Vector DB (Pinecone)
VECTOR_DB_PROVIDER=pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=flashcard-chunks

# Or Vector DB (Qdrant)
# VECTOR_DB_PROVIDER=qdrant
# QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY=optional-for-cloud
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Vector Database

#### Option A: Qdrant (Local)

```bash
# Start Qdrant with Docker
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Set env vars
export VECTOR_DB_PROVIDER=qdrant
export QDRANT_URL=http://localhost:6333
```

#### Option B: Pinecone (Cloud)

1. Create account at https://www.pinecone.io
2. Create an index with dimension matching your embedding model:
   - Gemini: 768 dimensions
   - OpenAI text-embedding-3-small: 1536 dimensions
3. Set environment variables

### 3. Run Tests

```bash
# Unit tests
npm run test:run -- test/embeddings/embeddingsClient.unit.test.ts
npm run test:run -- test/vectorDb/pineconeClient.unit.test.ts

# Integration tests
npm run test:run -- test/vectorDb/upsertHelper.integration.test.ts
```

---

## Usage Examples

### Upsert Chunks (from Transcription Worker)

```typescript
import { upsertChunks } from './server/services/flashcard/vectorDb';

// Chunks from transcription pipeline
const chunks = [
  {
    chunk_id: 'mod-hr-101::file-001::chunk_0-5000',
    source_file: 'lecture.mp4',
    provider: 'google_drive',
    slide_or_page: '00:00:00-00:00:05',
    start_sec: 0,
    end_sec: 5,
    heading: 'Introduction',
    text: 'Welcome to today\'s lecture on organizational culture.',
    tokens_est: 10,
  },
];

await upsertChunks({
  chunks,
  module_id: 'mod-hr-101',
});
```

### Query Chunks (for RAG)

```typescript
import { queryChunksFromPinecone } from './server/services/flashcard/vectorDb';

const { matches } = await queryChunksFromPinecone({
  module_id: 'mod-hr-101',
  queryText: 'What is organizational culture?',
  topK: 5,
});

for (const match of matches) {
  console.log(`Score: ${match.score}`);
  console.log(`Text: ${match.metadata.text}`);
  console.log(`Source: ${match.metadata.source_file}`);
}
```

### Generate Embeddings Directly

```typescript
import { embedTexts } from './server/services/flashcard/embeddings/embeddingsClient';

const texts = [
  'What is talent acquisition?',
  'Define organizational culture.',
];

const embeddings = await embedTexts(texts, {
  provider: 'gemini', // or 'openai', 'local'
});

console.log(`Generated ${embeddings.length} embeddings`);
console.log(`Dimension: ${embeddings[0].length}`);
```

---

## Testing

### Unit Tests

```bash
# Embeddings client
npm run test:run -- test/embeddings/embeddingsClient.unit.test.ts

# Pinecone client
npm run test:run -- test/vectorDb/pineconeClient.unit.test.ts

# All vector DB tests
npm run test:run -- test/vectorDb/
```

### Integration Tests

```bash
# With mocked dependencies
npm run test:run -- test/vectorDb/upsertHelper.integration.test.ts

# With real Qdrant (start container first)
docker run -p 6333:6333 qdrant/qdrant
VECTOR_DB_PROVIDER=qdrant npm run test:run -- test/vectorDb/
```

### CI Configuration

```yaml
name: Vector DB Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      qdrant:
        image: qdrant/qdrant
        ports:
          - 6333:6333
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run unit tests
        run: npm run test:run -- test/vectorDb/ test/embeddings/
      - name: Run integration tests
        run: |
          VECTOR_DB_PROVIDER=qdrant \
          QDRANT_URL=http://localhost:6333 \
          npm run test:run -- test/vectorDb/upsertHelper.integration.test.ts
```

---

## Metrics & Observability

### Prometheus Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `flashcard_embedding_calls_total` | Counter | provider, status | Total embedding API calls |
| `flashcard_embedding_latency_seconds` | Histogram | provider | Embedding latency |
| `flashcard_embedding_tokens_total` | Counter | provider | Tokens processed |
| `flashcard_pinecone_upserts_total` | Counter | status | Pinecone upserts |
| `flashcard_pinecone_upsert_latency_seconds` | Histogram | - | Upsert latency |
| `flashcard_pinecone_queries_total` | Counter | status | Pinecone queries |
| `flashcard_pinecone_query_latency_seconds` | Histogram | - | Query latency |
| `flashcard_qdrant_upserts_total` | Counter | status | Qdrant upserts |
| `flashcard_qdrant_queries_total` | Counter | status | Qdrant queries |

### Scraping Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'flashcard-api'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
```

### Logging

All operations include:
- `module_id`: For module-level filtering
- `jobId`: For request tracing
- `chunk_count`: Number of chunks processed
- `duration`: Operation timing

Example log output:
```
[Embeddings] Embedding 50 texts with gemini/embedding-001
[Embeddings] Processing batch 1/1 (50 texts)
[Pinecone] Upserting 50 chunks for module mod-hr-101
[Pinecone] Upserted 50 vectors in 1.23s
```

---

## Deployment

### Docker Compose (with Qdrant)

```yaml
version: '3.9'

services:
  api:
    build: .
    environment:
      - VECTOR_DB_PROVIDER=qdrant
      - QDRANT_URL=http://qdrant:6333
      - EMBEDDING_PROVIDER=gemini
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - qdrant
  
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_storage:/qdrant/storage

volumes:
  qdrant_storage:
```

### Production Checklist

- [ ] Set all required API keys as secrets
- [ ] Configure appropriate batch sizes for your workload
- [ ] Set up Prometheus metrics scraping
- [ ] Configure alerting for high error rates
- [ ] Enable vector DB backups

---

## Troubleshooting

### "Embedding service rate limited"

- Reduce `EMBEDDING_BATCH_SIZE` to lower concurrent load
- Upgrade API tier for higher limits
- Add delays between batches

### "Pinecone index not found"

1. Verify index exists in Pinecone console
2. Check `PINECONE_INDEX` matches exactly
3. Ensure API key has access to the index

### "Qdrant connection refused"

1. Check Qdrant is running: `docker ps`
2. Verify `QDRANT_URL` is correct
3. Check firewall/network settings

### "Dimension mismatch"

Ensure embedding dimension matches vector DB configuration:
- Gemini `embedding-001`: 768 dimensions
- OpenAI `text-embedding-3-small`: 1536 dimensions
- OpenAI `text-embedding-ada-002`: 1536 dimensions

### High Memory Usage

- Process chunks in smaller batches
- Stream results instead of loading all at once
- Use pagination for large queries

---

## Security Notes

1. **API Keys**: Never commit to version control. Use environment variables or secrets manager.

2. **PII**: Ensure text is redacted before embedding. The transcription step should handle this.

3. **Raw Embeddings**: Do not log embedding vectors. They may encode sensitive information.

4. **Network**: Use TLS for all API connections. Qdrant Cloud and Pinecone use HTTPS by default.
