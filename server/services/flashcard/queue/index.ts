/**
 * BullMQ Job Queue Wrapper
 * 
 * Provides job queue functionality for the Flashcard Orchestrator pipeline.
 * Supports orchestrator jobs (module generation) and transcription jobs.
 */

import { Queue, Job, QueueEvents, Worker } from "bullmq";
import { Counter, Histogram, Gauge, Registry } from "prom-client";

// =============================================================================
// TYPES
// =============================================================================

export interface QueueClientOptions {
  redisUrl?: string;
  prefix?: string;
}

export interface EnqueueModuleJobParams {
  jobId?: string;
  module_id: string;
  course_id?: string;
  module_title?: string;
  priority?: number;
  settings?: Record<string, unknown>;
}

export interface EnqueueTranscriptionJobParams {
  jobId?: string;
  module_id: string;
  files: Array<{
    file_id: string;
    provider: string;
    path?: string | null;
  }>;
  priority?: number;
}

export interface JobStatusResult {
  status: "queued" | "active" | "completed" | "failed" | "delayed" | "waiting" | "unknown";
  progress?: number;
  result?: unknown;
  failedReason?: string;
  attemptsMade?: number;
  timestamp?: number;
}

export interface OrchestratorJobData {
  jobId: string;
  module_id: string;
  course_id?: string;
  module_title?: string;
  settings?: Record<string, unknown>;
  enqueuedAt: string;
}

export interface TranscriptionJobData {
  jobId: string;
  module_id: string;
  files: Array<{
    file_id: string;
    provider: string;
    path?: string | null;
  }>;
  enqueuedAt: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DEFAULT_PREFIX = process.env.QUEUE_PREFIX || "flashcard";
const DEFAULT_JOB_ATTEMPTS = parseInt(process.env.JOB_ATTEMPTS || "3", 10);
const DEFAULT_BACKOFF_DELAY = 2000;

export const QUEUE_NAMES = {
  ORCHESTRATOR: "orchestrator-jobs",
  TRANSCRIPTION: "transcription-jobs",
} as const;

// =============================================================================
// QUEUE CLIENT STATE
// =============================================================================

let orchestratorQueue: Queue<OrchestratorJobData> | null = null;
let transcriptionQueue: Queue<TranscriptionJobData> | null = null;
let orchestratorQueueEvents: QueueEvents | null = null;
let transcriptionQueueEvents: QueueEvents | null = null;
let redisConnection: { host: string; port: number } | null = null;
let queuePrefix: string = DEFAULT_PREFIX;
let isInitialized = false;

// =============================================================================
// PROMETHEUS METRICS
// =============================================================================

export const metricsRegistry = new Registry();

export const jobsEnqueuedTotal = new Counter({
  name: "flashcard_jobs_enqueued_total",
  help: "Total number of jobs enqueued",
  labelNames: ["type"] as const,
  registers: [metricsRegistry],
});

export const jobsFailedTotal = new Counter({
  name: "flashcard_jobs_failed_total",
  help: "Total number of failed jobs",
  labelNames: ["type"] as const,
  registers: [metricsRegistry],
});

export const jobsCompletedTotal = new Counter({
  name: "flashcard_jobs_completed_total",
  help: "Total number of completed jobs",
  labelNames: ["type"] as const,
  registers: [metricsRegistry],
});

export const jobsInProgress = new Gauge({
  name: "flashcard_jobs_in_progress",
  help: "Number of jobs currently in progress",
  labelNames: ["type"] as const,
  registers: [metricsRegistry],
});

export const jobDurationSeconds = new Histogram({
  name: "flashcard_job_duration_seconds",
  help: "Job duration in seconds",
  labelNames: ["type", "status"] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [metricsRegistry],
});

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Parse Redis URL into connection options
 */
function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port || "6379", 10),
      password: parsed.password || undefined,
    };
  } catch {
    // Fallback for simple host:port format
    const [host, portStr] = url.replace("redis://", "").split(":");
    return {
      host: host || "localhost",
      port: parseInt(portStr || "6379", 10),
    };
  }
}

/**
 * Initialize the queue client. Must be called before using queue functions.
 */
