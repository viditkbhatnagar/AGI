/**
 * TranscribeAndChunk Integration Tests
 * 
 * Tests the full transcription pipeline with mocked whisper and upsertChunks.
 * Uses deterministic test data for reproducible results.
 * 
 * Run: npm run test:run -- test/transcription/transcribeAndChunk.integration.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// MOCKS
// =============================================================================

// Mock the whisper runner
vi.mock("../../server/services/flashcard/transcription/whisperxRunner", () => ({
    transcribeWithWhisperX: vi.fn(),
    mockTranscribe: vi.fn(() => ({
        segments: [
            { start: 0, end: 5.5, text: "Welcome to this lecture." },
            { start: 5.5, end: 12.2, text: "Today we will discuss important topics." },
            { start: 12.2, end: 20.0, text: "Let's begin with the fundamentals." },
            { start: 20.0, end: 28.5, text: "These concepts are essential for understanding the subject." },
            { start: 28.5, end: 35.0, text: "Now let's look at some practical examples." },
        ],
        language: "en",
        duration: 35.0,
        model: "mock",
    })),
    checkBinaryExists: vi.fn(() => Promise.resolve(true)),
}));

// Mock Google STT
vi.mock("../../server/services/flashcard/transcription/googleSttRunner", () => ({
    transcribeWithGoogleSTT: vi.fn(),
    mockGoogleSTT: vi.fn(() => ({
        segments: [
            { start: 0, end: 4.5, text: "This is a mock Google STT transcription." },
            { start: 4.5, end: 9.2, text: "It returns deterministic content for testing." },
        ],
        language: "en-US",
        duration: 9.2,
        model: "google-stt-mock",
    })),
}));

import {
    transcribeAndChunk,
    batchTranscribeAndChunk,
    type TranscribeAndChunkParams,
} from "../../server/services/flashcard/transcription/transcribeAndChunk";
import { mockTranscribe } from "../../server/services/flashcard/transcription/whisperxRunner";
import type { ContextChunk } from "../../server/services/flashcard/transcription/types";

// =============================================================================
// SETUP
// =============================================================================

const TEST_TMP_DIR = "./server/tmp/test-transcripts";
const TEST_FILE_PATH = "./test/fixtures/short_sample.wav";

beforeEach(() => {
    vi.clearAllMocks();
    process.env.TRANSCRIBE_PROVIDER = "mock";

    // Ensure test directory exists
    if (!fs.existsSync(TEST_TMP_DIR)) {
        fs.mkdirSync(TEST_TMP_DIR, { recursive: true });
    }
});

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TRANSCRIBE_PROVIDER;
});

// =============================================================================
// BASIC TRANSCRIPTION TESTS
// =============================================================================

describe("transcribeAndChunk - Basic", () => {
    it("should transcribe and chunk a file using mock provider", async () => {
        // Create a temp test file
        const testFilePath = path.join(TEST_TMP_DIR, "test_audio.wav");
        fs.writeFileSync(testFilePath, "mock audio content");

        try {
            const result = await transcribeAndChunk({
                filePath: testFilePath,
                file_id: "test-file-001",
                file_name: "test_audio.wav",
                provider: "local",
                module_id: "mod-test-001",
                jobId: "job-test-001",
            });

            expect(result.chunks).toBeDefined();
            expect(result.chunks.length).toBeGreaterThan(0);
            expect(result.duration).toBe(35.0);
            expect(result.language).toBe("en");
        } finally {
            // Cleanup
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });

    it("should generate correct chunk IDs", async () => {
        const testFilePath = path.join(TEST_TMP_DIR, "test_audio_2.wav");
        fs.writeFileSync(testFilePath, "mock audio content");

        try {
            const result = await transcribeAndChunk({
                filePath: testFilePath,
                file_id: "file-xyz-123",
                file_name: "lecture.mp4",
                provider: "google_drive",
                module_id: "mod-hr-101",
                jobId: "job-002",
            });

            // Check chunk IDs have correct format
            for (const chunk of result.chunks) {
                expect(chunk.chunk_id).toMatch(/^mod-hr-101::file-xyz-123::chunk_\d+-\d+$/);
            }
        } finally {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });

    it("should set provider correctly on chunks", async () => {
        const testFilePath = path.join(TEST_TMP_DIR, "test_audio_3.wav");
        fs.writeFileSync(testFilePath, "mock audio content");

        try {
            const result = await transcribeAndChunk({
                filePath: testFilePath,
                file_id: "file-001",
                file_name: "video.mp4",
                provider: "onedrive",
                module_id: "mod-001",
            });

            for (const chunk of result.chunks) {
                expect(chunk.provider).toBe("onedrive");
            }
        } finally {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });
});

// =============================================================================
// CHUNK STRUCTURE TESTS
// =============================================================================

describe("transcribeAndChunk - Chunk Structure", () => {
    it("should produce chunks with all required fields", async () => {
        const testFilePath = path.join(TEST_TMP_DIR, "test_structure.wav");
        fs.writeFileSync(testFilePath, "mock audio content");

        try {
            const result = await transcribeAndChunk({
                filePath: testFilePath,
                file_id: "struct-test",
                file_name: "test.mp4",
                provider: "local",
                module_id: "mod-struct",
            });

            for (const chunk of result.chunks) {
                // Required fields
                expect(chunk.chunk_id).toBeDefined();
                expect(chunk.source_file).toBe("test.mp4");
                expect(chunk.provider).toBe("local");
                expect(typeof chunk.start_sec).toBe("number");
                expect(typeof chunk.end_sec).toBe("number");
                expect(chunk.text).toBeDefined();
                expect(chunk.text.length).toBeGreaterThan(0);
                expect(chunk.tokens_est).toBeGreaterThan(0);

                // Slide_or_page should be time range format
                expect(chunk.slide_or_page).toMatch(/^\d{2}:\d{2}:\d{2}-\d{2}:\d{2}:\d{2}$/);
            }
        } finally {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });

    it("should have valid timestamps on chunks", async () => {
        const testFilePath = path.join(TEST_TMP_DIR, "test_timestamps.wav");
        fs.writeFileSync(testFilePath, "mock audio content");

        try {
            const result = await transcribeAndChunk({
                filePath: testFilePath,
                file_id: "time-test",
                file_name: "test.mp4",
                provider: "local",
                module_id: "mod-time",
            });

            // Chunks should be in chronological order
            for (let i = 1; i < result.chunks.length; i++) {
                expect(result.chunks[i].start_sec!).toBeGreaterThanOrEqual(
                    result.chunks[i - 1].start_sec!
                );
            }

            // Each chunk should have start < end
            for (const chunk of result.chunks) {
                expect(chunk.end_sec!).toBeGreaterThan(chunk.start_sec!);
            }
        } finally {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });
});

// =============================================================================
// TOKEN ESTIMATION TESTS
// =============================================================================

describe("transcribeAndChunk - Token Estimation", () => {
    it("should estimate tokens for each chunk", async () => {
        const testFilePath = path.join(TEST_TMP_DIR, "test_tokens.wav");
        fs.writeFileSync(testFilePath, "mock audio content");

        try {
            const result = await transcribeAndChunk({
                filePath: testFilePath,
                file_id: "token-test",
                file_name: "test.mp4",
                provider: "local",
                module_id: "mod-token",
            });

            for (const chunk of result.chunks) {
                // Tokens should be roughly words * 1.33
                const wordCount = chunk.text.split(/\s+/).filter(Boolean).length;
                const expectedTokens = Math.ceil(wordCount * 1.33);

                // Allow some variance
                expect(chunk.tokens_est).toBeGreaterThanOrEqual(expectedTokens * 0.8);
                expect(chunk.tokens_est).toBeLessThanOrEqual(expectedTokens * 1.2);
            }
        } finally {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });
});

// =============================================================================
// PII REDACTION TESTS
// =============================================================================

describe("transcribeAndChunk - PII Redaction", () => {
    it("should track PII redaction status", async () => {
        const testFilePath = path.join(TEST_TMP_DIR, "test_pii.wav");
        fs.writeFileSync(testFilePath, "mock audio content");

        try {
            const result = await transcribeAndChunk({
                filePath: testFilePath,
                file_id: "pii-test",
                file_name: "test.mp4",
                provider: "local",
                module_id: "mod-pii",
                redactPii: true,
            });

            // Mock transcript doesn't contain PII, so piiRedacted should be false
            expect(result.piiRedacted).toBe(false);
        } finally {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });
});

// =============================================================================
// BATCH TRANSCRIPTION TESTS
// =============================================================================

describe("batchTranscribeAndChunk", () => {
    it("should process multiple files", async () => {
        // Create test files
        const testFile1 = path.join(TEST_TMP_DIR, "batch1.wav");
        const testFile2 = path.join(TEST_TMP_DIR, "batch2.wav");
        fs.writeFileSync(testFile1, "mock audio 1");
        fs.writeFileSync(testFile2, "mock audio 2");

        try {
            const result = await batchTranscribeAndChunk({
                files: [
                    { file_id: "batch-1", file_name: "file1.mp4", path: testFile1 },
                    { file_id: "batch-2", file_name: "file2.mp4", path: testFile2 },
                ],
                provider: "local",
                module_id: "mod-batch",
                jobId: "job-batch",
            });

            expect(result.successful).toHaveLength(2);
            expect(result.failed).toHaveLength(0);
            expect(result.totalChunks).toBeGreaterThan(0);
            expect(result.totalDuration).toBeGreaterThan(0);
        } finally {
            if (fs.existsSync(testFile1)) fs.unlinkSync(testFile1);
            if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
        }
    });

    it("should handle partial failures gracefully", async () => {
        const testFile1 = path.join(TEST_TMP_DIR, "batch_partial.wav");
        fs.writeFileSync(testFile1, "mock audio");

        try {
            const result = await batchTranscribeAndChunk({
                files: [
                    { file_id: "good", file_name: "good.mp4", path: testFile1 },
                    { file_id: "bad", file_name: "bad.mp4", path: "/nonexistent/file.mp4" },
                ],
                provider: "local",
                module_id: "mod-partial",
                jobId: "job-partial",
            });

            expect(result.successful.length).toBe(1);
            expect(result.failed.length).toBe(1);
            expect(result.failed[0].file_id).toBe("bad");
        } finally {
            if (fs.existsSync(testFile1)) fs.unlinkSync(testFile1);
        }
    });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("transcribeAndChunk - Error Handling", () => {
    it("should throw error for non-existent file", async () => {
        await expect(
            transcribeAndChunk({
                filePath: "/nonexistent/path/to/file.wav",
                file_id: "fail-test",
                file_name: "missing.mp4",
                provider: "local",
                module_id: "mod-fail",
            })
        ).rejects.toThrow();
    });

    it("should throw error for unknown provider", async () => {
        const testFilePath = path.join(TEST_TMP_DIR, "test_provider.wav");
        fs.writeFileSync(testFilePath, "mock audio");

        // Set an invalid provider via env var
        process.env.TRANSCRIBE_PROVIDER = "invalid_provider";

        try {
            await expect(
                transcribeAndChunk({
                    filePath: testFilePath,
                    file_id: "provider-test",
                    file_name: "test.mp4",
                    provider: "local",
                    module_id: "mod-provider",
                })
            ).rejects.toThrow(/Unknown transcription provider/);
        } finally {
            process.env.TRANSCRIBE_PROVIDER = "mock";
            if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        }
    });
});
