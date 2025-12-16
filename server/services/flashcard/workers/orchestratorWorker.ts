/**
 * Orchestrator Worker
 * 
 * BullMQ worker that processes module generation jobs.
 * Consumes jobs from the "orchestrator-jobs" queue.
 * 
 * Usage:
 *   NODE_ENV=production REDIS_URL=redis://localhost:6379 npx tsx server/services/flashcard/workers/orchestratorWorker.ts
 */

import { Worker, Job } from "bullmq";
import {
  initQueueClient,
  closeQueueClient,
  getRedisConnection,
  getQueuePrefix,
  QUEUE_NAMES,
  jobsInProgress,
  jobsCompletedTotal,
  jobsFailedTotal,
  jobDurationSeconds,
  enqueueTranscriptionJob,
  type OrchestratorJobData,
} from "../queue";
import {
  startJobLog,
  addLogEntry,
  storeRawOutput,
  completeJobLog,
  failJobLog,
  getLogsUrl,
} from "../queue/jobLogger";
import { processModuleStandalone } from "../e2e/processModuleStandalone";
import type { ModuleResult } from "../orchestratorTypes";

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);
const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS || "600000", 10); // 10 minutes default
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Step timeouts
const STEP_TIMEOUTS = {
  retrieval: 10000,
  stageA: 30000,
  stageB: 30000,
  verification: 10000,
  postprocess: 5000,
  save: 5000,
};

// =============================================================================
// WORKER STATE
// =============================================================================

let worker: Worker<OrchestratorJobData, ModuleResult> | null = null;
let isShuttingDown = false;

// =============================================================================
// JOB PROCESSOR
// =============================================================================

/**
 * Process a single orchestrator job
 */
async function processJob(
  job: Job<OrchestratorJobData, ModuleResult>
): Promise<ModuleResult> {
  const { jobId, module_id, course_id, module_title, settings } = job.data;
  const startTime = Date.now();

  console.log(`[OrchestratorWorker] Processing job ${jobId} for module ${module_id}`);
  
  // Start job logging
  startJobLog(jobId, module_id);
  jobsInProgress.inc({ type: "orchestrator" });

  try {
    // Update progress: starting
    await job.updateProgress(5);
    addLogEntry(jobId, "info", "retrieval", "Starting chunk retrieval");

    // Process the module using the standalone processor
    // This integrates with retrieveChunks, Stage A/B, verification, etc.
    const result = await processModuleStandalone({
      module_id,
      course_id: course_id || "default-course",
      module_title: module_title || `Module ${module_id}`,
      settings: settings as any,
    });

    // Update progress based on result
    await job.updateProgress(100);

    // Store result in logs
    storeRawOutput(jobId, "moduleResult", result);

    // Handle NEED_MORE_CONTENT - enqueue transcription job
    if (result.status === "NEED_MORE_CONTENT") {
      addLogEntry(jobId, "warn", "need_content", "Module needs more content, queueing transcription");
      
      // Note: In a real implementation, we'd get the file list from the module metadata
      // For now, we just log the need
      console.log(`[OrchestratorWorker] Module ${module_id} needs transcription`);
    }

    // Complete logging
    const logsUrl = await completeJobLog(jobId, result);
    
    // Update metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDurationSeconds.observe({ type: "orchestrator", status: result.status }, duration);
    jobsCompletedTotal.inc({ type: "orchestrator" });
    jobsInProgress.dec({ type: "orchestrator" });

    console.log(`[OrchestratorWorker] Job ${jobId} completed with status: ${result.status}`);

    return {
      ...result,
      logs_url: logsUrl,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    addLogEntry(jobId, "error", "job_error", `Job failed: ${errorMessage}`, {
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Fail logging
    const logsUrl = await failJobLog(jobId, errorMessage);

    // Update metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDurationSeconds.observe({ type: "orchestrator", status: "FAILED" }, duration);
    jobsFailedTotal.inc({ type: "orchestrator" });
    jobsInProgress.dec({ type: "orchestrator" });

    console.error(`[OrchestratorWorker] Job ${jobId} failed:`, errorMessage);

    // Rethrow to let BullMQ handle retry
    throw error;
  }
}

// =============================================================================
// WORKER LIFECYCLE
// =============================================================================

/**
 * Start the orchestrator worker
 */
export async function startWorker(): Promise<void> {
  console.log("[OrchestratorWorker] Starting worker...");
  console.log(`[OrchestratorWorker] Concurrency: ${WORKER_CONCURRENCY}`);
  console.log(`[OrchestratorWorker] Job timeout: ${JOB_TIMEOUT_MS}ms`);

  // Initialize queue client
  initQueueClient({ redisUrl: REDIS_URL });

  const connection = getRedisConnection();
  const prefix = getQueuePrefix();

  // Create worker
  worker = new Worker<OrchestratorJobData, ModuleResult>(
    QUEUE_NAMES.ORCHESTRATOR,
    processJob,
    {
      connection,
      prefix,
      concurrency: WORKER_CONCURRENCY,
      lockDuration: JOB_TIMEOUT_MS,
      stalledInterval: 30000,
    }
  );

  // Event handlers
  worker.on("completed", (job, result) => {
    console.log(`[OrchestratorWorker] Job ${job.id} completed:`, result.status);
  });

  worker.on("failed", (job, error) => {
    console.error(`[OrchestratorWorker] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("[OrchestratorWorker] Worker error:", error);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[OrchestratorWorker] Job ${jobId} stalled`);
  });

  console.log("[OrchestratorWorker] Worker started and listening for jobs");
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker(): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log("[OrchestratorWorker] Shutting down...");

  if (worker) {
    // Close worker (waits for active jobs to complete)
    await worker.close();
    worker = null;
  }

  // Close queue connections
  await closeQueueClient();

  console.log("[OrchestratorWorker] Shutdown complete");
}

// =============================================================================
// SIGNAL HANDLERS
// =============================================================================

function setupSignalHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`[OrchestratorWorker] Received ${signal}, initiating graceful shutdown...`);
    await stopWorker();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", async (error) => {
    console.error("[OrchestratorWorker] Uncaught exception:", error);
    await stopWorker();
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason) => {
    console.error("[OrchestratorWorker] Unhandled rejection:", reason);
    await stopWorker();
    process.exit(1);
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Flashcard Orchestrator Worker");
  console.log("=".repeat(60));

  setupSignalHandlers();
  await startWorker();

  // Keep process alive
  console.log("[OrchestratorWorker] Worker running. Press Ctrl+C to stop.");
}

// Run if executed directly
if (process.argv[1]?.includes("orchestratorWorker")) {
  main().catch((error) => {
    console.error("[OrchestratorWorker] Fatal error:", error);
    process.exit(1);
  });
}

export { processJob };
