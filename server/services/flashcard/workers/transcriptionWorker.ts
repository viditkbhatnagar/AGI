/**
 * Transcription Worker
 * 
 * BullMQ worker that processes transcription jobs.
 * Consumes jobs from the "transcription-jobs" queue.
 * 
 * Usage:
 *   NODE_ENV=production REDIS_URL=redis://localhost:6379 npx tsx server/services/flashcard/workers/transcriptionWorker.ts
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
  enqueueModuleJob,
  type TranscriptionJobData,
} from "../queue";
import {
  startJobLog,
  addLogEntry,
  storeRawOutput,
  completeJobLog,
  failJobLog,
} from "../queue/jobLogger";
import { transcribeAndChunk } from "../transcription/transcribeAndChunk";
import { upsertChunks } from "../vectorDb/upsertChunks";
import type { ContextChunk } from "../vectorDb/types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);
const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS || "1800000", 10); // 30 minutes for transcription
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const ENQUEUE_MODULE_JOB_ON_COMPLETE = process.env.ENQUEUE_MODULE_JOB_ON_COMPLETE !== "false";

// =============================================================================
// TYPES
// =============================================================================

interface TranscriptionResult {
  jobId: string;
  module_id: string;
  status: "completed" | "partial" | "failed";
  files_processed: number;
  files_failed: number;
  total_chunks: number;
  errors: string[];
  logs_url?: string;
  module_job_id?: string;
}

// =============================================================================
// WORKER STATE
// =============================================================================

let worker: Worker<TranscriptionJobData, TranscriptionResult> | null = null;
let isShuttingDown = false;

// =============================================================================
// JOB PROCESSOR
// =============================================================================

/**
 * Process a single transcription job
 */