export function initQueueClient(options?: QueueClientOptions): void {
  if (isInitialized) {
    console.log("[Queue] Already initialized, skipping");
    return;
  }

  const redisUrl = options?.redisUrl || DEFAULT_REDIS_URL;
  queuePrefix = options?.prefix || DEFAULT_PREFIX;
  redisConnection = parseRedisUrl(redisUrl);

  const connectionOpts = {
    host: redisConnection.host,
    port: redisConnection.port,
  };

  console.log(`[Queue] Initializing with Redis at ${redisConnection.host}:${redisConnection.port}, prefix: ${queuePrefix}`);

  // Create queues
  orchestratorQueue = new Queue<OrchestratorJobData>(QUEUE_NAMES.ORCHESTRATOR, {
    connection: connectionOpts,
    prefix: queuePrefix,
    defaultJobOptions: {
      attempts: DEFAULT_JOB_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: DEFAULT_BACKOFF_DELAY,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  transcriptionQueue = new Queue<TranscriptionJobData>(QUEUE_NAMES.TRANSCRIPTION, {
    connection: connectionOpts,
    prefix: queuePrefix,
    defaultJobOptions: {
      attempts: DEFAULT_JOB_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: DEFAULT_BACKOFF_DELAY,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  });

  // Create queue events for monitoring
  orchestratorQueueEvents = new QueueEvents(QUEUE_NAMES.ORCHESTRATOR, {
    connection: connectionOpts,
    prefix: queuePrefix,
  });

  transcriptionQueueEvents = new QueueEvents(QUEUE_NAMES.TRANSCRIPTION, {
    connection: connectionOpts,
    prefix: queuePrefix,
  });

  isInitialized = true;
  console.log("[Queue] Initialization complete");
}

/**
 * Get the Redis connection options (for workers)
 */
export function getRedisConnection(): { host: string; port: number } {
  if (!redisConnection) {
    throw new Error("[Queue] Not initialized. Call initQueueClient() first.");
  }
  return redisConnection;
}

/**
 * Get the queue prefix
 */
export function getQueuePrefix(): string {
  return queuePrefix;
}

// =============================================================================
// ENQUEUE FUNCTIONS
// =============================================================================

/**
 * Enqueue a module generation job.
 * 
 * @param params - Job parameters
 * @returns The BullMQ Job object
 */
export async function enqueueModuleJob(
  params: EnqueueModuleJobParams
): Promise<Job<OrchestratorJobData>> {
  if (!orchestratorQueue) {
    throw new Error("[Queue] Not initialized. Call initQueueClient() first.");
  }

  const jobId = params.jobId || generateJobId("orch");

  const jobData: OrchestratorJobData = {
    jobId,
    module_id: params.module_id,
    course_id: params.course_id,
    module_title: params.module_title,
    settings: params.settings,
    enqueuedAt: new Date().toISOString(),
  };

  const job = await orchestratorQueue.add(
    "process-module",
    jobData,
    {
      jobId, // Ensures idempotency - same jobId won't create duplicate
      priority: params.priority || 0,
    }
  );

  jobsEnqueuedTotal.inc({ type: "orchestrator" });

  console.log(`[Queue] Enqueued orchestrator job: ${jobId} for module ${params.module_id}`);

  return job;
}

/**
 * Enqueue a transcription job.
 * 
 * @param params - Job parameters
 * @returns The BullMQ Job object
 */
export async function enqueueTranscriptionJob(
  params: EnqueueTranscriptionJobParams
): Promise<Job<TranscriptionJobData>> {
  if (!transcriptionQueue) {
    throw new Error("[Queue] Not initialized. Call initQueueClient() first.");
  }

  const jobId = params.jobId || generateJobId("trans");

  const jobData: TranscriptionJobData = {
    jobId,
    module_id: params.module_id,
    files: params.files,
    enqueuedAt: new Date().toISOString(),
  };

  const job = await transcriptionQueue.add(
    "transcribe-files",
    jobData,
    {
      jobId,
      priority: params.priority || 0,
    }
  );

  jobsEnqueuedTotal.inc({ type: "transcription" });

  console.log(`[Queue] Enqueued transcription job: ${jobId} for module ${params.module_id}, ${params.files.length} files`);

  return job;
}

// =============================================================================
// JOB STATUS & MANAGEMENT
// =============================================================================

/**
 * Get the status of a job by ID.
 * Searches both orchestrator and transcription queues.
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResult> {
  if (!orchestratorQueue || !transcriptionQueue) {
    throw new Error("[Queue] Not initialized. Call initQueueClient() first.");
  }

  // Try orchestrator queue first
  let job = await orchestratorQueue.getJob(jobId);

  // If not found, try transcription queue
  if (!job) {
    job = await transcriptionQueue.getJob(jobId);
  }

  if (!job) {
    return { status: "unknown" };
  }

  const state = await job.getState();

  return {
    status: mapJobState(state),
    progress: job.progress as number | undefined,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
  };
}

/**
 * Get the raw BullMQ Job object by ID.
 * Returns null if not found.
 */
export async function getJobById(jobId: string): Promise<{
  id: string;
  state: string;
  progress?: number;
  returnvalue?: unknown;
  failedReason?: string;
  timestamp: number;
  data: unknown;
} | null> {
  if (!orchestratorQueue || !transcriptionQueue) {
    throw new Error("[Queue] Not initialized. Call initQueueClient() first.");
  }

  // Try orchestrator queue first
  let job = await orchestratorQueue.getJob(jobId);

  // If not found, try transcription queue
  if (!job) {
    job = await transcriptionQueue.getJob(jobId);
  }

  if (!job) {
    return null;
  }

  const state = await job.getState();

  return {
    id: job.id || jobId,
    state,
    progress: job.progress as number | undefined,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    data: job.data,
  };
}

/**
 * Cancel a job by ID.
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  if (!orchestratorQueue || !transcriptionQueue) {
    throw new Error("[Queue] Not initialized. Call initQueueClient() first.");
  }

  // Try orchestrator queue first
  let job = await orchestratorQueue.getJob(jobId);

  if (!job) {
    job = await transcriptionQueue.getJob(jobId);
  }

  if (!job) {
    return false;
  }

  const state = await job.getState();

  // Can only cancel waiting or delayed jobs
  if (state === "waiting" || state === "delayed") {
    await job.remove();
    console.log(`[Queue] Cancelled job: ${jobId}`);
    return true;
  }

  console.log(`[Queue] Cannot cancel job ${jobId} in state: ${state}`);
  return false;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  orchestrator: { waiting: number; active: number; completed: number; failed: number };
  transcription: { waiting: number; active: number; completed: number; failed: number };
}> {
  if (!orchestratorQueue || !transcriptionQueue) {
    throw new Error("[Queue] Not initialized. Call initQueueClient() first.");
  }

  const [orchCounts, transCounts] = await Promise.all([
    orchestratorQueue.getJobCounts(),
    transcriptionQueue.getJobCounts(),
  ]);

  return {
    orchestrator: {
      waiting: orchCounts.waiting || 0,
      active: orchCounts.active || 0,
      completed: orchCounts.completed || 0,
      failed: orchCounts.failed || 0,
    },
    transcription: {
      waiting: transCounts.waiting || 0,
      active: transCounts.active || 0,
      completed: transCounts.completed || 0,
      failed: transCounts.failed || 0,
    },
  };
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Close all queue connections gracefully.
 */
export async function closeQueueClient(): Promise<void> {
  console.log("[Queue] Closing connections...");

  const closePromises: Promise<void>[] = [];

  if (orchestratorQueue) {
    closePromises.push(orchestratorQueue.close());
  }
  if (transcriptionQueue) {
    closePromises.push(transcriptionQueue.close());
  }
  if (orchestratorQueueEvents) {
    closePromises.push(orchestratorQueueEvents.close());
  }
  if (transcriptionQueueEvents) {
    closePromises.push(transcriptionQueueEvents.close());
  }

  await Promise.all(closePromises);

  orchestratorQueue = null;
  transcriptionQueue = null;
  orchestratorQueueEvents = null;
  transcriptionQueueEvents = null;
  redisConnection = null;
  isInitialized = false;

  console.log("[Queue] All connections closed");
}

// =============================================================================
// HELPERS
// =============================================================================

function generateJobId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

function mapJobState(state: string): JobStatusResult["status"] {
  switch (state) {
    case "waiting":
    case "prioritized":
      return "queued";
    case "active":
      return "active";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "delayed":
      return "delayed";
    default:
      return "unknown";
  }
}

/**
 * Get Prometheus metrics as string
 */
export async function getMetricsString(): Promise<string> {
  return metricsRegistry.metrics();
}

// =============================================================================
// EXPORTS FOR WORKERS
// =============================================================================

export { Queue, Worker, Job, QueueEvents } from "bullmq";
