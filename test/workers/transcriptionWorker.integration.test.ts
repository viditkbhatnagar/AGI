/**
 * Transcription Worker Integration Tests
 * 
 * Integration tests that run against a real Redis instance.
 * Requires Redis to be running locally.
 * 
 * Prerequisites:
 *   docker compose -f docker-compose.redis.yml up -d
 * 
 * Run:
 *   npm run test:run -- test/workers/transcriptionWorker.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { Worker, Job } from "bullmq";

// Mock transcribeAndChunk
vi.mock("../../server/services/flashcard/transcription/transcribeAndChunk", () => ({
    transcribeAndChunk: vi.fn().mockImplementation(async ({ file_url, file_meta, module_id }) => {
        // Simulate transcription returning chunks
        return [
            {
                chunk_id: `chunk_${file_meta.file_id}_1`,
                source_file: file_meta.file_name,
                provider: file_meta.provider,
                text: "This is the first chunk of transcribed content.",
                tokens_est: 50,
                heading: "Section 1",
            },
            {
                chunk_id: `chunk_${file_meta.file_id}_2`,
                source_file: file_meta.file_name,
                provider: file_meta.provider,
                text: "This is the second chunk of transcribed content.",
                tokens_est: 48,
                heading: "Section 2",
            },
        ];
    }),
}));

// Mock upsertChunks
vi.mock("../../server/services/flashcard/vectorDb/upsertChunks", () => ({
    upsertChunks: vi.fn().mockResolvedValue({ inserted: 2, updated: 0 }),
}));

// Import mocks for verification
import { transcribeAndChunk } from "../../server/services/flashcard/transcription/transcribeAndChunk";
import { upsertChunks } from "../../server/services/flashcard/vectorDb/upsertChunks";

import {
    initQueueClient,
    closeQueueClient,
    enqueueTranscriptionJob,
    getJobStatus,
    QUEUE_NAMES,
    getRedisConnection,
    getQueuePrefix,
} from "../../server/services/flashcard/queue";
import type { TranscriptionJobData } from "../../server/services/flashcard/queue";

// Test configuration
const REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379";
const TEST_PREFIX = "test-trans-" + Date.now();
const WORKER_PROCESS_TIMEOUT = 15000;

// Result type for transcription worker
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

describe("Transcription Worker Integration Tests", () => {
    let testWorker: Worker<TranscriptionJobData, TranscriptionResult> | null = null;

    // ==========================================================================
    // Setup & Teardown
    // ==========================================================================

    beforeAll(async () => {
        initQueueClient({ redisUrl: REDIS_URL, prefix: TEST_PREFIX });
        console.log(`[Test] Initialized transcription queue with prefix: ${TEST_PREFIX}`);
    });

    afterAll(async () => {
        if (testWorker) {
            await testWorker.close();
            testWorker = null;
        }
        await closeQueueClient();
        console.log("[Test] Cleanup complete");
    });

    afterEach(async () => {
        if (testWorker) {
            await testWorker.close();
            testWorker = null;
        }
        vi.clearAllMocks();
    });

    // ==========================================================================
    // Helper: Create test worker
    // ==========================================================================

    function createTestWorker(
        processor: (job: Job<TranscriptionJobData>) => Promise<TranscriptionResult>
    ): Worker<TranscriptionJobData, TranscriptionResult> {
        const connection = getRedisConnection();
        const prefix = getQueuePrefix();

        return new Worker<TranscriptionJobData, TranscriptionResult>(
            QUEUE_NAMES.TRANSCRIPTION,
            processor,
            {
                connection,
                prefix,
                concurrency: 1,
            }
        );
    }

    // ==========================================================================
    // Tests
    // ==========================================================================

    describe("Job Enqueue & Process", () => {
        it("should enqueue and process a transcription job", async () => {
            const jobId = `test-trans-${Date.now()}`;
            let processedData: TranscriptionJobData | undefined;

            const jobCompleted = new Promise<TranscriptionResult>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Job processing timed out"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => {
                    processedData = job.data;

                    // Simulate successful transcription
                    const result: TranscriptionResult = {
                        jobId: job.data.jobId,
                        module_id: job.data.module_id,
                        status: "completed",
                        files_processed: job.data.files.length,
                        files_failed: 0,
                        total_chunks: job.data.files.length * 2, // 2 chunks per file
                        errors: [],
                    };

                    return result;
                });

                testWorker.on("completed", (job, result) => {
                    clearTimeout(timeout);
                    resolve(result);
                });

                testWorker.on("failed", (job, error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            // Enqueue the job
            const job = await enqueueTranscriptionJob({
                jobId,
                module_id: "test-trans-module",
                files: [
                    { file_id: "file-001", provider: "google_drive" },
                    { file_id: "file-002", provider: "local", path: "/tmp/video.mp4" },
                ],
            });

            expect(job.id).toBe(jobId);
            expect(job.data.files).toHaveLength(2);

            // Wait for completion
            const result = await jobCompleted;

            expect(processedData?.jobId).toBe(jobId);
            expect(result.status).toBe("completed");
            expect(result.files_processed).toBe(2);
            expect(result.total_chunks).toBe(4);
        }, WORKER_PROCESS_TIMEOUT + 5000);

        it("should handle partial failures", async () => {
            const jobId = `test-partial-${Date.now()}`;

            const jobCompleted = new Promise<TranscriptionResult>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => {
                    // Simulate one file succeeding, one failing
                    return {
                        jobId: job.data.jobId,
                        module_id: job.data.module_id,
                        status: "partial",
                        files_processed: 1,
                        files_failed: 1,
                        total_chunks: 2,
                        errors: ["file-002: Download failed"],
                    };
                });

                testWorker.on("completed", (job, result) => {
                    clearTimeout(timeout);
                    resolve(result);
                });
            });

            await enqueueTranscriptionJob({
                jobId,
                module_id: "test-partial-module",
                files: [
                    { file_id: "file-001", provider: "google_drive" },
                    { file_id: "file-002", provider: "onedrive" },
                ],
            });

            const result = await jobCompleted;

            expect(result.status).toBe("partial");
            expect(result.files_processed).toBe(1);
            expect(result.files_failed).toBe(1);
            expect(result.errors).toHaveLength(1);
        }, WORKER_PROCESS_TIMEOUT + 5000);
    });

    describe("Transcription Flow", () => {
        it("should call transcribeAndChunk for each file", async () => {
            const jobId = `test-flow-${Date.now()}`;
            const files = [
                { file_id: "flow-file-1", provider: "google_drive" },
                { file_id: "flow-file-2", provider: "local", path: "/tmp/audio.mp3" },
            ];

            const jobCompleted = new Promise<TranscriptionResult>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => {
                    // Call the mocked transcribeAndChunk for each file
                    const allChunks = [];

                    for (const file of job.data.files) {
                        const chunks = await transcribeAndChunk({
                            file_url: file.path || `https://example.com/${file.file_id}`,
                            file_meta: {
                                file_id: file.file_id,
                                file_name: `file_${file.file_id}`,
                                provider: file.provider as "google_drive" | "onedrive" | "local",
                            },
                            module_id: job.data.module_id,
                        });
                        allChunks.push(...chunks);
                    }

                    // Call upsertChunks
                    await upsertChunks({
                        chunks: allChunks,
                        module_id: job.data.module_id,
                    });

                    return {
                        jobId: job.data.jobId,
                        module_id: job.data.module_id,
                        status: "completed",
                        files_processed: files.length,
                        files_failed: 0,
                        total_chunks: allChunks.length,
                        errors: [],
                    };
                });

                testWorker.on("completed", (job, result) => {
                    clearTimeout(timeout);
                    resolve(result);
                });
            });

            await enqueueTranscriptionJob({
                jobId,
                module_id: "flow-test-module",
                files,
            });

            const result = await jobCompleted;

            // Verify mocks were called
            expect(transcribeAndChunk).toHaveBeenCalledTimes(2);
            expect(upsertChunks).toHaveBeenCalledTimes(1);

            // Verify result
            expect(result.status).toBe("completed");
            expect(result.total_chunks).toBe(4); // 2 chunks per file
        }, WORKER_PROCESS_TIMEOUT + 5000);
    });

    describe("Job Priority", () => {
        it("should respect priority when processing jobs", async () => {
            const processedOrder: string[] = [];

            const jobsCompleted = new Promise<void>((resolve, reject) => {
                let completed = 0;
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout"));
                }, WORKER_PROCESS_TIMEOUT * 2);

                testWorker = createTestWorker(async (job) => {
                    // Small delay to simulate processing
                    await new Promise(r => setTimeout(r, 50));
                    processedOrder.push(job.data.jobId);

                    return {
                        jobId: job.data.jobId,
                        module_id: job.data.module_id,
                        status: "completed",
                        files_processed: 1,
                        files_failed: 0,
                        total_chunks: 2,
                        errors: [],
                    };
                });

                testWorker.on("completed", () => {
                    completed++;
                    if (completed >= 3) {
                        clearTimeout(timeout);
                        resolve();
                    }
                });
            });

            // Enqueue jobs with different priorities (lower number = higher priority)
            await enqueueTranscriptionJob({
                jobId: "low-priority",
                module_id: "mod-low",
                files: [{ file_id: "f1", provider: "local" }],
                priority: 10,
            });

            await enqueueTranscriptionJob({
                jobId: "high-priority",
                module_id: "mod-high",
                files: [{ file_id: "f2", provider: "local" }],
                priority: 1,
            });

            await enqueueTranscriptionJob({
                jobId: "medium-priority",
                module_id: "mod-med",
                files: [{ file_id: "f3", provider: "local" }],
                priority: 5,
            });

            await jobsCompleted;

            // Higher priority (lower number) should be processed first
            expect(processedOrder[0]).toBe("high-priority");
        }, WORKER_PROCESS_TIMEOUT * 2 + 5000);
    });

    describe("Error Handling", () => {
        it("should handle transcription errors gracefully", async () => {
            const jobId = `test-error-${Date.now()}`;
            const errorMessage = "Transcription service unavailable";

            const jobFailed = new Promise<Error>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => {
                    throw new Error(errorMessage);
                });

                testWorker.on("failed", (job, error) => {
                    clearTimeout(timeout);
                    resolve(error);
                });
            });

            await enqueueTranscriptionJob({
                jobId,
                module_id: "error-test-module",
                files: [{ file_id: "error-file", provider: "google_drive" }],
            });

            const error = await jobFailed;

            expect(error.message).toBe(errorMessage);
        }, WORKER_PROCESS_TIMEOUT + 5000);
    });
});
