# Flashcard Worker Deployment Runbook

> Production-ready deployment guide for BullMQ workers and Redis infrastructure.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Local Development](#local-development)
4. [Running Tests](#running-tests)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** >= 18.x
- **Docker** & Docker Compose (for Redis)
- **Redis** 7.x (via Docker or managed service)

---

## Environment Variables

### Required Variables

```bash
# Redis connection (required for workers)
REDIS_URL=redis://localhost:6379

# Worker configuration
WORKER_CONCURRENCY=2          # Number of concurrent jobs per worker process
JOB_ATTEMPTS=3                # Retry attempts for failed jobs
JOB_TIMEOUT_MS=600000         # Job timeout (10 minutes default)
QUEUE_PREFIX=flashcard        # Redis key prefix for queue
```

### Optional Variables

```bash
# Logging
LOG_STORE=local               # local | s3
DEBUG=false                   # Enable debug logging

# S3 storage (if LOG_STORE=s3)
S3_BUCKET=flashcard-logs
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# API Keys (for orchestrator)
GEMINI_API_KEY=...           # Google AI API key
# or
GOOGLE_AI_API_KEY=...

# Module job chaining
ENQUEUE_MODULE_JOB_ON_COMPLETE=true  # Auto-enqueue module generation after transcription

# Testing
MOCK_FILE_URLS=false          # Use mock file URLs in transcription
TEST_REDIS_URL=redis://localhost:6379
```

---

## Local Development

### 1. Start Redis

```bash
# Start Redis with persistence
docker compose -f docker-compose.redis.yml up -d

# Verify Redis is running
docker compose -f docker-compose.redis.yml ps

# View Redis logs
docker compose -f docker-compose.redis.yml logs -f

# Stop Redis
docker compose -f docker-compose.redis.yml down

# Stop and remove data
docker compose -f docker-compose.redis.yml down -v
```

### 2. Start Workers

#### Orchestrator Worker

```bash
# Development mode with tsx
npx tsx server/services/flashcard/workers/orchestratorWorker.ts

# With custom settings
REDIS_URL=redis://localhost:6379 \
WORKER_CONCURRENCY=4 \
npx tsx server/services/flashcard/workers/orchestratorWorker.ts
```

#### Transcription Worker

```bash
# Development mode
npx tsx server/services/flashcard/workers/transcriptionWorker.ts

# With custom settings
REDIS_URL=redis://localhost:6379 \
WORKER_CONCURRENCY=2 \
ENQUEUE_MODULE_JOB_ON_COMPLETE=true \
npx tsx server/services/flashcard/workers/transcriptionWorker.ts
```

### 3. Enqueue Jobs via API

```bash
# Enqueue module generation job
curl -X POST http://localhost:5000/api/flashcards/orchestrator/generate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "mode": "single_module",
    "target": {
      "module_id": "mod-hr-101",
      "course_id": "course-hr-2025"
    },
    "settings": {
      "target_card_count": 10
    }
  }'

# Check job status
curl http://localhost:5000/api/flashcards/orchestrator/jobs/<job_id> \
  -H "Authorization: Bearer <token>"
```

---

## Running Tests

### Unit Tests (Mocked Redis)

```bash
# Run queue unit tests
npm run test:run -- test/queue/queue.unit.test.ts
```

### Integration Tests (Real Redis Required)

```bash
# 1. Start Redis
docker compose -f docker-compose.redis.yml up -d

# 2. Run orchestrator worker tests
npm run test:run -- test/workers/orchestratorWorker.integration.test.ts

# 3. Run transcription worker tests
npm run test:run -- test/workers/transcriptionWorker.integration.test.ts

# 4. Run all flashcard tests
npm run test:run -- test/flashcard/

# 5. Stop Redis
docker compose -f docker-compose.redis.yml down
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended)

Create `docker-compose.workers.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: flashcard-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy noeviction
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  orchestrator-worker:
    build: .
    container_name: flashcard-orchestrator-worker
    restart: unless-stopped
    command: node -r tsx server/services/flashcard/workers/orchestratorWorker.ts
    environment:
      - REDIS_URL=redis://redis:6379
      - WORKER_CONCURRENCY=2
      - JOB_TIMEOUT_MS=600000
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - ./server/tmp/logs:/app/server/tmp/logs

  transcription-worker:
    build: .
    container_name: flashcard-transcription-worker
    restart: unless-stopped
    command: node -r tsx server/services/flashcard/workers/transcriptionWorker.ts
    environment:
      - REDIS_URL=redis://redis:6379
      - WORKER_CONCURRENCY=2
      - JOB_TIMEOUT_MS=1800000
      - ENQUEUE_MODULE_JOB_ON_COMPLETE=true
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - ./server/tmp/logs:/app/server/tmp/logs

volumes:
  redis-data:
```

Run:

```bash
docker compose -f docker-compose.workers.yml up -d
```

### Option 2: PM2 Process Manager

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "orchestrator-worker",
      script: "server/services/flashcard/workers/orchestratorWorker.ts",
      interpreter: "node",
      interpreter_args: "-r tsx",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        REDIS_URL: "redis://localhost:6379",
        WORKER_CONCURRENCY: 2,
      },
      error_file: "./logs/orchestrator-error.log",
      out_file: "./logs/orchestrator-out.log",
      merge_logs: true,
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      name: "transcription-worker",
      script: "server/services/flashcard/workers/transcriptionWorker.ts",
      interpreter: "node",
      interpreter_args: "-r tsx",
      instances: 1,
      env: {
        NODE_ENV: "production",
        REDIS_URL: "redis://localhost:6379",
        WORKER_CONCURRENCY: 2,
      },
      error_file: "./logs/transcription-error.log",
      out_file: "./logs/transcription-out.log",
      merge_logs: true,
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
```

Run:

```bash
# Start workers
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs orchestrator-worker

# Stop workers
pm2 stop all

# Restart workers
pm2 restart all
```

### Option 3: systemd Service

Create `/etc/systemd/system/flashcard-orchestrator.service`:

```ini
[Unit]
Description=Flashcard Orchestrator Worker
After=network.target redis.service

[Service]
Type=simple
User=app
WorkingDirectory=/opt/flashcard-app
ExecStart=/usr/bin/node -r tsx server/services/flashcard/workers/orchestratorWorker.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=REDIS_URL=redis://localhost:6379
Environment=WORKER_CONCURRENCY=2

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable flashcard-orchestrator
sudo systemctl start flashcard-orchestrator

# Check status
sudo systemctl status flashcard-orchestrator

# View logs
sudo journalctl -u flashcard-orchestrator -f
```

---

## Monitoring & Observability

### Prometheus Metrics

The workers expose metrics at `/api/flashcards/orchestrator/metrics`:

```
# HELP flashcard_jobs_enqueued_total Total number of jobs enqueued
# TYPE flashcard_jobs_enqueued_total counter
flashcard_jobs_enqueued_total{type="orchestrator"} 150
flashcard_jobs_enqueued_total{type="transcription"} 45

# HELP flashcard_jobs_failed_total Total number of failed jobs
# TYPE flashcard_jobs_failed_total counter
flashcard_jobs_failed_total{type="orchestrator"} 3

# HELP flashcard_jobs_in_progress Number of jobs currently in progress
# TYPE flashcard_jobs_in_progress gauge
flashcard_jobs_in_progress{type="orchestrator"} 2

# HELP flashcard_job_duration_seconds Job duration in seconds
# TYPE flashcard_job_duration_seconds histogram
flashcard_job_duration_seconds_bucket{type="orchestrator",status="SUCCESS",le="60"} 120
```

### Job Logs

Logs are stored at:
- **Local**: `server/tmp/logs/{jobId}.json`
- **S3**: `s3://{bucket}/logs/{jobId}.json`

Log structure:

```json
{
  "jobId": "uuid-1234",
  "module_id": "mod-hr-101",
  "startedAt": "2025-12-12T00:00:00.000Z",
  "completedAt": "2025-12-12T00:01:30.000Z",
  "status": "completed",
  "entries": [
    {
      "timestamp": "2025-12-12T00:00:00.000Z",
      "level": "info",
      "step": "job_start",
      "message": "Job started for module mod-hr-101"
    }
  ],
  "rawOutputs": {
    "stageA": { ... },
    "stageB": { ... }
  },
  "result": { ... }
}
```

### Health Check

```bash
curl http://localhost:5000/api/flashcards/orchestrator/health
```

Response:

```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "jobs_in_queue": 5,
    "jobs_processing": 2,
    "last_successful_run": "2025-12-12T00:00:00.000Z",
    "uptime": 86400
  }
}
```

### Queue Statistics

```bash
curl http://localhost:5000/api/flashcards/orchestrator/metrics
```

---

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**: Ensure Redis is running:

```bash
docker compose -f docker-compose.redis.yml up -d
docker compose -f docker-compose.redis.yml logs
```

#### 2. Job Stuck in Active State

**Cause**: Worker crashed while processing a job.

**Solution**: Jobs will be moved to stalled after `stalledInterval` (30s default), then retried.

To manually check stalled jobs:

```bash
# Connect to Redis
redis-cli

# Check stalled jobs
KEYS *stalled*
```

#### 3. Memory Issues

**Cause**: Too many jobs in queue or large job data.

**Solution**:
- Increase Redis `maxmemory`
- Reduce `removeOnComplete` age
- Check for memory leaks in worker

#### 4. Jobs Not Being Processed

**Cause**: No workers running or queue mismatch.

**Check**:
1. Worker is running and connected
2. Queue prefix matches between API and worker
3. Queue name is correct

```bash
# Check queue in Redis
redis-cli
KEYS flashcard:*
```

### Debugging

Enable debug logging:

```bash
DEBUG=true npx tsx server/services/flashcard/workers/orchestratorWorker.ts
```

View Redis Commander (if enabled):

```bash
docker compose -f docker-compose.redis.yml --profile debug up -d
# Open http://localhost:8081
```

---

## Scaling

### Horizontal Scaling

- Run multiple worker processes (same or different machines)
- Workers automatically share jobs via Redis
- Use `WORKER_CONCURRENCY` to control jobs per process

```bash
# Run 3 orchestrator workers
for i in 1 2 3; do
  WORKER_ID=$i npx tsx server/services/flashcard/workers/orchestratorWorker.ts &
done
```

### Vertical Scaling

- Increase `WORKER_CONCURRENCY` for CPU-bound tasks
- For memory-intensive tasks, keep concurrency low

### Redis Scaling

For high availability, use:
- Redis Cluster
- Redis Sentinel
- AWS ElastiCache / Azure Cache for Redis

Update `REDIS_URL` accordingly:

```bash
# Cluster mode
REDIS_URL=redis://node1:6379,node2:6379,node3:6379

# Sentinel mode
REDIS_URL=redis+sentinel://sentinel1:26379,sentinel2:26379/mymaster
```

---

## Security Notes

1. **Never log secrets** - The job logger redacts sensitive fields
2. **Use environment variables** for API keys, not config files
3. **Limit Redis access** - Use authentication and network policies
4. **Secure S3 logs** - Use presigned URLs with expiration

```bash
# Redis with password
REDIS_URL=redis://:password@localhost:6379
```
