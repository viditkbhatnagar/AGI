/**
 * Transcription Queue - Local Job Queue Stub
 * 
 * Simple in-memory job queue that writes transcription jobs to local files.
 * For production, replace with BullMQ + Redis.
 */

import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

// Generate UUID v4 using crypto
function uuidv4(): string {
  return crypto.randomUUID();
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const JOBS_DIR = path.join(process.cwd(), "server", "tmp", "jobs");

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptionJobFile {
  file_id: string;
  provider: string;
  file_url?: string;
  file_name?: string;
}

export interface TranscriptionJob {
  job_id: string;
  module_id: string;
  files: TranscriptionJobFile[];
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  error?: string;
  result?: {
    chunks_created: number;
    duration_ms: number;
  };
}

// In-memory queue for quick access
const jobQueue: Map<string, TranscriptionJob> = new Map();

// =============================================================================
// ENSURE DIRECTORY EXISTS
// =============================================================================

function ensureJobsDir(): void {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
}

// =============================================================================
// ENQUEUE TRANSCRIPTION JOB
// =============================================================================

/**
 * Enqueue a transcription job for a module.
 * 
 * @param module_id - Module identifier
 * @param files - Optional array of files to transcribe
 * @returns Promise with job_id
 * 
 * @example
 * ```typescript
 * const { job_id } = await enqueueTranscription("mod-hr-101", [
 *   { file_id: "file123", provider: "google_drive" }
 * ]);
 * ```
 */
export async function enqueueTranscription(
  module_id: string,
  files?: TranscriptionJobFile[]
): Promise<{ job_id: string }> {
  ensureJobsDir();
  
  const job_id = uuidv4();
  const timestamp = Date.now();
  
  const job: TranscriptionJob = {
    job_id,
    module_id,
    files: files || [],
    status: "queued",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Save to in-memory queue
  jobQueue.set(job_id, job);
  
  // Persist to file
  const filename = `transcription-${module_id}-${timestamp}.json`;
  const filePath = path.join(JOBS_DIR, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(job, null, 2), "utf-8");
  
  console.log(`[TranscriptionQueue] Enqueued job ${job_id} for module ${module_id}`);
  
  return { job_id };
}

// =============================================================================
// GET JOB STATUS
// =============================================================================

/**
 * Get the status of a transcription job.
 * 
 * @param job_id - Job identifier
 * @returns The job object or null if not found
 */
export async function getTranscriptionJobStatus(
  job_id: string
): Promise<TranscriptionJob | null> {
  // Check in-memory first
  if (jobQueue.has(job_id)) {
    return jobQueue.get(job_id)!;
  }
  
  // Try to find in files
  ensureJobsDir();
  const files = fs.readdirSync(JOBS_DIR);
  
  for (const filename of files) {
    if (!filename.startsWith("transcription-") || !filename.endsWith(".json")) {
      continue;
    }
    
    const filePath = path.join(JOBS_DIR, filename);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const job = JSON.parse(content) as TranscriptionJob;
      
      if (job.job_id === job_id) {
        jobQueue.set(job_id, job); // Cache it
        return job;
      }
    } catch {
      // Skip invalid files
    }
  }
  
  return null;
}

// =============================================================================
// UPDATE JOB STATUS
// =============================================================================

/**
 * Update the status of a transcription job.
 * 
 * @param job_id - Job identifier
 * @param updates - Partial job updates
 * @returns Updated job or null if not found
 */
export async function updateTranscriptionJob(
  job_id: string,
  updates: Partial<Pick<TranscriptionJob, "status" | "error" | "result">>
): Promise<TranscriptionJob | null> {
  const job = await getTranscriptionJobStatus(job_id);
  
  if (!job) {
    return null;
  }
  
  const updatedJob: TranscriptionJob = {
    ...job,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  // Update in-memory
  jobQueue.set(job_id, updatedJob);
  
  // Find and update file
  ensureJobsDir();
  const files = fs.readdirSync(JOBS_DIR);
  
  for (const filename of files) {
    if (!filename.includes(job.module_id)) continue;
    
    const filePath = path.join(JOBS_DIR, filename);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const fileJob = JSON.parse(content) as TranscriptionJob;
      
      if (fileJob.job_id === job_id) {
        fs.writeFileSync(filePath, JSON.stringify(updatedJob, null, 2), "utf-8");
        break;
      }
    } catch {
      // Skip
    }
  }
  
  return updatedJob;
}

// =============================================================================
// LIST PENDING JOBS
// =============================================================================

/**
 * List all pending transcription jobs.
 * 
 * @returns Array of queued jobs
 */
export async function listPendingTranscriptionJobs(): Promise<TranscriptionJob[]> {
  ensureJobsDir();
  const files = fs.readdirSync(JOBS_DIR);
  const jobs: TranscriptionJob[] = [];
  
  for (const filename of files) {
    if (!filename.startsWith("transcription-") || !filename.endsWith(".json")) {
      continue;
    }
    
    const filePath = path.join(JOBS_DIR, filename);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const job = JSON.parse(content) as TranscriptionJob;
      
      if (job.status === "queued") {
        jobs.push(job);
        jobQueue.set(job.job_id, job);
      }
    } catch {
      // Skip invalid files
    }
  }
  
  return jobs.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

// =============================================================================
// LIST JOBS FOR MODULE
// =============================================================================

/**
 * List all transcription jobs for a module.
 * 
 * @param module_id - Module identifier
 * @returns Array of jobs for the module
 */
export async function listJobsForModule(
  module_id: string
): Promise<TranscriptionJob[]> {
  ensureJobsDir();
  const files = fs.readdirSync(JOBS_DIR);
  const jobs: TranscriptionJob[] = [];
  
  for (const filename of files) {
    if (!filename.includes(module_id) || !filename.endsWith(".json")) {
      continue;
    }
    
    const filePath = path.join(JOBS_DIR, filename);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const job = JSON.parse(content) as TranscriptionJob;
      jobs.push(job);
    } catch {
      // Skip invalid files
    }
  }
  
  return jobs.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// =============================================================================
// CLEAR COMPLETED JOBS
// =============================================================================

/**
 * Clear completed or failed jobs older than specified hours.
 * 
 * @param olderThanHours - Delete jobs older than this many hours (default: 24)
 * @returns Number of jobs deleted
 */
export async function clearOldJobs(olderThanHours: number = 24): Promise<number> {
  ensureJobsDir();
  const files = fs.readdirSync(JOBS_DIR);
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  let deleted = 0;
  
  for (const filename of files) {
    if (!filename.startsWith("transcription-") || !filename.endsWith(".json")) {
      continue;
    }
    
    const filePath = path.join(JOBS_DIR, filename);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const job = JSON.parse(content) as TranscriptionJob;
      
      const jobTime = new Date(job.created_at).getTime();
      
      if ((job.status === "completed" || job.status === "failed") && jobTime < cutoff) {
        fs.unlinkSync(filePath);
        jobQueue.delete(job.job_id);
        deleted++;
      }
    } catch {
      // Skip
    }
  }
  
  return deleted;
}

// =============================================================================
// GET JOBS DIRECTORY
// =============================================================================

export function getJobsDirectory(): string {
  return JOBS_DIR;
}
