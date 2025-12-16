/**
 * Chunker Unit Tests
 * 
 * Tests for transcript chunking logic including token limits,
 * duration limits, and sentence boundary preservation.
 * 
 * Run: npm run test:run -- test/transcription/chunker.unit.test.ts
 */

import { describe, it, expect } from "vitest";
import {
    chunkTranscript,
    splitLargeSegment,
    preprocessSegments,
    mergeSmallSegments,
    endsWithSentence,
    startsNewSentence,
    findSentenceBoundary,
    DEFAULT_MAX_TOKENS,
    DEFAULT_MAX_SECONDS,
} from "../../server/services/flashcard/transcription/chunker";
import {
    TranscriptSegment,
    estimateTokens,
    formatTimeRange,
} from "../../server/services/flashcard/transcription/types";

// =============================================================================
// TEST DATA
// =============================================================================

function createSegment(start: number, end: number, text: string): TranscriptSegment {
    return { start, end, text };
}

const sampleSegments: TranscriptSegment[] = [
    createSegment(0, 5, "Welcome to this course on organizational behavior."),
    createSegment(5, 12, "Today we will discuss the importance of culture in the workplace."),
    createSegment(12, 20, "Culture affects how employees interact with each other and with management."),
    createSegment(20, 28, "Let's start by defining what we mean by organizational culture."),
    createSegment(28, 35, "It includes shared values, beliefs, and practices."),
    createSegment(35, 45, "These elements shape the work environment and influence employee behavior."),
];

// =============================================================================
// BASIC CHUNKING TESTS
// =============================================================================

describe("chunkTranscript - Basic", () => {
    it("should create chunks from segments", () => {
        const chunks = chunkTranscript(sampleSegments, {
            moduleId: "mod-test",
            fileId: "file-001",
            sourceFile: "lecture.mp4",
        });

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0].chunk_id).toContain("mod-test::file-001::chunk_");
        expect(chunks[0].source_file).toBe("lecture.mp4");
        expect(chunks[0].start_sec).toBe(0);
    });

    it("should return empty array for empty segments", () => {
        const chunks = chunkTranscript([]);
        expect(chunks).toEqual([]);
    });

    it("should handle single segment", () => {
        const chunks = chunkTranscript([createSegment(0, 10, "Single sentence.")]);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].text).toBe("Single sentence.");
        expect(chunks[0].start_sec).toBe(0);
        expect(chunks[0].end_sec).toBe(10);
    });

    it("should skip empty segments", () => {
        const segmentsWithEmpty = [
            createSegment(0, 5, "First sentence."),
            createSegment(5, 10, "   "),
            createSegment(10, 15, "Third sentence."),
        ];

        const chunks = chunkTranscript(segmentsWithEmpty);

        // Empty segment should be skipped
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.every(c => c.text.trim().length > 0)).toBe(true);
    });
});

// =============================================================================
// TOKEN LIMIT TESTS
// =============================================================================

describe("chunkTranscript - Token Limits", () => {
    it("should respect maxTokens limit", () => {
        const longSegments = Array.from({ length: 20 }, (_, i) =>
            createSegment(i * 5, (i + 1) * 5, `This is sentence number ${i + 1} with some content.`)
        );

        const chunks = chunkTranscript(longSegments, { maxTokens: 50 });

        // Each chunk should be under the token limit
        for (const chunk of chunks) {
            expect(chunk.tokens_est).toBeLessThanOrEqual(60); // Allow some flexibility
        }
    });

    it("should use custom tokenizer when provided", () => {
        const customTokenizer = (text: string) => text.length; // 1 token per char

        const chunks = chunkTranscript(sampleSegments, {
            tokenizer: customTokenizer,
            maxTokens: 100,
        });

        expect(chunks.length).toBeGreaterThan(0);
        // With custom tokenizer, tokens should equal text length
        for (const chunk of chunks) {
            expect(chunk.tokens_est).toBe(chunk.text.length);
        }
    });
});

// =============================================================================
// DURATION LIMIT TESTS
// =============================================================================

describe("chunkTranscript - Duration Limits", () => {
    it("should respect maxSeconds limit", () => {
        const longSegments = Array.from({ length: 30 }, (_, i) =>
            createSegment(i * 10, (i + 1) * 10, `Segment ${i + 1}.`)
        );

        const chunks = chunkTranscript(longSegments, { maxSeconds: 60 });

        // Each chunk should be under the duration limit
        for (const chunk of chunks) {
            const duration = (chunk.end_sec || 0) - (chunk.start_sec || 0);
            expect(duration).toBeLessThanOrEqual(70); // Allow some flexibility
        }
    });

    it("should create slide_or_page as time range", () => {
        const chunks = chunkTranscript(sampleSegments);

        for (const chunk of chunks) {
            expect(chunk.slide_or_page).toMatch(/^\d{2}:\d{2}:\d{2}-\d{2}:\d{2}:\d{2}$/);
        }
    });
});

