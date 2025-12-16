/**
 * WhisperX Runner Unit Tests
 * 
 * Tests for whisper transcription runner with mocked child_process.
 * 
 * Run: npm run test:run -- test/transcription/whisperxRunner.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as childProcess from "child_process";
import { EventEmitter } from "events";
import {
    transcribeWithWhisperX,
    mockTranscribe,
    buildWhisperArgs,
    parseJsonContent,
    normalizeSegment,
} from "../../server/services/flashcard/transcription/whisperxRunner";
import { TranscriptionError } from "../../server/services/flashcard/transcription/types";
import * as fs from "fs";

// =============================================================================
// MOCKS
// =============================================================================

vi.mock("child_process");
vi.mock("fs", async () => {
    const actual = await vi.importActual<typeof fs>("fs");
    return {
        ...actual,
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        readFileSync: vi.fn(),
    };
});

// =============================================================================
// MOCK SPAWN HELPER
// =============================================================================

interface MockSpawnOptions {
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    emitError?: Error;
}

function createMockChildProcess(opts: MockSpawnOptions = {}) {
    const mockChild = new EventEmitter() as childProcess.ChildProcess & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: ReturnType<typeof vi.fn>;
    };

    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.kill = vi.fn();

    // Simulate async events
    setImmediate(() => {
        if (opts.emitError) {
            mockChild.emit("error", opts.emitError);
            return;
        }

        if (opts.stdout) {
            mockChild.stdout.emit("data", Buffer.from(opts.stdout));
        }
        if (opts.stderr) {
            mockChild.stderr.emit("data", Buffer.from(opts.stderr));
        }
        mockChild.emit("close", opts.exitCode ?? 0);
    });

    return mockChild;
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

// =============================================================================
// BUILD ARGS TESTS
// =============================================================================

describe("buildWhisperArgs", () => {
    it("should build args for whisperx binary", () => {
        const args = buildWhisperArgs({
            filePath: "/tmp/audio.mp3",
            model: "base",
            language: "en",
            outputDir: "/tmp/output",
            whisperBinaryPath: "whisperx",
        });

        expect(args).toContain("/tmp/audio.mp3");
        expect(args).toContain("--model");
        expect(args).toContain("base");
        expect(args).toContain("--language");
        expect(args).toContain("en");
        expect(args).toContain("--output_format");
        expect(args).toContain("json");
    });

    it("should build args for openai whisper binary", () => {
        const args = buildWhisperArgs({
            filePath: "/tmp/audio.mp3",
            model: "small",
            language: "es",
            outputDir: "/tmp/output",
            whisperBinaryPath: "whisper",
        });

        expect(args).toContain("/tmp/audio.mp3");
        expect(args).toContain("--model");
        expect(args).toContain("small");
        expect(args).toContain("--output_format");
        expect(args).toContain("json");
    });

    it("should build args for whisper.cpp main binary", () => {
        const args = buildWhisperArgs({
            filePath: "/tmp/audio.wav",
            model: "base",
            language: "en",
            outputDir: "/tmp/output",
            whisperBinaryPath: "/path/to/whisper.cpp/main",
        });

        expect(args).toContain("-f");
        expect(args).toContain("/tmp/audio.wav");
        expect(args).toContain("-l");
        expect(args).toContain("en");
        expect(args).toContain("-oj"); // JSON output
    });
});

// =============================================================================
// PARSE JSON TESTS
// =============================================================================

describe("parseJsonContent", () => {
    it("should parse WhisperX format with segments array", () => {
        const json = JSON.stringify({
            segments: [
                { start: 0, end: 5, text: "Hello world." },
                { start: 5, end: 10, text: "Second segment." },
            ],
        });

        const segments = parseJsonContent(json);

        expect(segments).toHaveLength(2);
        expect(segments[0].text).toBe("Hello world.");
        expect(segments[0].start).toBe(0);
        expect(segments[0].end).toBe(5);
    });

    it("should parse direct array of segments", () => {
        const json = JSON.stringify([
            { start: 0, end: 3, text: "First." },
            { start: 3, end: 6, text: "Second." },
        ]);

        const segments = parseJsonContent(json);

        expect(segments).toHaveLength(2);
    });

    it("should parse whisper.cpp transcription format", () => {
        const json = JSON.stringify({
            transcription: [
                { t0: 0, t1: 5, text: "Segment one." },
                { t0: 5, t1: 10, text: "Segment two." },
            ],
        });

        const segments = parseJsonContent(json);

        expect(segments).toHaveLength(2);
        expect(segments[0].start).toBe(0);
        expect(segments[0].end).toBe(5);
    });

    it("should return empty array for invalid JSON", () => {
        const segments = parseJsonContent("not valid json");
        expect(segments).toEqual([]);
    });

    it("should return empty array for empty object", () => {
        const segments = parseJsonContent("{}");
        expect(segments).toEqual([]);
    });
});

// =============================================================================
// NORMALIZE SEGMENT TESTS
// =============================================================================

describe("normalizeSegment", () => {
    it("should normalize standard segment format", () => {
        const segment = normalizeSegment({
            start: 1.234567,
            end: 5.987654,
            text: "  Hello world.  ",
        });

        expect(segment.start).toBe(1.23);
        expect(segment.end).toBe(5.99);
        expect(segment.text).toBe("Hello world.");
    });

    it("should handle t0/t1 timestamp format", () => {
        const segment = normalizeSegment({
            t0: 10,
            t1: 20,
            text: "Content here.",
        });

        expect(segment.start).toBe(10);
        expect(segment.end).toBe(20);
    });

    it("should handle string timestamps", () => {
        const segment = normalizeSegment({
            start: "5.5",
            end: "10.5",
            text: "String timestamps.",
        });

        expect(segment.start).toBe(5.5);
        expect(segment.end).toBe(10.5);
    });

    it("should handle word-level timings", () => {
        const segment = normalizeSegment({
            start: 0,
            end: 5,
            text: "Hello world",
            words: [
                { word: "Hello", start: 0, end: 2 },
                { word: "world", start: 2, end: 5 },
            ],
        });

        expect(segment.words).toHaveLength(2);
        expect(segment.words![0].word).toBe("Hello");
    });

    it("should handle missing fields gracefully", () => {
        const segment = normalizeSegment({});

        expect(segment.start).toBe(0);
        expect(segment.end).toBe(0);
        expect(segment.text).toBe("");
    });
});

// =============================================================================
// MOCK TRANSCRIBE TESTS
// =============================================================================

describe("mockTranscribe", () => {
    it("should return deterministic mock segments", () => {
        const result = mockTranscribe("/path/to/test.mp3");

        expect(result.segments).toHaveLength(5);
        expect(result.language).toBe("en");
        expect(result.model).toBe("mock");
        expect(result.duration).toBe(35.0);
    });

    it("should have properly ordered segments", () => {
        const result = mockTranscribe("/any/file.wav");

        for (let i = 1; i < result.segments.length; i++) {
            expect(result.segments[i].start).toBeGreaterThanOrEqual(result.segments[i - 1].end);
        }
    });
});

// =============================================================================
// TRANSCRIBE WITH WHISPERX TESTS (Mocked)
// =============================================================================

describe("transcribeWithWhisperX", () => {
    const mockJsonOutput = JSON.stringify({
        segments: [
            { start: 0, end: 5, text: "First segment." },
            { start: 5, end: 10, text: "Second segment." },
        ],
    });

    it("should throw error when file not found", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

        await expect(
            transcribeWithWhisperX({
                filePath: "/nonexistent/file.mp3",
                jobId: "test-job",
            })
        ).rejects.toThrow(TranscriptionError);
    });

    it("should throw error when whisper binary not found", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

        // Mock spawn to emit error
        (childProcess.spawn as ReturnType<typeof vi.fn>).mockReturnValue(
            createMockChildProcess({ emitError: new Error("ENOENT: not found") })
        );

        await expect(
            transcribeWithWhisperX({
                filePath: "/tmp/test.mp3",
                whisperBinaryPath: "nonexistent-binary",
                jobId: "test-job",
            })
        ).rejects.toThrow(TranscriptionError);
    });

    it("should parse JSON output from whisper", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
            if (typeof p === "string" && p.endsWith(".json")) return true;
            return true;
        });

        (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(mockJsonOutput);

        // Mock successful spawn for binary check
        (childProcess.spawn as ReturnType<typeof vi.fn>)
            .mockReturnValueOnce(createMockChildProcess({ exitCode: 0 })) // Binary check
            .mockReturnValueOnce(createMockChildProcess({
                exitCode: 0,
                stdout: mockJsonOutput,
            }));

        const result = await transcribeWithWhisperX({
            filePath: "/tmp/test.mp3",
            jobId: "test-job",
        });

        expect(result.segments).toHaveLength(2);
        expect(result.segments[0].text).toBe("First segment.");
    });

    it("should handle whisper process failure", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

        // Mock spawn
        (childProcess.spawn as ReturnType<typeof vi.fn>)
            .mockReturnValueOnce(createMockChildProcess({ exitCode: 0 })) // Binary check
            .mockReturnValueOnce(createMockChildProcess({
                exitCode: 1,
                stderr: "Some error occurred",
            }));

        await expect(
            transcribeWithWhisperX({
                filePath: "/tmp/test.mp3",
                jobId: "test-job",
            })
        ).rejects.toThrow(TranscriptionError);
    });

    it("should handle model not found error", async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

        (childProcess.spawn as ReturnType<typeof vi.fn>)
            .mockReturnValueOnce(createMockChildProcess({ exitCode: 0 }))
            .mockReturnValueOnce(createMockChildProcess({
                exitCode: 1,
                stderr: "model not found: large-v3",
            }));

        try {
            await transcribeWithWhisperX({
                filePath: "/tmp/test.mp3",
                model: "large-v3",
                jobId: "test-job",
            });
            expect.fail("Should have thrown");
        } catch (error) {
            expect(error).toBeInstanceOf(TranscriptionError);
            expect((error as TranscriptionError).feature).toBe("whisper_model");
        }
    });
});

// =============================================================================
// TRANSCRIPTION ERROR TESTS
// =============================================================================

describe("TranscriptionError", () => {
    it("should format error with instructions", () => {
        const error = new TranscriptionError({
            message: "Binary not found",
            feature: "whisper_binary",
            instructions: "Install whisper using pip",
            jobId: "job-123",
            fileId: "file-456",
            retryable: false,
        });

        const detailed = error.toDetailedString();

        expect(detailed).toContain("whisper_binary");
        expect(detailed).toContain("Binary not found");
        expect(detailed).toContain("Install whisper using pip");
        expect(detailed).toContain("job-123");
        expect(detailed).toContain("file-456");
    });

    it("should convert to JSON for logging", () => {
        const error = new TranscriptionError({
            message: "Test error",
            feature: "chunking",
            instructions: "Fix it",
            retryable: true,
        });

        const json = error.toJSON();

        expect(json.name).toBe("TranscriptionError");
        expect(json.feature).toBe("chunking");
        expect(json.retryable).toBe(true);
    });
});
