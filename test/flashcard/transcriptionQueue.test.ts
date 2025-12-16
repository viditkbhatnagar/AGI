/**
 * Transcription Queue Tests
 * 
 * Unit tests for local job queue stub
 * 
 * Run: npm run test:run -- test/flashcard/transcriptionQueue.test.ts
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  enqueueTranscription,
  getTranscriptionJobStatus,
  updateTranscriptionJob,
  listPendingTranscriptionJobs,
  listJobsForModule,
  clearOldJobs,
  getJobsDirectory,
} from "../../server/services/flashcard/workers/transcriptionQueue";

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe("transcriptionQueue", () => {
  const testModuleId = "test-queue-" + Date.now();
  const createdJobIds: string[] = [];

  afterEach(async () => {
    // Clean up created job files
    const jobsDir = getJobsDirectory();
    if (fs.existsSync(jobsDir)) {
      const files = fs.readdirSync(jobsDir);
      for (const file of files) {
        if (file.includes(testModuleId)) {
          try {
            fs.unlinkSync(path.join(jobsDir, file));
          } catch {
            // Ignore
          }
        }
      }
    }
    createdJobIds.length = 0;
  });

  // ===========================================================================
  // enqueueTranscription
  // ===========================================================================

  describe("enqueueTranscription", () => {
    it("should create a job and return job_id", async () => {
      const moduleId = testModuleId + "-enqueue";
      
      const result = await enqueueTranscription(moduleId);
      createdJobIds.push(result.job_id);

      expect(result.job_id).toBeDefined();
      expect(result.job_id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it("should create job file in jobs directory", async () => {
      const moduleId = testModuleId + "-file";
      
      const { job_id } = await enqueueTranscription(moduleId);
      createdJobIds.push(job_id);

      const jobsDir = getJobsDirectory();
      const files = fs.readdirSync(jobsDir);
      const jobFile = files.find(f => f.includes(moduleId));

      expect(jobFile).toBeDefined();
      expect(jobFile!.endsWith(".json")).toBe(true);
    });

    it("should store files array in job", async () => {
      const moduleId = testModuleId + "-files";
      const files = [
        { file_id: "file1", provider: "google_drive" },
        { file_id: "file2", provider: "onedrive" },
      ];
      
      const { job_id } = await enqueueTranscription(moduleId, files);
      createdJobIds.push(job_id);

      const job = await getTranscriptionJobStatus(job_id);
      
      expect(job).not.toBeNull();
      expect(job!.files).toHaveLength(2);
      expect(job!.files[0].file_id).toBe("file1");
    });

    it("should set initial status to queued", async () => {
      const moduleId = testModuleId + "-status";
      
      const { job_id } = await enqueueTranscription(moduleId);
      createdJobIds.push(job_id);

      const job = await getTranscriptionJobStatus(job_id);
      
      expect(job!.status).toBe("queued");
      expect(job!.created_at).toBeDefined();
    });
  });

  // ===========================================================================
  // getTranscriptionJobStatus
  // ===========================================================================

  describe("getTranscriptionJobStatus", () => {
    it("should return null for non-existent job", async () => {
      const result = await getTranscriptionJobStatus("non-existent-job-id");
      expect(result).toBeNull();
    });

    it("should return job details", async () => {
      const moduleId = testModuleId + "-get";
      
      const { job_id } = await enqueueTranscription(moduleId);
      createdJobIds.push(job_id);

      const job = await getTranscriptionJobStatus(job_id);
      
      expect(job).not.toBeNull();
      expect(job!.job_id).toBe(job_id);
      expect(job!.module_id).toBe(moduleId);
      expect(job!.status).toBe("queued");
    });
  });

  // ===========================================================================
  // updateTranscriptionJob
  // ===========================================================================

  describe("updateTranscriptionJob", () => {
    it("should return null for non-existent job", async () => {
      const result = await updateTranscriptionJob("non-existent", { status: "completed" });
      expect(result).toBeNull();
    });

    it("should update job status", async () => {
      const moduleId = testModuleId + "-update";
      
      const { job_id } = await enqueueTranscription(moduleId);
      createdJobIds.push(job_id);

      const updated = await updateTranscriptionJob(job_id, { status: "processing" });
      
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("processing");
      expect(updated!.updated_at).not.toBe(updated!.created_at);
    });

    it("should update job with result", async () => {
      const moduleId = testModuleId + "-result";
      
      const { job_id } = await enqueueTranscription(moduleId);
      createdJobIds.push(job_id);

      const updated = await updateTranscriptionJob(job_id, {
        status: "completed",
        result: { chunks_created: 10, duration_ms: 5000 },
      });
      
      expect(updated!.status).toBe("completed");
      expect(updated!.result).toBeDefined();
      expect(updated!.result!.chunks_created).toBe(10);
    });

    it("should update job with error", async () => {
      const moduleId = testModuleId + "-error";
      
      const { job_id } = await enqueueTranscription(moduleId);
      createdJobIds.push(job_id);

      const updated = await updateTranscriptionJob(job_id, {
        status: "failed",
        error: "Transcription failed: file not found",
      });
      
      expect(updated!.status).toBe("failed");
      expect(updated!.error).toContain("file not found");
    });
  });

  // ===========================================================================
  // listPendingTranscriptionJobs
  // ===========================================================================

  describe("listPendingTranscriptionJobs", () => {
    it("should return only queued jobs", async () => {
      const moduleId = testModuleId + "-pending";
      
      // Create multiple jobs
      const { job_id: job1 } = await enqueueTranscription(moduleId + "-1");
      const { job_id: job2 } = await enqueueTranscription(moduleId + "-2");
      const { job_id: job3 } = await enqueueTranscription(moduleId + "-3");
      createdJobIds.push(job1, job2, job3);

      // Mark one as completed
      await updateTranscriptionJob(job2, { status: "completed" });

      const pending = await listPendingTranscriptionJobs();
      const testPending = pending.filter(j => j.module_id.includes(testModuleId));
      
      expect(testPending.length).toBe(2);
      expect(testPending.every(j => j.status === "queued")).toBe(true);
    });

    it("should sort by created_at ascending", async () => {
      const moduleId = testModuleId + "-sort";
      
      const { job_id: job1 } = await enqueueTranscription(moduleId + "-a");
      await new Promise(r => setTimeout(r, 10));
      const { job_id: job2 } = await enqueueTranscription(moduleId + "-b");
      createdJobIds.push(job1, job2);

      const pending = await listPendingTranscriptionJobs();
      const testPending = pending.filter(j => j.module_id.includes(moduleId));
      
      expect(testPending.length).toBe(2);
      const time1 = new Date(testPending[0].created_at).getTime();
      const time2 = new Date(testPending[1].created_at).getTime();
      expect(time1).toBeLessThanOrEqual(time2);
    });
  });

  // ===========================================================================
  // listJobsForModule
  // ===========================================================================

  describe("listJobsForModule", () => {
    it("should return empty array for module with no jobs", async () => {
      const result = await listJobsForModule("no-jobs-module");
      expect(result).toEqual([]);
    });

    it("should return all jobs for a module", async () => {
      const moduleId = testModuleId + "-list";
      
      const { job_id: job1 } = await enqueueTranscription(moduleId);
      const { job_id: job2 } = await enqueueTranscription(moduleId);
      createdJobIds.push(job1, job2);

      const jobs = await listJobsForModule(moduleId);
      
      expect(jobs.length).toBe(2);
      expect(jobs.every(j => j.module_id === moduleId)).toBe(true);
    });

    it("should sort by created_at descending (most recent first)", async () => {
      const moduleId = testModuleId + "-listsort";
      
      const { job_id: job1 } = await enqueueTranscription(moduleId);
      await new Promise(r => setTimeout(r, 10));
      const { job_id: job2 } = await enqueueTranscription(moduleId);
      createdJobIds.push(job1, job2);

      const jobs = await listJobsForModule(moduleId);
      
      const time1 = new Date(jobs[0].created_at).getTime();
      const time2 = new Date(jobs[1].created_at).getTime();
      expect(time1).toBeGreaterThanOrEqual(time2);
    });
  });

  // ===========================================================================
  // clearOldJobs
  // ===========================================================================

  describe("clearOldJobs", () => {
    it("should not delete recent jobs", async () => {
      const moduleId = testModuleId + "-clear";
      
      const { job_id } = await enqueueTranscription(moduleId);
      createdJobIds.push(job_id);
      await updateTranscriptionJob(job_id, { status: "completed" });

      // Try to clear jobs older than 24 hours
      const deleted = await clearOldJobs(24);
      
      // Our job is recent, should not be deleted
      const job = await getTranscriptionJobStatus(job_id);
      expect(job).not.toBeNull();
    });
  });
});