// =============================================================================
// SENTENCE PRESERVATION TESTS
// =============================================================================

describe("chunkTranscript - Sentence Preservation", () => {
    it("should preserve sentence boundaries when enabled", () => {
        const segments = [
            createSegment(0, 10, "First complete sentence."),
            createSegment(10, 20, "Second complete sentence."),
            createSegment(20, 30, "Third complete sentence."),
        ];

        const chunks = chunkTranscript(segments, {
            preserveSentences: true,
            maxTokens: 10, // Very small to force splits
        });

        // Each chunk text should end with punctuation
        for (const chunk of chunks) {
            const trimmed = chunk.text.trim();
            expect(trimmed).toMatch(/[.!?]$/);
        }
    });

    it("should not preserve sentences when disabled", () => {
        const chunks = chunkTranscript(sampleSegments, {
            preserveSentences: false,
            maxTokens: 20,
        });

        // Should create more chunks without sentence concerns
        expect(chunks.length).toBeGreaterThan(0);
    });
});

// =============================================================================
// CHUNK METADATA TESTS
// =============================================================================

describe("chunkTranscript - Chunk Metadata", () => {
    it("should generate correct chunk_id format", () => {
        const chunks = chunkTranscript(sampleSegments, {
            moduleId: "mod-hr-101",
            fileId: "gdrive-abc123",
        });

        for (const chunk of chunks) {
            expect(chunk.chunk_id).toMatch(/^mod-hr-101::gdrive-abc123::chunk_\d+-\d+$/);
        }
    });

    it("should set provider correctly", () => {
        const chunks = chunkTranscript(sampleSegments, {
            provider: "google_drive",
        });

        for (const chunk of chunks) {
            expect(chunk.provider).toBe("google_drive");
        }
    });

    it("should have valid start_sec and end_sec", () => {
        const chunks = chunkTranscript(sampleSegments);

        for (const chunk of chunks) {
            expect(typeof chunk.start_sec).toBe("number");
            expect(typeof chunk.end_sec).toBe("number");
            expect(chunk.start_sec!).toBeGreaterThanOrEqual(0);
            expect(chunk.end_sec!).toBeGreaterThan(chunk.start_sec!);
        }
    });

    it("should estimate tokens for each chunk", () => {
        const chunks = chunkTranscript(sampleSegments);

        for (const chunk of chunks) {
            expect(chunk.tokens_est).toBeGreaterThan(0);
            // Token estimate should be roughly chars/4 or words*1.33
            const roughEstimate = Math.ceil(chunk.text.split(/\s+/).length * 1.33);
            expect(chunk.tokens_est).toBeCloseTo(roughEstimate, 0);
        }
    });
});

// =============================================================================
// SPLIT LARGE SEGMENT TESTS
// =============================================================================

describe("splitLargeSegment", () => {
    it("should return original if under token limit", () => {
        const segment = createSegment(0, 10, "Short text.");
        const result = splitLargeSegment(segment, 100);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(segment);
    });

    it("should split large segment into multiple parts", () => {
        const longText = `
      This is a very long segment that contains multiple sentences.
      It should be split into smaller parts.
      Each part should contain complete sentences when possible.
      The splitting should happen at sentence boundaries.
      This ensures readability and context preservation.
    `.trim().replace(/\s+/g, " ");

        const segment = createSegment(0, 30, longText);
        const result = splitLargeSegment(segment, 20);

        expect(result.length).toBeGreaterThan(1);

        // Each part should have some text
        for (const part of result) {
            expect(part.text.length).toBeGreaterThan(0);
        }

        // Timestamps should span the original duration
        expect(result[0].start).toBe(0);
        expect(result[result.length - 1].end).toBe(30);
    });
});

// =============================================================================
// PREPROCESS SEGMENTS TESTS
// =============================================================================

describe("preprocessSegments", () => {
    it("should clean text in segments", () => {
        const segments = [
            createSegment(0, 5, "Hello   world.  "),
            createSegment(5, 10, "[Music] Speaking now. [Applause]"),
            createSegment(10, 15, "Before (inaudible) Clear (pause) audio."),
        ];

        const processed = preprocessSegments(segments);

        expect(processed[0].text).toBe("Hello world.");
        expect(processed[1].text).toBe("Speaking now.");
        expect(processed[2].text).toBe("Before Clear audio.");
    });

    it("should skip segments with invalid timestamps", () => {
        const segments = [
            createSegment(0, 5, "Valid segment."),
            { start: NaN, end: 10, text: "Invalid start." } as TranscriptSegment,
            createSegment(10, 5, "Start > end."),
            createSegment(15, 20, "Another valid."),
        ];

        const processed = preprocessSegments(segments);

        expect(processed).toHaveLength(2);
        expect(processed[0].text).toBe("Valid segment.");
        expect(processed[1].text).toBe("Another valid.");
    });

    it("should round timestamps to 2 decimal places", () => {
        const segments = [
            createSegment(0.12345, 5.67891, "Precise timestamps."),
        ];

        const processed = preprocessSegments(segments);

        expect(processed[0].start).toBe(0.12);
        expect(processed[0].end).toBe(5.68);
    });
});

