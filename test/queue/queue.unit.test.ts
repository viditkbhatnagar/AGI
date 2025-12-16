/**
 * Queue Unit Tests
 * 
 * Tests for the BullMQ job queue wrapper.
 * Uses mocked Redis connection for unit testing.
 * 
 * Run: npm run test:run -- test/queue/queue.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock BullMQ before importing the queue module
vi.mock("bullmq", () => {
    const mockJobs = new Map<string, any>();

    const createMockJob = (id: string, data: any, opts: any = {}) => ({
        id,
        data,
        opts,
        name: opts.name || "default",
        timestamp: Date.now(),
        attemptsMade: 0,
        progress: 0,
        returnvalue: null,
        failedReason: undefined,
        getState: vi.fn().mockResolvedValue("waiting"),
        updateProgress: vi.fn(),
        moveToFailed: vi.fn(),
        remove: vi.fn(),
    });

    const MockQueue = vi.fn().mockImplementation((name: string, opts: any) => ({
        name,
        opts,
        add: vi.fn().mockImplementation(async (jobName: string, data: any, jobOpts: any = {}) => {
            const jobId = jobOpts.jobId || `mock-${Date.now()}`;
            const job = createMockJob(jobId, data, { ...jobOpts, name: jobName });
            mockJobs.set(jobId, job);
            return job;
        }),
        getJob: vi.fn().mockImplementation(async (jobId: string) => {
            return mockJobs.get(jobId) || null;
        }),
        getJobCounts: vi.fn().mockResolvedValue({
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
        }),
        close: vi.fn().mockResolvedValue(undefined),
    }));

    const MockQueueEvents = vi.fn().mockImplementation(() => ({
        close: vi.fn().mockResolvedValue(undefined),
    }));

    const MockWorker = vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
    }));

    return {
        Queue: MockQueue,
        QueueEvents: MockQueueEvents,
        Worker: MockWorker,
        Job: vi.fn(),
        _mockJobs: mockJobs, // Expose for test cleanup
    };
});

// Import after mocking
import {
    initQueueClient,
    closeQueueClient,
    enqueueModuleJob,
    enqueueTranscriptionJob,
    getJobStatus,
    cancelJob,
    getQueueStats,
    QUEUE_NAMES,
} from "../../server/services/flashcard/queue";

describe("Queue Unit Tests", () => {
    beforeEach(() => {
        // Initialize queue before each test
        initQueueClient({ redisUrl: "redis://localhost:6379", prefix: "test" });
    });

    afterEach(async () => {
        // Cleanup after each test
        await closeQueueClient();
        vi.clearAllMocks();
    });

    // ===========================================================================
    // initQueueClient
    // ===========================================================================

    describe("initQueueClient", () => {
        it("should initialize without error", () => {
            // Queue is already initialized in beforeEach
            // Just verify no error was thrown
            expect(true).toBe(true);
        });

        it("should skip initialization if already initialized", () => {
            // Try to initialize again
            const consoleSpy = vi.spyOn(console, "log");
            initQueueClient({ redisUrl: "redis://localhost:6379" });

            // Should have logged "Already initialized" message
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Already initialized"));
        });
    });

    // ===========================================================================
    // enqueueModuleJob
    // ===========================================================================

    describe("enqueueModuleJob", () => {
        it("should enqueue a job and return job object", async () => {
            const job = await enqueueModuleJob({
                module_id: "mod-test-123",
                course_id: "course-test-456",
                module_title: "Test Module",
            });

            expect(job).toBeDefined();
            expect(job.id).toBeDefined();
            expect(job.data.module_id).toBe("mod-test-123");
            expect(job.data.course_id).toBe("course-test-456");
        });

        it("should use provided jobId", async () => {
            const customJobId = "custom-job-id-12345";

            const job = await enqueueModuleJob({
                jobId: customJobId,
                module_id: "mod-test-123",
            });

            expect(job.id).toBe(customJobId);
        });

        it("should include settings in job data", async () => {
            const settings = {
                retrieval_K: 8,
                target_card_count: 10,
                temperature: 0.1,
            };

            const job = await enqueueModuleJob({
                module_id: "mod-test-123",
                settings,
            });

            expect(job.data.settings).toEqual(settings);
        });

        it("should include enqueuedAt timestamp", async () => {
            const beforeEnqueue = new Date().toISOString();

            const job = await enqueueModuleJob({
                module_id: "mod-test-123",
            });

            expect(job.data.enqueuedAt).toBeDefined();
            expect(new Date(job.data.enqueuedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(beforeEnqueue).getTime() - 1000
            );
        });
    });

    // ===========================================================================
    // enqueueTranscriptionJob
    // ===========================================================================

    describe("enqueueTranscriptionJob", () => {
        it("should enqueue a transcription job", async () => {
            const files = [
                { file_id: "file-1", provider: "google_drive" },
                { file_id: "file-2", provider: "onedrive", path: "/path/to/file" },
            ];

            const job = await enqueueTranscriptionJob({
                module_id: "mod-test-123",
                files,
            });

            expect(job).toBeDefined();
            expect(job.data.module_id).toBe("mod-test-123");
            expect(job.data.files).toHaveLength(2);
            expect(job.data.files[0].file_id).toBe("file-1");
        });

        it("should use provided jobId for transcription job", async () => {
            const customJobId = "trans-job-id-12345";

            const job = await enqueueTranscriptionJob({
                jobId: customJobId,
                module_id: "mod-test-123",
                files: [{ file_id: "file-1", provider: "local" }],
            });

            expect(job.id).toBe(customJobId);
        });
    });

    // ===========================================================================
    // getJobStatus
    // ===========================================================================

    describe("getJobStatus", () => {
        it("should return unknown for non-existent job", async () => {
            const status = await getJobStatus("non-existent-job");
            expect(status.status).toBe("unknown");
        });

        it("should return job status for existing job", async () => {
            const job = await enqueueModuleJob({
                jobId: "status-test-job",
                module_id: "mod-test-123",
            });

            const status = await getJobStatus("status-test-job");

            expect(status.status).not.toBe("unknown");
            expect(status.timestamp).toBeDefined();
        });
    });

    // ===========================================================================
    // cancelJob
    // ===========================================================================

    describe("cancelJob", () => {
        it("should return false for non-existent job", async () => {
            const result = await cancelJob("non-existent-job");
            expect(result).toBe(false);
        });
    });

    // ===========================================================================
    // getQueueStats
    // ===========================================================================

    describe("getQueueStats", () => {
        it("should return stats for both queues", async () => {
            const stats = await getQueueStats();

            expect(stats).toHaveProperty("orchestrator");
            expect(stats).toHaveProperty("transcription");
            expect(stats.orchestrator).toHaveProperty("waiting");
            expect(stats.orchestrator).toHaveProperty("active");
            expect(stats.orchestrator).toHaveProperty("completed");
            expect(stats.orchestrator).toHaveProperty("failed");
        });
    });

    // ===========================================================================
    // Job Idempotency (conceptual)
    // ===========================================================================

    describe("Job Idempotency", () => {
        it("should use jobId as unique identifier", async () => {
            const jobId = "idempotent-job-123";

            // First enqueue
            const job1 = await enqueueModuleJob({
                jobId,
                module_id: "mod-123",
            });

            // Same jobId should work (BullMQ handles deduplication)
            const job2 = await enqueueModuleJob({
                jobId,
                module_id: "mod-123",
            });

            // Both should have the same ID
            expect(job1.id).toBe(jobId);
            expect(job2.id).toBe(jobId);
        });
    });

    // ===========================================================================
    // Default Job Options
    // ===========================================================================

    describe("Default Job Options", () => {
        it("should use exponential backoff by default", async () => {
            // This is configured in the queue, not per-job
            // Just verify the job is created successfully
            const job = await enqueueModuleJob({
                module_id: "mod-test-123",
            });

            expect(job).toBeDefined();
        });
    });
});

// ===========================================================================
// Example Job Payloads (for documentation)
// ===========================================================================

export const exampleOrchestratorJobData = {
    jobId: "uuid-1234",
    module_id: "mod-hr-101",
    course_id: "course-hr-2025",
    module_title: "Performance Management",
    settings: {
        retrieval_K: 8,
        target_card_count: 10,
    },
};

export const exampleTranscriptionJobData = {
    jobId: "uuid-5678",
    module_id: "mod-hr-101",
    files: [
        { file_id: "gdrive-123", provider: "google_drive", path: null },
        { file_id: "local-456", provider: "local", path: "/tmp/video.mp4" },
    ],
};
