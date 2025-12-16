# Flashcard Persistence Layer

> Production-ready persistence for AI-generated flashcard decks and cards using Drizzle ORM.

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Running Migrations](#running-migrations)
4. [Usage](#usage)
5. [Testing](#testing)
6. [Fallback Behavior](#fallback-behavior)
7. [CI Configuration](#ci-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This module provides persistent storage for flashcard decks and cards:

- **Database Store** (`dbDeckStore.ts`): PostgreSQL persistence using Drizzle ORM
- **File Store** (`deckStore.ts`): Local file system persistence (fallback)
- **Unified Interface** (`index.ts`): Automatic switching based on `USE_DB_STORE` env var

### Storage Selection

```
USE_DB_STORE=true  → Database (PostgreSQL)
USE_DB_STORE=false → File system (server/tmp/decks/)
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes (for DB) | - | PostgreSQL connection string |
| `USE_DB_STORE` | No | `false` | Enable database persistence |

### Example Connection Strings

```bash
# PostgreSQL (production)
DATABASE_URL=postgres://user:password@localhost:5432/flashcards

# PostgreSQL with SSL (Neon, Supabase, etc.)
DATABASE_URL=postgres://user:password@host:5432/db?sslmode=require

# SQLite for testing
DATABASE_URL=sqlite::memory:
DATABASE_URL=sqlite:./test.db
```

---

## Running Migrations

### PostgreSQL

```bash
# Using psql directly
psql $DATABASE_URL -f migrations/20251201_create_flashcards_tables.sql

# Using npm script (add to package.json)
npm run migrate:flashcards
```

**Add to `package.json` scripts:**

```json
{
  "scripts": {
    "migrate:flashcards": "psql $DATABASE_URL -f migrations/20251201_create_flashcards_tables.sql"
  }
}
```

### Verify Tables

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('flashcard_decks', 'flashcards');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('flashcard_decks', 'flashcards');
```

---

## Usage

### Import

```typescript
import { deckStore } from '../persistence';

// Or for specific operations
import { saveDeckToDb, readLatestDeck, readDeckById } from '../persistence';
```

### Save a Deck

```typescript
import { deckStore } from '../persistence';

const result = await deckStore.saveDeck({
  module_id: "mod-hr-101",
  module_title: "Introduction to HR",
  generated_count: 10,
  cards: [...],  // Array of Flashcard objects
  warnings: [],
  generation_metadata: {
    model: "gemini-1.5-flash",
    temperature: 0.1,
    timestamp: new Date().toISOString(),
  },
  // Optional:
  deck_id: "custom_deck_id",  // Auto-generated if not provided
  model_version: "gemini-1.5-flash",
  raw_model_output_url: "/logs/job-123.json",
  verified_rate: 0.95,
});

console.log(result.deck_id);   // "deck_mod-hr-101_1702358400000"
console.log(result.source);    // "db" or "file"
```

### Read Latest Deck

```typescript
const deck = await deckStore.readLatestDeck("mod-hr-101");

if (deck) {
  console.log(`Found ${deck.generated_count} cards`);
  deck.cards.forEach(card => console.log(card.q));
}
```

### Read by Deck ID

```typescript
const deck = await deckStore.readDeckById("deck_mod-hr-101_1702358400000");
```

### List Decks

```typescript
const decks = await deckStore.listDecksForModule("mod-hr-101", 10, 0);

decks.forEach(d => {
  console.log(`${d.deck_id} - ${d.generated_at} - ${d.verified_rate}`);
});
```

### Delete Deck

```typescript
const deleted = await deckStore.deleteDeck("deck_mod-hr-101_1702358400000");
console.log(deleted ? "Deleted" : "Not found");
```

---

## Testing

### Unit Tests (SQLite In-Memory)

```bash
# Run unit tests
npm run test:run -- test/persistence/dbDeckStore.unit.test.ts
```

Unit tests use in-memory SQLite for fast, isolated testing without external dependencies.

### Integration Tests (PostgreSQL)

```bash
# 1. Start PostgreSQL
docker run -d --name pg-test \
  -e POSTGRES_DB=flashcards_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:15-alpine

# 2. Run migration
DATABASE_URL=postgres://test:test@localhost:5433/flashcards_test \
  psql $DATABASE_URL -f migrations/20251201_create_flashcards_tables.sql

# 3. Run integration tests
DATABASE_URL=postgres://test:test@localhost:5433/flashcards_test \
  npm run test:run -- test/persistence/dbDeckStore.integration.test.ts

# 4. Cleanup
docker stop pg-test && docker rm pg-test
```

### Manual Verification

```bash
# 1. Start services
docker compose -f docker-compose.redis.yml up -d
export DATABASE_URL=postgres://user:pass@localhost:5432/db
export USE_DB_STORE=true

# 2. Generate a deck (mock LLM)
npm run e2e:module:mock

# 3. Verify in database
psql $DATABASE_URL -c "SELECT deck_id, module_id, generated_at FROM flashcard_decks LIMIT 5;"
psql $DATABASE_URL -c "SELECT card_id, question, difficulty FROM flashcards LIMIT 10;"
```

---

## Fallback Behavior

If database operations fail, the system automatically falls back to file storage:

```
1. saveDeckToDb() attempts to insert → DB error
2. Logs error: "[DbDeckStore] DB save failed for deck_xxx, falling back to file"
3. Calls fileDeckStore.saveDeckToStore()
4. Returns { deck_id, path: "/server/tmp/decks/xxx.json", source: "file" }
```

### When Fallback Occurs

- Database connection unavailable
- Query timeout
- Constraint violation
- Transaction failure

### Monitoring Fallback

Check logs for warnings:

```
[DbDeckStore] DB save failed for deck_xxx, falling back to file: [error message]
[DbDeckStore] Fallback to file succeeded: server/tmp/decks/xxx.json
```

---

## CI Configuration

### GitHub Actions Example

```yaml
name: Test Flashcard Persistence

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
      - run: npm run test:run -- test/persistence/dbDeckStore.unit.test.ts

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: flashcards_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run migrations
        run: psql $DATABASE_URL -f migrations/20251201_create_flashcards_tables.sql
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/flashcards_test
      - name: Run integration tests
        run: npm run test:run -- test/persistence/dbDeckStore.integration.test.ts
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/flashcards_test
          USE_DB_STORE: true
```

---

## Troubleshooting

### "DATABASE_URL environment variable is required"

Set the environment variable:

```bash
export DATABASE_URL=postgres://user:pass@localhost:5432/dbname
```

### "relation flashcard_decks does not exist"

Run migrations:

```bash
psql $DATABASE_URL -f migrations/20251201_create_flashcards_tables.sql
```

### "duplicate key value violates unique constraint"

This shouldn't happen with idempotent saves. Check if:
- `deck_id` is unique across saves
- Cards have unique `card_id` values

### Connection Timeouts

Check:
- Database is running and accessible
- Connection string is correct
- Firewall/network allows connection
- SSL mode is correct for your provider

### SQLite Errors in Tests

Ensure `better-sqlite3` is installed:

```bash
npm install --save-dev better-sqlite3 @types/better-sqlite3
```

---

## Database Schema

### flashcard_decks

| Column | Type | Description |
|--------|------|-------------|
| deck_id | VARCHAR(255) PK | Unique deck identifier |
| module_id | VARCHAR(255) | Module reference (indexed) |
| course_id | VARCHAR(255) | Course reference |
| module_title | VARCHAR(500) | Human-readable title |
| generated_at | TIMESTAMP | When deck was generated |
| model_version | VARCHAR(100) | LLM model used |
| raw_model_output_url | VARCHAR(1000) | URL to raw output logs |
| verified_rate | FLOAT | % of cards verified (0-1) |
| warnings | JSONB | Array of warning strings |
| metadata | JSONB | Additional metadata |

### flashcards

| Column | Type | Description |
|--------|------|-------------|
| card_id | VARCHAR(255) PK | Unique card identifier |
| deck_id | VARCHAR(255) FK | Reference to parent deck |
| question | TEXT | Card question |
| answer | TEXT | Card answer |
| difficulty | VARCHAR(20) | easy/medium/hard |
| bloom_level | VARCHAR(20) | Bloom's taxonomy level |
| evidence_json | JSONB | Evidence array |
| sources_json | JSONB | Source references |
| confidence_score | FLOAT | Model confidence (0-1) |
| rationale | TEXT | Why card is important |
| review_required | BOOLEAN | Needs human review |
| verified | BOOLEAN | Admin approved |
