/**
 * Orchestrator Worker Integration Tests
 * 
 * Integration tests that run against a real Redis instance.
 * Requires Redis to be running locally.
 * 
 * Prerequisites:
 *   docker compose -f docker-compose.redis.yml up -d
 * 
 * Run:
 *   npm run test:run -- test/workers/orchestratorWorker.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { Worker, Job } from "bullmq";

// Mock the processModuleStandalone function
vi.mock("../../server/services/flashcard/e2e/processModuleStandalone", () => ({
    processModuleStandalone: vi.fn().mockImplementation(async (params) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
            module_id: params.module_id,
            course_id: params.course_id,
            module_title: params.module_title,
            status: "SUCCESS",
            generated_count: 10,
            verified_count: 9,
            warnings: [],
            deck_id: `deck_${params.module_id}_${Date.now()}`,
            metrics: {
                time_ms: 100,
                api_calls: 3,
                cost_estimate: 0.15,
                chunks_retrieved: 8,
                verification_rate: 0.9,
            },
            logs_url: null,
            retry_count: 0,
            completed_at: new Date().toISOString(),
        };
    }),
}));

import {
    initQueueClient,
    closeQueueClient,
    enqueueModuleJob,
    getJobStatus,
    QUEUE_NAMES,
    getRedisConnection,
    getQueuePrefix,
} from "../../server/services/flashcard/queue";
import type { OrchestratorJobData } from "../../server/services/flashcard/queue";
import type { ModuleResult } from "../../server/services/flashcard/orchestratorTypes";

// Test configuration
const REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379";
const TEST_PREFIX = "test-flashcard-" + Date.now();
const WORKER_PROCESS_TIMEOUT = 15000; // 15 seconds max for test

describe("Orchestrator Worker Integration Tests", () => {
    let testWorker: Worker<OrchestratorJobData, ModuleResult> | null = null;

    // ==========================================================================
    // Setup & Teardown
    // ==========================================================================

    beforeAll(async () => {
        // Initialize queue client with test prefix
        initQueueClient({ redisUrl: REDIS_URL, prefix: TEST_PREFIX });

        console.log(`[Test] Initialized queue with prefix: ${TEST_PREFIX}`);
    });

    afterAll(async () => {
        // Stop test worker if running
        if (testWorker) {
            await testWorker.close();
            testWorker = null;
        }

        // Close queue connections
        await closeQueueClient();

        console.log("[Test] Cleanup complete");
    });

    afterEach(async () => {
        // Stop worker after each test
        if (testWorker) {
            await testWorker.close();
            testWorker = null;
        }
    });

    // ==========================================================================
    // Helper: Create test worker
    // ==========================================================================

    function createTestWorker(
        processor: (job: Job<OrchestratorJobData>) => Promise<ModuleResult>
    ): Worker<OrchestratorJobData, ModuleResult> {
        const connection = getRedisConnection();
        const prefix = getQueuePrefix();

        return new Worker<OrchestratorJobData, ModuleResult>(
            QUEUE_NAMES.ORCHESTRATOR,
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
        it("should enqueue a job and process it successfully", async () => {
            const jobId = `test-job-${Date.now()}`;
            let processedJobId: string | undefined;
            let jobResult: ModuleResult | undefined;

            // Create a promise that resolves when job completes
            const jobCompleted = new Promise<ModuleResult>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Job processing timed out"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => {
                    processedJobId = job.data.jobId;

                    // Simulate successful processing
                    const result: ModuleResult = {
                        module_id: job.data.module_id,
                        course_id: job.data.course_id || "test-course",
                        module_title: job.data.module_title || "Test Module",
                        status: "SUCCESS",
                        generated_count: 10,
                        verified_count: 9,
                        warnings: [],
                        deck_id: `deck_${job.data.module_id}_test`,
                        metrics: {
                            time_ms: 100,
                            api_calls: 3,
                            cost_estimate: 0.15,
                            chunks_retrieved: 8,
                            verification_rate: 0.9,
                        },
                        logs_url: null,
                        retry_count: 0,
                        completed_at: new Date().toISOString(),
                    };

                    return result;
                });

                testWorker.on("completed", (job, result) => {
                    clearTimeout(timeout);
                    jobResult = result;
                    resolve(result);
                });

                testWorker.on("failed", (job, error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            // Enqueue the job
            const job = await enqueueModuleJob({
                jobId,
                module_id: "test-module-001",
                course_id: "test-course-001",
                module_title: "Integration Test Module",
                settings: {
                    target_card_count: 10,
                },
            });

            expect(job.id).toBe(jobId);
            expect(job.data.module_id).toBe("test-module-001");

            // Wait for job to complete
            const result = await jobCompleted;

            expect(processedJobId).toBe(jobId);
            expect(result.status).toBe("SUCCESS");
            expect(result.generated_count).toBe(10);
            expect(result.module_id).toBe("test-module-001");
        }, WORKER_PROCESS_TIMEOUT + 5000);

        it("should handle job failure and set result", async () => {
            const jobId = `test-fail-job-${Date.now()}`;
            const errorMessage = "Simulated processing failure";

            // Create a promise that resolves when job fails
            const jobFailed = new Promise<Error>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Job failure timed out"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => {
                    throw new Error(errorMessage);
                });

                testWorker.on("failed", (job, error) => {
                    clearTimeout(timeout);
                    resolve(error);
                });

                testWorker.on("completed", () => {
                    clearTimeout(timeout);
                    reject(new Error("Job should have failed"));
                });
            });

            // Enqueue the job
            await enqueueModuleJob({
                jobId,
                module_id: "test-fail-module",
            });

            // Wait for job to fail
            const error = await jobFailed;

            expect(error.message).toBe(errorMessage);
        }, WORKER_PROCESS_TIMEOUT + 5000);
    });

    describe("Job Status", () => {
        it("should return correct status for queued job", async () => {
            const jobId = `test-status-${Date.now()}`;

            // Enqueue without starting worker
            await enqueueModuleJob({
                jobId,
                module_id: "test-status-module",
            });

            // Check status immediately (should be queued)
            const status = await getJobStatus(jobId);

            expect(status.status).toBe("queued");
        });

        it("should return completed status after processing", async () => {
            const jobId = `test-completed-${Date.now()}`;

            // Create worker and completion promise
            const jobCompleted = new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => ({
                    module_id: job.data.module_id,
                    course_id: "test",
                    module_title: "Test",
                    status: "SUCCESS",
                    generated_count: 5,
                    verified_count: 5,
                    warnings: [],
                    deck_id: "test-deck",
                    metrics: {
                        time_ms: 50,
                        api_calls: 2,
                        cost_estimate: 0.1,
                        chunks_retrieved: 6,
                        verification_rate: 1.0,
                    },
                    logs_url: null,
                    retry_count: 0,
                    completed_at: new Date().toISOString(),
                }));

                testWorker.on("completed", () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            // Enqueue and wait for completion
            await enqueueModuleJob({
                jobId,
                module_id: "test-completed-module",
            });

            await jobCompleted;

            // Check status (should be completed)
            const status = await getJobStatus(jobId);

            expect(status.status).toBe("completed");
            expect(status.result).toBeDefined();
        }, WORKER_PROCESS_TIMEOUT + 5000);
    });

    describe("Job Idempotency", () => {
        it("should not create duplicate jobs with same jobId", async () => {
            const jobId = `test-idempotent-${Date.now()}`;

            // Enqueue twice with same jobId
            const job1 = await enqueueModuleJob({
                jobId,
                module_id: "module-1",
                settings: { version: 1 },
            });

            const job2 = await enqueueModuleJob({
                jobId,
                module_id: "module-1",
                settings: { version: 2 },
            });

            // Both should return the same job (first one)
            expect(job1.id).toBe(job2.id);
            expect(job1.id).toBe(jobId);

            // Note: BullMQ will return the existing job, so data may be from first enqueue
        });
    });

    describe("Progress Updates", () => {
        it("should support progress updates during processing", async () => {
            const jobId = `test-progress-${Date.now()}`;
            const progressUpdates: number[] = [];

            const jobCompleted = new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout"));
                }, WORKER_PROCESS_TIMEOUT);

                testWorker = createTestWorker(async (job) => {
                    // Update progress at different stages
                    await job.updateProgress(25);
                    progressUpdates.push(25);

                    await job.updateProgress(50);
                    progressUpdates.push(50);

                    await job.updateProgress(75);
                    progressUpdates.push(75);

                    await job.updateProgress(100);
                    progressUpdates.push(100);

                    return {
                        module_id: job.data.module_id,
                        course_id: "test",
                        module_title: "Test",
                        status: "SUCCESS",
                        generated_count: 10,
                        verified_count: 10,
                        warnings: [],
                        deck_id: "test-deck",
                        metrics: {
                            time_ms: 50,
                            api_calls: 1,
                            cost_estimate: 0.05,
                            chunks_retrieved: 4,
                            verification_rate: 1.0,
                        },
                        logs_url: null,
                        retry_count: 0,
                        completed_at: new Date().toISOString(),
                    };
                });

                testWorker.on("completed", () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            await enqueueModuleJob({
                jobId,
                module_id: "progress-test-module",
            });

            await jobCompleted;

            expect(progressUpdates).toEqual([25, 50, 75, 100]);
        }, WORKER_PROCESS_TIMEOUT + 5000);
    });
});
