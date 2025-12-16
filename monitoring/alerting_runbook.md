# Alerting Runbook

> How to handle alerts and cost overages for the Flashcard Orchestrator system.

---

## Table of Contents

1. [Alert Overview](#alert-overview)
2. [Alert Response Procedures](#alert-response-procedures)
3. [Cost Control](#cost-control)
4. [Alert Channels Configuration](#alert-channels-configuration)
5. [Escalation Policy](#escalation-policy)

---

## Alert Overview

### Alert Severity Levels

| Severity | Response Time | Action |
|----------|--------------|--------|
| **Critical** | Immediate (<5m) | Page on-call, immediate investigation |
| **Warning** | Within 30 min | Investigate, may require action |
| **Info** | Next business day | Review, may indicate trend |

### Alert Categories

| Category | Examples | Primary Owner |
|----------|----------|---------------|
| Job Processing | HighJobFailureRate, QueueBacklogHigh | Backend Team |
| Quality | LowVerificationRate, HighLLMInvalidJsonRate | ML/AI Team |
| Cost | HighEmbeddingCost, DailyCostBudgetExceeded | Platform Team |
| Infrastructure | WorkerNotProcessing, RedisConnectionErrors | DevOps Team |

---

## Alert Response Procedures

### HighJobFailureRate

**Trigger:** >5% of jobs failing over 10 minutes

**Symptoms:**
- Users report flashcard generation not completing
- Job status shows "failed" state
- Error logs contain LLM or DB errors

**Investigation Steps:**

1. **Check recent logs:**
   ```bash
   docker compose logs --tail=100 orchestrator_worker | grep -i error
   ```

2. **Check LLM API status:**
   - Gemini: https://status.cloud.google.com/
   - OpenAI: https://status.openai.com/

3. **Check job failure reasons:**
   ```bash
   # View failed jobs in Redis
   redis-cli LRANGE flashcard:failed 0 10
   ```

4. **Common causes:**
   - LLM API rate limiting → Reduce concurrency
   - Invalid prompts → Check few-shot library
   - Database connection issues → Check Postgres/Redis

**Resolution:**
- If LLM API issue: Wait or switch provider
- If rate limiting: Set `WORKER_CONCURRENCY=1` temporarily
- If database: Restart connections, check health

---

### QueueBacklogHigh / QueueBacklogCritical

**Trigger:** >100 (warning) or >500 (critical) jobs in queue

**Symptoms:**
- Users experience long wait times
- Job status stays "pending" for extended periods

**Investigation Steps:**

1. **Check worker status:**
   ```bash
   docker compose ps orchestrator_worker
   pm2 status flashcard-orchestrator-worker
   ```

2. **Check worker logs for errors:**
   ```bash
   docker compose logs orchestrator_worker --tail=50
   ```

3. **Check worker processing rate:**
   ```bash
   # In Grafana or Prometheus
   rate(flashcard_jobs_completed_total[5m])
   ```

**Resolution:**
- Scale workers:
  ```bash
  # Docker Compose
  docker compose up -d --scale orchestrator_worker=4
  
  # Kubernetes
  kubectl scale deployment flashcard-orchestrator-worker --replicas=5
  
  # PM2
  pm2 scale flashcard-orchestrator-worker +2
  ```

- If workers are crashing, fix underlying issue first

---

### LowVerificationRate

**Trigger:** <80% verification rate over 1 hour

**Symptoms:**
- Cards flagged for review increasing
- Users report inaccurate flashcards

**Investigation Steps:**

1. **Check recent card outputs:**
   ```bash
   # Sample recent cards
   curl http://localhost:5000/api/flashcards/review-queue?limit=10
   ```

2. **Review StageB prompts and few-shots:**
   - Check `few_shot_library/*.json` for quality
   - Run prompt tuner to test changes

3. **Check chunk quality:**
   - Review transcription outputs
   - Check if chunks have sufficient context

**Resolution:**
- Update few-shot examples if prompts are generating poor content
- Adjust chunk size if context is insufficient
- Temporarily enable `draft_mode` to queue cards for human review

---

### HighLLMInvalidJsonRate

**Trigger:** >10% of LLM responses failing to parse

**Symptoms:**
- Jobs completing but with empty/partial output
- Parse errors in logs

**Investigation Steps:**

1. **Check raw LLM outputs:**
   ```bash
   # View job logs
   cat server/tmp/logs/job-*.json | jq '.raw_outputs[-1]'
   ```

2. **Test prompt manually:**
   - Use prompt tuner to verify prompt format
   - Check if model is hallucinating or truncating

**Resolution:**
- Increase `max_tokens` in LLM config
- Simplify prompt if too complex
- Add more explicit JSON formatting instructions
- Switch to a more reliable model (e.g., GPT-4 over GPT-3.5)

---

### HighEmbeddingCost / DailyCostBudgetExceeded

**Trigger:** Estimated daily cost >$100 (configurable)

**Symptoms:**
- Prometheus alert fires
- Embedding call rate unusually high

**Investigation Steps:**

1. **Check embedding call rate:**
   ```promql
   sum(rate(flashcard_embedding_calls_total[1h])) * 3600
   ```

2. **Identify high-volume source:**
   ```promql
   sum by (module_id)(rate(flashcard_embedding_calls_total[1h]))
   ```

3. **Check for runaway jobs:**
   ```bash
   redis-cli LLEN flashcard:active
   ```

**Resolution:**
- Enable cost-control mode (see below)
- Identify and pause excessive jobs
- Review batch size settings

---

## Cost Control

### Cost-Control Circuit Breaker

When embedding costs exceed budget, the system can automatically degrade to "draft-only" mode.

#### Manual Activation

```bash
# Enable cost-control mode via environment variable
export COST_CONTROL_MODE=draft_only

# Restart workers
pm2 restart flashcard-orchestrator-worker
# or
docker compose restart orchestrator_worker
```

#### Cost-Control Modes

| Mode | Behavior |
|------|----------|
| `normal` | Full processing with all features |
| `draft_only` | Skip embeddings, queue cards for later |
| `queue_only` | Accept jobs but don't process until off-peak |
| `disabled` | Return 503 for new generation requests |

#### Automatic Circuit Breaker Script

```bash
#!/bin/bash
# scripts/cost_control.sh

DAILY_BUDGET=${COST_BUDGET_DAILY:-100}
COST_PER_EMBEDDING=0.0001

# Get current daily usage
DAILY_CALLS=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(flashcard_embedding_calls_total[24h]))" | jq -r '.data.result[0].value[1]')
DAILY_COST=$(echo "$DAILY_CALLS * $COST_PER_EMBEDDING" | bc)

echo "Daily embedding calls: $DAILY_CALLS"
echo "Estimated daily cost: \$$DAILY_COST"
echo "Budget: \$$DAILY_BUDGET"

if (( $(echo "$DAILY_COST > $DAILY_BUDGET" | bc -l) )); then
    echo "⚠️ Budget exceeded! Enabling cost-control mode..."
    
    # Update config (choose one method):
    
    # Method 1: Environment file
    echo "COST_CONTROL_MODE=draft_only" >> .env
    
    # Method 2: Redis flag
    redis-cli SET flashcard:cost_control_mode "draft_only"
    
    # Method 3: Restart with env
    docker compose exec orchestrator_worker env COST_CONTROL_MODE=draft_only npm run worker
    
    echo "✓ Cost-control mode enabled"
else
    echo "✓ Within budget"
fi
```

#### Off-Peak Processing

Configure workers to process expensive operations during off-peak hours:

```javascript
// In worker config
const OFF_PEAK_HOURS = [0, 1, 2, 3, 4, 5, 6]; // 12am-6am UTC

function shouldProcessExpensiveJob() {
  const hour = new Date().getUTCHours();
  
  if (process.env.COST_CONTROL_MODE === 'queue_only') {
    return OFF_PEAK_HOURS.includes(hour);
  }
  
  return true;
}
```

---

## Alert Channels Configuration

### Slack Webhook

```yaml
# alertmanager.yml
receivers:
  - name: 'flashcard-slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#flashcard-alerts'
        username: 'Flashcard Alertmanager'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

### PagerDuty

```yaml
# alertmanager.yml
receivers:
  - name: 'flashcard-pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        severity: '{{ if eq .Labels.severity "critical" }}critical{{ else }}warning{{ end }}'
```

### Email

```yaml
# alertmanager.yml
receivers:
  - name: 'flashcard-email'
    email_configs:
      - to: 'team@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts@example.com'
        auth_password: '{{ .EnvSecrets.SMTP_PASSWORD }}'
```

---

## Escalation Policy

### Priority 1 (Critical)

| Time | Action |
|------|--------|
| 0-5 min | Alert fires, on-call paged |
| 5-15 min | On-call acknowledges, begins investigation |
| 15-30 min | If not resolved, escalate to team lead |
| 30-60 min | If not resolved, escalate to engineering manager |
| 60+ min | Incident declared, all-hands if needed |

### Priority 2 (Warning)

| Time | Action |
|------|--------|
| 0-30 min | Alert fires, notification to channel |
| 30-60 min | On-call reviews, creates ticket if needed |
| 60+ min | Scheduled investigation during business hours |

### Contact List

| Role | Contact | Method |
|------|---------|--------|
| On-call Engineer | (rotates) | PagerDuty |
| Team Lead | team-lead@example.com | Slack/Email |
| Engineering Manager | eng-manager@example.com | Phone |
| Platform Team | #platform-oncall | Slack |

---

## Rollback Procedures

### Disable Generation Feature

If a critical bug is discovered:

```bash
# Method 1: Feature flag
redis-cli SET flashcard:feature:generation "disabled"

# Method 2: Return 503 from API
export DISABLE_GENERATION=true
docker compose restart api

# Method 3: Stop workers
docker compose stop orchestrator_worker transcription_worker
```

### Restore Previous Version

```bash
# Docker
docker compose pull --policy=never
docker compose down
git checkout <previous-tag>
docker compose up -d

# Kubernetes
kubectl rollout undo deployment/flashcard-orchestrator-worker
kubectl rollout undo deployment/flashcard-api
```

### Clear Stuck Jobs

```bash
# Move stuck jobs back to queue
redis-cli LRANGE flashcard:active 0 -1 | while read job; do
  redis-cli RPUSH flashcard:waiting "$job"
done
redis-cli DEL flashcard:active
```

---

## Metrics Reference

| Metric | Description | Thresholds |
|--------|-------------|------------|
| `flashcard_queue_depth` | Jobs waiting in queue | >100 warn, >500 crit |
| `flashcard_jobs_failed_total` | Total failed jobs | Rate >5% warn |
| `flashcard_cards_verified_total` | Verified cards | Rate <80% warn |
| `flashcard_embedding_calls_total` | Embedding API calls | Cost tracking |
| `flashcard_llm_parse_errors_total` | JSON parse failures | Rate >10% warn |