async function processJob(
  job: Job<TranscriptionJobData, TranscriptionResult>
): Promise<TranscriptionResult> {
  const { jobId, module_id, files } = job.data;
  const startTime = Date.now();

  console.log(`[TranscriptionWorker] Processing job ${jobId} for module ${module_id}, ${files.length} files`);
  
  // Start job logging
  startJobLog(jobId, module_id);
  jobsInProgress.inc({ type: "transcription" });

  const result: TranscriptionResult = {
    jobId,
    module_id,
    status: "completed",
    files_processed: 0,
    files_failed: 0,
    total_chunks: 0,
    errors: [],
  };

  try {
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / files.length) * 90);
      
      await job.updateProgress(progress);
      addLogEntry(jobId, "info", "file_start", `Processing file ${i + 1}/${files.length}: ${file.file_id}`);

      try {
        // Check idempotency - skip if already processed
        // In a real implementation, we'd check a checksum/version in the vector DB
        const shouldProcess = await checkShouldProcessFile(file.file_id, module_id);
        
        if (!shouldProcess) {
          addLogEntry(jobId, "info", "file_skip", `File ${file.file_id} already processed, skipping`);
          result.files_processed++;
          continue;
        }

        // Get file URL (download if needed)
        const fileUrl = await getFileUrl(file);
        
        if (!fileUrl) {
          throw new Error(`Could not get URL for file ${file.file_id}`);
        }

        // Transcribe and chunk
        const chunks = await transcribeAndChunk({
          file_url: fileUrl,
          file_meta: {
            file_id: file.file_id,
            file_name: `file_${file.file_id}`,
            provider: file.provider as "google_drive" | "onedrive" | "local",
          },
          module_id,
        });

        addLogEntry(jobId, "info", "file_transcribed", `Transcribed ${chunks.length} chunks from ${file.file_id}`);
        
        // Upsert chunks to vector DB
        await upsertChunks({
          chunks: chunks as ContextChunk[],
          module_id,
        });

        addLogEntry(jobId, "info", "file_upserted", `Upserted ${chunks.length} chunks for ${file.file_id}`);

        result.files_processed++;
        result.total_chunks += chunks.length;

        storeRawOutput(jobId, `file_${file.file_id}`, {
          chunks_count: chunks.length,
          file_id: file.file_id,
        });

      } catch (fileError) {
        const errorMsg = fileError instanceof Error ? fileError.message : String(fileError);
        
        addLogEntry(jobId, "error", "file_error", `Failed to process file ${file.file_id}: ${errorMsg}`);
        
        result.files_failed++;
        result.errors.push(`${file.file_id}: ${errorMsg}`);
      }
    }

    // Determine final status
    if (result.files_failed === files.length) {
      result.status = "failed";
    } else if (result.files_failed > 0) {
      result.status = "partial";
    }

    // Update progress
    await job.updateProgress(95);

    // Optionally enqueue module generation job
    if (ENQUEUE_MODULE_JOB_ON_COMPLETE && result.status !== "failed" && result.total_chunks >= 4) {
      addLogEntry(jobId, "info", "enqueue_module", "Enqueueing module generation job");
      
      try {
        const moduleJob = await enqueueModuleJob({
          module_id,
          settings: { triggered_by: "transcription" },
        });
        
        result.module_job_id = moduleJob.id;
        addLogEntry(jobId, "info", "module_enqueued", `Module job enqueued: ${moduleJob.id}`);
      } catch (enqueueError) {
        addLogEntry(jobId, "warn", "enqueue_failed", `Failed to enqueue module job: ${enqueueError}`);
      }
    }

    await job.updateProgress(100);

    // Complete logging
    const logsUrl = await completeJobLog(jobId, result);
    result.logs_url = logsUrl;

    // Update metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDurationSeconds.observe({ type: "transcription", status: result.status }, duration);
    jobsCompletedTotal.inc({ type: "transcription" });
    jobsInProgress.dec({ type: "transcription" });

    console.log(`[TranscriptionWorker] Job ${jobId} completed: ${result.files_processed}/${files.length} files, ${result.total_chunks} chunks`);

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    addLogEntry(jobId, "error", "job_error", `Job failed: ${errorMessage}`, {
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Fail logging
    const logsUrl = await failJobLog(jobId, errorMessage);

    // Update metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDurationSeconds.observe({ type: "transcription", status: "failed" }, duration);
    jobsFailedTotal.inc({ type: "transcription" });
    jobsInProgress.dec({ type: "transcription" });

    console.error(`[TranscriptionWorker] Job ${jobId} failed:`, errorMessage);

    // Rethrow to let BullMQ handle retry
    throw error;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file should be processed (idempotency check)
 */
async function checkShouldProcessFile(fileId: string, moduleId: string): Promise<boolean> {
  // In a real implementation, we'd check:
  // 1. If chunks exist for this file_id in the vector DB
  // 2. If the file version/checksum has changed
  // For now, always process
  return true;
}

/**
 * Get the URL for a file (download if needed)
 */
async function getFileUrl(file: { file_id: string; provider: string; path?: string | null }): Promise<string | null> {
  // If path is provided, use it directly
  if (file.path) {
    return file.path;
  }

  // In a real implementation, we'd use the Drive/OneDrive downloader
  // to get a signed URL or download the file
  // For now, return null to indicate download needed
  
  console.warn(`[TranscriptionWorker] File ${file.file_id} needs download from ${file.provider}`);
  
  // Mock URL for testing
  if (process.env.MOCK_FILE_URLS === "true") {
    return `https://example.com/files/${file.file_id}`;
  }

  return null;
}

// =============================================================================
// WORKER LIFECYCLE
// =============================================================================

/**
 * Start the transcription worker
 */
export async function startWorker(): Promise<void> {
  console.log("[TranscriptionWorker] Starting worker...");
  console.log(`[TranscriptionWorker] Concurrency: ${WORKER_CONCURRENCY}`);
  console.log(`[TranscriptionWorker] Job timeout: ${JOB_TIMEOUT_MS}ms`);

  // Initialize queue client
  initQueueClient({ redisUrl: REDIS_URL });

  const connection = getRedisConnection();
  const prefix = getQueuePrefix();

  // Create worker
  worker = new Worker<TranscriptionJobData, TranscriptionResult>(
    QUEUE_NAMES.TRANSCRIPTION,
    processJob,
    {
      connection,
      prefix,
      concurrency: WORKER_CONCURRENCY,
      lockDuration: JOB_TIMEOUT_MS,
      stalledInterval: 60000, // Check for stalled jobs every minute
    }
  );

  // Event handlers
  worker.on("completed", (job, result) => {
    console.log(`[TranscriptionWorker] Job ${job.id} completed: ${result.files_processed} files, ${result.total_chunks} chunks`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[TranscriptionWorker] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("[TranscriptionWorker] Worker error:", error);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[TranscriptionWorker] Job ${jobId} stalled`);
  });

  console.log("[TranscriptionWorker] Worker started and listening for jobs");
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker(): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log("[TranscriptionWorker] Shutting down...");

  if (worker) {
    await worker.close();
    worker = null;
  }

  await closeQueueClient();

  console.log("[TranscriptionWorker] Shutdown complete");
}

// =============================================================================
// SIGNAL HANDLERS
// =============================================================================

function setupSignalHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`[TranscriptionWorker] Received ${signal}, initiating graceful shutdown...`);
    await stopWorker();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", async (error) => {
    console.error("[TranscriptionWorker] Uncaught exception:", error);
    await stopWorker();
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason) => {
    console.error("[TranscriptionWorker] Unhandled rejection:", reason);
    await stopWorker();
    process.exit(1);
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Flashcard Transcription Worker");
  console.log("=".repeat(60));

  setupSignalHandlers();
  await startWorker();

  console.log("[TranscriptionWorker] Worker running. Press Ctrl+C to stop.");
}

// Run if executed directly
if (process.argv[1]?.includes("transcriptionWorker")) {
  main().catch((error) => {
    console.error("[TranscriptionWorker] Fatal error:", error);
    process.exit(1);
  });
}

export { processJob };
