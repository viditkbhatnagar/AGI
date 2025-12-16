# Flashcard API & Media Playback Runbook

> REST API for flashcard generation, management, and signed media playback.

---

## Table of Contents

1. [Overview](#overview)
2. [Endpoints](#endpoints)
3. [Configuration](#configuration)
4. [Authentication](#authentication)
5. [Usage Examples](#usage-examples)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This module provides:

- **Generation API**: Enqueue flashcard generation jobs, poll status
- **Deck API**: Fetch module decks and individual cards
- **Admin API**: Review queue, approve/edit cards
- **Media API**: Signed playback URLs with timestamp support

---

## Endpoints

### Orchestrator Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/flashcards/orchestrator/generate` | Enqueue generation job | User |
| GET | `/api/flashcards/orchestrator/jobs/:job_id` | Get job status | User |

### Deck & Card Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/modules/:module_id/flashcards` | Get latest deck | User |
| GET | `/api/flashcards/:card_id` | Get single card | User |

### Admin Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/flashcards/review-queue` | Get cards needing review | Admin |
| POST | `/api/flashcards/:card_id/approve` | Approve card | Admin |
| POST | `/api/flashcards/:card_id/edit` | Edit card | Admin |

### Media Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/media/play` | Get signed playback URL | User |
| GET | `/media/stream` | Stream media (proxy) | Token |

---

## Configuration

### Environment Variables

```bash
# =============================================================================
# API Configuration
# =============================================================================

# Server
PORT=5000
NODE_ENV=development
API_BASE_URL=http://localhost:5000

# Rate Limiting
RATE_LIMIT_GENERATE_PER_MIN=5
RATE_LIMIT_STATUS_PER_MIN=60
RATE_LIMIT_MEDIA_PER_MIN=60

# =============================================================================
# Media / Signed Links
# =============================================================================

# JWT Signing Key (REQUIRED - generate a strong random string)
SIGNING_KEY=your-secure-random-signing-key-here

# Default link expiry in seconds
MEDIA_LINK_EXPIRY_SECONDS=300

# Local media storage path
LOCAL_MEDIA_PATH=./server/tmp/media

# =============================================================================
# Google Drive
# =============================================================================

# Service account JSON path
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
# Or use Application Default Credentials
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# =============================================================================
# Microsoft OneDrive / Graph
# =============================================================================

MS_GRAPH_CLIENT_ID=your-azure-app-client-id
MS_GRAPH_CLIENT_SECRET=your-azure-app-secret
MS_GRAPH_TENANT_ID=your-tenant-id

# =============================================================================
# Queue (BullMQ/Redis)
# =============================================================================

REDIS_URL=redis://localhost:6379
```

### Generate Signing Key

```bash
# Generate a secure 64-character key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Authentication

### User Authentication

The API uses JWT tokens via the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

The auth middleware populates `req.user` with:
```typescript
{
  id: string;      // User ID
  role: "user" | "admin";
}
```

### Admin Endpoints

Admin endpoints require `role: "admin"` and return 403 for non-admin users.

### Media Tokens

The `/media/stream` endpoint uses short-lived JWT tokens in the query string:

```
/media/stream?token=<jwt_token>&start=0
```

---

## Usage Examples

### 1. Generate Flashcards

```bash
# Enqueue generation job
curl -X POST http://localhost:5000/api/flashcards/orchestrator/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mode": "single_module",
    "target": { "module_id": "mod-hr-101" },
    "settings": { "card_count": 15 }
  }'

# Response
{
  "jobId": "abc123-def456",
  "statusUrl": "/api/flashcards/orchestrator/jobs/abc123-def456",
  "message": "Job enqueued successfully"
}
```

### 2. Poll Job Status

```bash
curl http://localhost:5000/api/flashcards/orchestrator/jobs/abc123-def456 \
  -H "Authorization: Bearer $TOKEN"

# Response (in progress)
{
  "jobId": "abc123-def456",
  "status": "active",
  "progress": 45,
  "created_at": "2024-01-15T10:30:00.000Z"
}

# Response (completed)
{
  "jobId": "abc123-def456",
  "status": "completed",
  "progress": 100,
  "result": {
    "generated_count": 15,
    "verified_count": 12,
    "deck_id": "mod-hr-101::deck-001",
    "warnings": []
  },
  "created_at": "2024-01-15T10:30:00.000Z",
  "completed_at": "2024-01-15T10:32:45.000Z"
}
```

### 3. Fetch Module Deck

```bash
curl "http://localhost:5000/api/modules/mod-hr-101/flashcards?limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Response
{
  "deck_id": "mod-hr-101::deck-001",
  "module_id": "mod-hr-101",
  "module_title": "Introduction to HR",
  "cards": [...],
  "card_count": 5,
  "total_count": 15,
  "verification_rate": 0.80
}
```

### 4. Get Signed Playback URL

```bash
curl "http://localhost:5000/api/media/play?file_id=abc123&provider=google_drive&start=65" \
  -H "Authorization: Bearer $TOKEN"

# Response
{
  "playUrl": "https://drive.google.com/file/d/abc123/preview#t=65",
  "start_sec": 65,
  "expiry_at": "2024-01-15T10:35:00.000Z",
  "is_proxy": false
}

# Or with proxy fallback
{
  "playUrl": "http://localhost:5000/media/stream?token=eyJ...&start=65",
  "start_sec": 65,
  "expiry_at": "2024-01-15T10:35:00.000Z",
  "is_proxy": true
}
```

### 5. Admin: Approve Card

```bash
curl -X POST http://localhost:5000/api/flashcards/card-123/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Response
{
  "success": true,
  "card_id": "card-123",
  "message": "Card approved successfully"
}
```

### 6. Admin: Edit Card

```bash
curl -X POST http://localhost:5000/api/flashcards/card-123/edit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "q": "What is organizational culture?",
    "a": "Organizational culture refers to the shared values, beliefs, and practices...",
    "rationale": "Updated for clarity"
  }'

# Response
{
  "success": true,
  "card_id": "card-123",
  "verified": true,
  "message": "Card updated successfully"
}
```

---

## Frontend Integration

### React Hooks

Import the hooks from `FlashcardComponents.tsx`:

```tsx
import {
  useFlashcardGeneration,
  useMediaPlayer,
  FlashcardComponent,
} from './components/flashcard/FlashcardComponents';

function MyComponent() {
  const { generate, status, deck, isLoading } = useFlashcardGeneration();
  const { playAtTime, videoRef } = useMediaPlayer();

  const handleGenerate = () => {
    generate({
      mode: 'single_module',
      target: { module_id: 'mod-hr-101' },
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isLoading}>
        Generate
      </button>
      
      {status && <p>Progress: {status.progress}%</p>}
      
      {deck?.cards.map(card => (
        <FlashcardComponent
          key={card.card_id}
          card={card}
          onPlayEvidence={(ev) => playAtTime({
            fileId: ev.source_file,
            provider: 'google_drive',
            startSec: ev.start_sec,
          })}
        />
      ))}
      
      <video ref={videoRef} controls />
    </div>
  );
}
```

### Admin Review UI

```tsx
import { AdminReviewQueue } from './components/flashcard/AdminReviewQueue';

function AdminDashboard() {
  return <AdminReviewQueue moduleId="mod-hr-101" />;
}
```

---

## Testing

### Run Tests

```bash
# Unit tests
npm run test:run -- test/api/orchestrator.generate.test.ts
npm run test:run -- test/api/orchestrator.status.test.ts
npm run test:run -- test/api/media.signed.test.ts

# All API tests
npm run test:run -- test/api/
```

### Integration Tests with Supertest

```typescript
import request from 'supertest';
import app from '../../server/app';

describe('API Integration', () => {
  it('should generate and poll job', async () => {
    const genRes = await request(app)
      .post('/api/flashcards/orchestrator/generate')
      .send({ mode: 'single_module', target: { module_id: 'test' } })
      .expect(202);

    const statusRes = await request(app)
      .get(genRes.body.statusUrl)
      .expect(200);

    expect(statusRes.body.status).toMatch(/pending|active/);
  });
});
```

---

## Deployment

### Docker Compose

```yaml
version: '3.9'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - SIGNING_KEY=${SIGNING_KEY}
      - GOOGLE_SERVICE_ACCOUNT_JSON=/app/secrets/service-account.json
      - MS_GRAPH_CLIENT_ID=${MS_GRAPH_CLIENT_ID}
      - MS_GRAPH_CLIENT_SECRET=${MS_GRAPH_CLIENT_SECRET}
    secrets:
      - google_service_account
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

secrets:
  google_service_account:
    file: ./secrets/service-account.json
```

### Production Checklist

- [ ] Set strong `SIGNING_KEY` (64+ characters)
- [ ] Configure HTTPS (required for signed URLs)
- [ ] Set up Redis for BullMQ
- [ ] Configure rate limits appropriately
- [ ] Set up logging and monitoring
- [ ] Configure CORS for frontend domains
- [ ] Test admin endpoints with real auth

---

## Security

### Signed URL Security

1. **Short Expiry**: Default 300s, max 3600s
2. **User Binding**: Token includes user_id for audit
3. **Module Scope**: Token includes module_id for ACL
4. **No Raw Tokens**: Drive/Graph tokens never exposed to client

### Rate Limiting

| Endpoint | Default Limit |
|----------|---------------|
| `/orchestrator/generate` | 5/min/user |
| `/orchestrator/jobs/:id` | 60/min/user |
| `/media/play` | 60/min/user |

### Authorization

- All endpoints require authentication
- Admin endpoints check `role === 'admin'`
- Logs URL only visible to admins
- Audit trail for approve/edit actions

### Best Practices

1. **Store SIGNING_KEY in secrets manager** (not env file in production)
2. **Use HTTPS** to protect tokens in transit
3. **Rotate signing keys** periodically
4. **Monitor for abuse** via metrics and logs
5. **Validate file access** before generating signed URLs

---

## Troubleshooting

### "Rate limited" Error

```json
{ "error": "Too many requests", "retryAfter": 45 }
```

**Solution**: Wait for `retryAfter` seconds, or increase rate limits in env.

### "Invalid or expired token" on Stream

- Check that `SIGNING_KEY` is the same across deployments
- Verify server time is synchronized (NTP)
- Increase `MEDIA_LINK_EXPIRY_SECONDS` if needed

### Job Stuck in "pending"

- Check Redis connection: `redis-cli ping`
- Verify BullMQ workers are running
- Check worker logs for errors

### "Admin access required" for Non-Admin

- Verify JWT contains `role: "admin"`
- Check auth middleware is setting `req.user.role` correctly

### Drive/OneDrive URL Not Working

- Verify service account has access to the file
- Check file sharing permissions
- Fall back to proxy by not setting credentials

---

## Metrics

| Metric | Description |
|--------|-------------|
| `flashcard_jobs_enqueued_total` | Jobs enqueued by mode |
| `api_job_status_requests_total` | Job status API calls |
| `api_generate_requests_total` | Generate API calls by status |
| `api_media_signed_requests_total` | Signed URL requests by provider |
| `api_media_stream_requests_total` | Stream proxy requests |
| `cards_manually_approved_total` | Admin card approvals |
| `cards_manually_edited_total` | Admin card edits |
| `flashcard_api_latency_seconds` | API latency histogram |

---

## Rollback Steps

### Disable Media Endpoints

If a vulnerability is discovered in media streaming:

1. Set feature flag: `DISABLE_MEDIA_ENDPOINTS=true`
2. Or return 503 in mediaRoutes:

```typescript
if (process.env.DISABLE_MEDIA_ENDPOINTS === 'true') {
  router.get('/play', (req, res) => res.status(503).json({ error: 'Temporarily disabled' }));
  router.get('/stream', (req, res) => res.status(503).json({ error: 'Temporarily disabled' }));
}
```

### Rotate Signing Key

1. Set new `SIGNING_KEY` in env
2. Restart all API instances
3. Existing tokens will become invalid (expected)
4. Clients will get new tokens on next request
