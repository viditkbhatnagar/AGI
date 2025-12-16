/**
 * Transcription Service Tests
 * 
 * Unit tests for transcribeAndChunk
 * 
 * Run: npm run test:run -- test/flashcard/transcription.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TranscriptSegment } from "../../server/services/flashcard/transcription/types";

// Mock child_process before any imports that use it
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    spawn: vi.fn().mockImplementation(() => {
      const proc = {
        on: vi.fn((event, cb) => {
          if (event === "error") {
            setTimeout(() => cb(new Error("ENOENT")), 10);
          }
          return proc;
        }),
        kill: vi.fn(),
        stderr: { on: vi.fn() },
        stdout: { on: vi.fn() },
      };
      return proc;
    }),
  };
});

// =============================================================================
// MOCK DATA
// =============================================================================

const mockTranscriptSegments: TranscriptSegment[] = [
  { text: "Welcome to the HR fundamentals course.", start_sec: 0, end_sec: 3 },
  { text: "Today we will discuss organizational culture.", start_sec: 3, end_sec: 7 },
  { text: "Organizational culture is a system of shared assumptions.", start_sec: 7, end_sec: 12 },
  { text: "It governs how people behave in organizations.", start_sec: 12, end_sec: 16 },
  { text: "Values and beliefs are central to culture.", start_sec: 16, end_sec: 20 },
  { text: "Let's look at some examples.", start_sec: 20, end_sec: 23 },
  { text: "Company A has a collaborative culture.", start_sec: 23, end_sec: 27 },
  { text: "Company B focuses on innovation.", start_sec: 27, end_sec: 31 },
  { text: "Both approaches have their merits.", start_sec: 31, end_sec: 35 },
  { text: "Now let's discuss recruitment.", start_sec: 35, end_sec: 38 },
  { text: "Recruitment is the process of attracting talent.", start_sec: 38, end_sec: 43 },
  { text: "It involves job postings and interviews.", start_sec: 43, end_sec: 48 },
];

// =============================================================================
// TRANSCRIPTION CONFIG TESTS
// =============================================================================

describe("getTranscriptionConfig", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return whisper config by default", async () => {
    delete process.env.TRANSCRIBE_PROVIDER;
    
    const { getTranscriptionConfig } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );

    const config = getTranscriptionConfig();
    
    expect(config.provider).toBe("whisper");
    expect(config.whisperModel).toBe("base");
    expect(config.whisperLanguage).toBe("en");
  });

  it("should use custom whisper settings from env", async () => {
    process.env.TRANSCRIBE_PROVIDER = "whisper";
    process.env.WHISPER_BINARY_PATH = "/usr/local/bin/whisper";
    process.env.WHISPER_MODEL = "large";
    process.env.WHISPER_LANGUAGE = "es";

    const { getTranscriptionConfig } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );

    const config = getTranscriptionConfig();
    
    expect(config.whisperBinaryPath).toBe("/usr/local/bin/whisper");
    expect(config.whisperModel).toBe("large");
    expect(config.whisperLanguage).toBe("es");
  });

  it("should return google_stt config when set", async () => {
    process.env.TRANSCRIBE_PROVIDER = "google_stt";
    process.env.GOOGLE_STT_KEYFILE = "/path/to/keyfile.json";
    process.env.GOOGLE_STT_LANGUAGE = "en-GB";

    const { getTranscriptionConfig } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );

    const config = getTranscriptionConfig();
    
    expect(config.provider).toBe("google_stt");
    expect(config.googleSttKeyfile).toBe("/path/to/keyfile.json");
    expect(config.googleSttLanguage).toBe("en-GB");
  });
});

// =============================================================================
// CHUNKING TESTS
// =============================================================================

describe("chunkTranscript", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should chunk transcript segments by token count", async () => {
    const { chunkTranscript } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );

    const transcription = {
      segments: mockTranscriptSegments,
      full_text: mockTranscriptSegments.map(s => s.text).join(" "),
      duration_sec: 48,
      provider: "whisper" as const,
    };

    const file_meta = {
      file_id: "file123",
      file_name: "lecture.mp4",
      provider: "google_drive" as const,
    };

    const chunks = chunkTranscript(
      transcription,
      file_meta,
      "mod-hr-101",
      {
        targetTokens: 30, // Small for testing
        targetDurationSec: 20,
        overlapTokens: 5,
        preserveSentences: true,
      }
    );

    expect(chunks.length).toBeGreaterThan(1);
    
    // Each chunk should have required fields
    for (const chunk of chunks) {
      expect(chunk.chunk_id).toContain("mod-hr-101");
      expect(chunk.source_file).toBe("lecture.mp4");
      expect(chunk.provider).toBe("google_drive");
      expect(chunk.start_sec).toBeTypeOf("number");
      expect(chunk.end_sec).toBeTypeOf("number");
      expect(chunk.text.length).toBeGreaterThan(0);
      expect(chunk.tokens_est).toBeGreaterThan(0);
    }

    // Chunks should be in order
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start_sec!).toBeGreaterThanOrEqual(chunks[i - 1].start_sec!);
    }
  });

  it("should include timestamps in slide_or_page field", async () => {
    const { chunkTranscript } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );

    const transcription = {
      segments: mockTranscriptSegments.slice(0, 3),
      full_text: mockTranscriptSegments.slice(0, 3).map(s => s.text).join(" "),
      duration_sec: 12,
      provider: "whisper" as const,
    };

    const chunks = chunkTranscript(
      transcription,
      { file_id: "f1", file_name: "test.mp4", provider: "local" },
      "mod-test",
      {
        targetTokens: 100,
        targetDurationSec: 60,
        overlapTokens: 0,
        preserveSentences: false,
      }
    );

    expect(chunks.length).toBe(1);
    expect(chunks[0].slide_or_page).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/);
    expect(chunks[0].start_sec).toBe(0);
    expect(chunks[0].end_sec).toBe(12);
  });

  it("should handle empty segments array", async () => {
    const { chunkTranscript } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );

    const transcription = {
      segments: [],
      full_text: "",
      duration_sec: 0,
      provider: "whisper" as const,
    };

    const chunks = chunkTranscript(
      transcription,
      { file_id: "f1", file_name: "empty.mp4", provider: "local" },
      "mod-empty",
      {
        targetTokens: 500,
        targetDurationSec: 60,
        overlapTokens: 50,
        preserveSentences: true,
      }
    );

    expect(chunks).toEqual([]);
  });

  it("should preserve sentence boundaries when enabled", async () => {
    const { chunkTranscript } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );

    const transcription = {
      segments: mockTranscriptSegments,
      full_text: mockTranscriptSegments.map(s => s.text).join(" "),
      duration_sec: 48,
      provider: "whisper" as const,
    };

    const chunks = chunkTranscript(
      transcription,
      { file_id: "f1", file_name: "test.mp4", provider: "local" },
      "mod-test",
      {
        targetTokens: 25,
        targetDurationSec: 15,
        overlapTokens: 10,
        preserveSentences: true,
      }
    );

    // With sentence preservation, chunks should end at sentence boundaries
    for (const chunk of chunks) {
      // Text should end with a period (sentence boundary)
      expect(chunk.text.trim()).toMatch(/\.$/);
    }
  });
});

// =============================================================================
// TRANSCRIBE AND CHUNK INTEGRATION TESTS
// =============================================================================

describe("transcribeAndChunk", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalFetch = global.fetch;
    vi.resetModules();
    
    process.env.TRANSCRIBE_PROVIDER = "whisper";
    process.env.EMBEDDING_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.VECTOR_DB_PROVIDER = "qdrant";
    process.env.QDRANT_URL = "http://localhost:6333";
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("should throw NotImplementedError when whisper binary not found", async () => {
    // The mock is already set up at the top of the file
    const { transcribeAndChunk } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );
    const { NotImplementedError } = await import(
      "../../server/services/flashcard/transcription/types"
    );

    await expect(
      transcribeAndChunk({
        file_url: "https://example.com/video.mp4",
        file_meta: {
          file_id: "vid123",
          file_name: "lecture.mp4",
          provider: "google_drive",
        },
        module_id: "mod-test",
      })
    ).rejects.toThrow(NotImplementedError);
  });

  it("should throw NotImplementedError for google_stt provider", async () => {
    process.env.TRANSCRIBE_PROVIDER = "google_stt";

    const { transcribeAndChunk } = await import(
      "../../server/services/flashcard/transcription/transcribeAndChunk"
    );
    const { NotImplementedError } = await import(
      "../../server/services/flashcard/transcription/types"
    );

    await expect(
      transcribeAndChunk({
        file_url: "https://example.com/video.mp4",
        file_meta: {
          file_id: "vid123",
          file_name: "lecture.mp4",
          provider: "google_drive",
        },
        module_id: "mod-test",
      })
    ).rejects.toThrow(NotImplementedError);
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("TranscriptionError", () => {
  it("should create error with correct properties", async () => {
    const { TranscriptionError } = await import(
      "../../server/services/flashcard/transcription/types"
    );

    const error = new TranscriptionError(
      "Transcription failed",
      "whisper",
      "PROCESS_FAILED",
      true
    );

    expect(error.name).toBe("TranscriptionError");
    expect(error.message).toBe("Transcription failed");
    expect(error.provider).toBe("whisper");
    expect(error.code).toBe("PROCESS_FAILED");
    expect(error.retryable).toBe(true);
  });
});

describe("NotImplementedError", () => {
  it("should create error with instructions", async () => {
    const { NotImplementedError } = await import(
      "../../server/services/flashcard/transcription/types"
    );

    const error = new NotImplementedError(
      "Google STT",
      "Install google-cloud-speech package"
    );

    expect(error.name).toBe("NotImplementedError");
    expect(error.feature).toBe("Google STT");
    expect(error.instructions).toBe("Install google-cloud-speech package");
    expect(error.message).toContain("Google STT");
    expect(error.message).toContain("Install google-cloud-speech");
  });
});