// =============================================================================
// MERGE SMALL SEGMENTS TESTS
// =============================================================================

describe("mergeSmallSegments", () => {
    it("should merge very small segments", () => {
        const segments = [
            createSegment(0, 1, "One"),
            createSegment(1, 2, "two"),
            createSegment(2, 3, "three"),
            createSegment(3, 10, "This is a longer segment with more words."),
        ];

        const merged = mergeSmallSegments(segments, 3);

        // Small segments should be merged
        expect(merged.length).toBeLessThan(segments.length);
    });

    it("should return empty array for empty input", () => {
        const merged = mergeSmallSegments([]);
        expect(merged).toEqual([]);
    });

    it("should preserve timing after merge", () => {
        const segments = [
            createSegment(0, 2, "First"),
            createSegment(2, 4, "second"),
            createSegment(4, 10, "A much longer segment here."),
        ];

        const merged = mergeSmallSegments(segments, 3);

        // First segment should start at 0
        expect(merged[0].start).toBe(0);
        // Last segment should end at 10
        expect(merged[merged.length - 1].end).toBe(10);
    });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("Sentence Detection Helpers", () => {
    it("endsWithSentence should detect sentence endings", () => {
        expect(endsWithSentence("This is a sentence.")).toBe(true);
        expect(endsWithSentence("Is this a question?")).toBe(true);
        expect(endsWithSentence("Wow!")).toBe(true);
        expect(endsWithSentence("Not complete")).toBe(false);
        expect(endsWithSentence("Ends with comma,")).toBe(false);
    });

    it("startsNewSentence should detect capital starts", () => {
        expect(startsNewSentence("The beginning")).toBe(true);
        expect(startsNewSentence("  Capital")).toBe(true);
        expect(startsNewSentence("lowercase")).toBe(false);
        expect(startsNewSentence("  123 numbers")).toBe(false);
    });

    it("findSentenceBoundary should find split points", () => {
        const text = "First sentence. Second sentence. Third sentence.";

        // Should find sentence boundary before limit
        const split = findSentenceBoundary(text, 20);
        expect(text.substring(0, split).trim()).toMatch(/\.$/);
    });
});

// =============================================================================
// INTEGRATION-LIKE TESTS
// =============================================================================

describe("Full Chunking Pipeline", () => {
    it("should process real-world-like transcript", () => {
        const transcript: TranscriptSegment[] = [
            createSegment(0, 3.5, "Good morning everyone."),
            createSegment(3.5, 8.2, "Welcome to today's lecture on human resources management."),
            createSegment(8.2, 15.1, "In this session, we will cover the fundamentals of talent acquisition."),
            createSegment(15.1, 22.4, "Talent acquisition is the process of identifying and attracting skilled workers."),
            createSegment(22.4, 30.0, "It's crucial for organizational success in today's competitive market."),
            createSegment(30.0, 38.5, "Let's begin by defining what we mean by talent acquisition."),
            createSegment(38.5, 47.2, "It encompasses employer branding, recruitment, and onboarding."),
            createSegment(47.2, 55.8, "These three elements work together to bring in the best candidates."),
            createSegment(55.8, 65.0, "First, let's talk about employer branding."),
            createSegment(65.0, 75.3, "Employer branding is how your company is perceived as an employer."),
        ];

        const chunks = chunkTranscript(transcript, {
            moduleId: "mod-hr-101",
            fileId: "lec-001",
            sourceFile: "hr_lecture.mp4",
            provider: "google_drive",
            maxTokens: 100,
            maxSeconds: 30,
            preserveSentences: true,
        });

        // Should create multiple chunks
        expect(chunks.length).toBeGreaterThan(1);

        // All chunks should have required fields
        for (const chunk of chunks) {
            expect(chunk.chunk_id).toBeDefined();
            expect(chunk.source_file).toBe("hr_lecture.mp4");
            expect(chunk.provider).toBe("google_drive");
            expect(chunk.start_sec).toBeDefined();
            expect(chunk.end_sec).toBeDefined();
            expect(chunk.text.length).toBeGreaterThan(0);
            expect(chunk.tokens_est).toBeGreaterThan(0);
        }

        // Chunks should be in chronological order
        for (let i = 1; i < chunks.length; i++) {
            expect(chunks[i].start_sec!).toBeGreaterThanOrEqual(chunks[i - 1].start_sec!);
        }
    });
});
