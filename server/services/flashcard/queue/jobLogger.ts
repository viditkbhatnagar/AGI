/**
 * Job Logger
 * 
 * Handles logging for job execution, including raw LLM outputs.
 * Supports local file storage and S3 (when configured).
 */

import * as fs from "fs";
import * as path from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOG_STORE = process.env.LOG_STORE || "local";
const LOGS_DIR = path.join(process.cwd(), "server", "tmp", "logs");

// =============================================================================
// TYPES
// =============================================================================

export interface JobLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  step: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface JobLog {
  jobId: string;
  module_id: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  entries: JobLogEntry[];
  rawOutputs?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// In-memory log storage during job execution
const activeLogs: Map<string, JobLog> = new Map();

// =============================================================================
// INITIALIZATION
// =============================================================================

function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

// =============================================================================
// LOG MANAGEMENT
// =============================================================================

/**
 * Start a new job log
 */
export function startJobLog(jobId: string, module_id: string): void {
  const log: JobLog = {
    jobId,
    module_id,
    startedAt: new Date().toISOString(),
    status: "running",
    entries: [],
    rawOutputs: {},
  };

  activeLogs.set(jobId, log);

  addLogEntry(jobId, "info", "job_start", `Job started for module ${module_id}`);
}

/**
 * Add a log entry to an active job
 */
export function addLogEntry(
  jobId: string,
  level: JobLogEntry["level"],
  step: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const log = activeLogs.get(jobId);

  if (!log) {
    console.warn(`[JobLogger] No active log for job ${jobId}`);
    return;
  }

  const entry: JobLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    step,
    message,
    data,
  };

  log.entries.push(entry);

  // Also log to console with structured format
  const logLine = JSON.stringify({
    jobId,
    module_id: log.module_id,
    ...entry,
  });

  switch (level) {
    case "error":
      console.error(`[Job:${jobId}] ${logLine}`);
      break;
    case "warn":
      console.warn(`[Job:${jobId}] ${logLine}`);
      break;
    case "debug":
      if (process.env.DEBUG) {
        console.debug(`[Job:${jobId}] ${logLine}`);
      }
      break;
    default:
      console.log(`[Job:${jobId}] ${logLine}`);
  }
}

/**
 * Store raw LLM output for a job
 */
export function storeRawOutput(
  jobId: string,
  outputKey: string,
  output: unknown
): void {
  const log = activeLogs.get(jobId);

  if (!log) {
    console.warn(`[JobLogger] No active log for job ${jobId}`);
    return;
  }

  if (!log.rawOutputs) {
    log.rawOutputs = {};
  }

  // Redact potential PII/secrets
  const sanitized = sanitizeOutput(output);
  log.rawOutputs[outputKey] = sanitized;
}

/**
 * Complete a job log (success)
 */
export async function completeJobLog(
  jobId: string,
  result: unknown
): Promise<string> {
  const log = activeLogs.get(jobId);

  if (!log) {
    console.warn(`[JobLogger] No active log for job ${jobId}`);
    return "";
  }

  log.completedAt = new Date().toISOString();
  log.status = "completed";
  log.result = result;

  addLogEntry(jobId, "info", "job_complete", "Job completed successfully");

  const logsUrl = await persistLog(log);
  activeLogs.delete(jobId);

  return logsUrl;
}

/**
 * Fail a job log
 */
export async function failJobLog(
  jobId: string,
  error: string
): Promise<string> {
  const log = activeLogs.get(jobId);

  if (!log) {
    console.warn(`[JobLogger] No active log for job ${jobId}`);
    return "";
  }

  log.completedAt = new Date().toISOString();
  log.status = "failed";
  log.error = error;

  addLogEntry(jobId, "error", "job_failed", `Job failed: ${error}`);

  const logsUrl = await persistLog(log);
  activeLogs.delete(jobId);

  return logsUrl;
}

/**
 * Get logs URL for a job
 */
export function getLogsUrl(jobId: string): string {
  if (LOG_STORE === "s3") {
    // Would return S3 presigned URL
    return `/api/flashcards/orchestrator/logs/${jobId}`;
  }

  return path.join(LOGS_DIR, `${jobId}.json`);
}

/**
 * Get log URL for a job (alias for getLogsUrl)
 * Returns a promise for async compatibility
 */
export async function getLogUrl(jobId: string): Promise<string> {
  return getLogsUrl(jobId);
}

// =============================================================================
// PERSISTENCE
// =============================================================================

async function persistLog(log: JobLog): Promise<string> {
  if (LOG_STORE === "s3") {
    return persistToS3(log);
  }

  return persistToLocal(log);
}

function persistToLocal(log: JobLog): string {
  ensureLogsDir();

  const filePath = path.join(LOGS_DIR, `${log.jobId}.json`);

  fs.writeFileSync(filePath, JSON.stringify(log, null, 2), "utf-8");

  console.log(`[JobLogger] Log saved to ${filePath}`);

  return filePath;
}

async function persistToS3(log: JobLog): Promise<string> {
  // S3 implementation would go here
  // For now, fall back to local
  console.warn("[JobLogger] S3 not implemented, falling back to local storage");
  return persistToLocal(log);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Sanitize output to remove potential PII/secrets
 */
function sanitizeOutput(output: unknown): unknown {
  if (typeof output !== "object" || output === null) {
    return output;
  }

  const sanitized = JSON.parse(JSON.stringify(output));

  // List of keys that might contain sensitive data
  const sensitiveKeys = [
    "password", "secret", "token", "api_key", "apiKey",
    "authorization", "auth", "credential", "private",
    "ssn", "social_security", "credit_card", "card_number",
    "email", "phone", "address",
  ];

  function redact(obj: Record<string, unknown>): void {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        obj[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        redact(obj[key] as Record<string, unknown>);
      }
    }
  }

  if (typeof sanitized === "object") {
    redact(sanitized as Record<string, unknown>);
  }

  return sanitized;
}

/**
 * Read a job log from storage
 */
export function readJobLog(jobId: string): JobLog | null {
  const filePath = path.join(LOGS_DIR, `${jobId}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as JobLog;
  } catch (error) {
    console.error(`[JobLogger] Failed to read log for ${jobId}:`, error);
    return null;
  }
}
