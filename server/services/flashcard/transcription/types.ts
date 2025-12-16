/**
 * Transcription Types
 * 
 * Type definitions for the transcription pipeline including
 * WhisperX/Google STT runners, chunking, and error handling.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface TranscriptionConfig {
  /** Transcription provider: 'whisper' or 'google_stt' */
  provider: "whisper" | "google_stt" | "mock";
  /** Path to whisper/whisperx binary */
  whisperBinaryPath: string;
  /** Whisper model size */
  whisperModel: "tiny" | "base" | "small" | "medium" | "large" | "large-v2" | "large-v3";
  /** Language code (e.g., 'en', 'es') */
  language: string;
  /** Maximum chunk duration in seconds */
  maxChunkSeconds: number;
  /** Maximum tokens per chunk */
  maxChunkTokens: number;
  /** Temporary directory for transcripts */
  tmpDir: string;
  /** GCS bucket for Google STT (optional) */
  gcsBucket?: string;
}

export const DEFAULT_CONFIG: TranscriptionConfig = {
  provider: (process.env.TRANSCRIBE_PROVIDER as TranscriptionConfig["provider"]) || "whisper",
  whisperBinaryPath: process.env.WHISPER_BINARY_PATH || "whisper",
  whisperModel: (process.env.WHISPER_MODEL as TranscriptionConfig["whisperModel"]) || "base",
  language: process.env.WHISPER_LANGUAGE || "en",
  maxChunkSeconds: parseInt(process.env.WHISPER_MAX_CHUNK_SECONDS || "90", 10),
  maxChunkTokens: parseInt(process.env.CHUNK_TOKENS || "800", 10),
  tmpDir: process.env.TRANSCRIPTION_TMP_DIR || "./server/tmp/transcripts",
  gcsBucket: process.env.GCS_BUCKET,
};

// =============================================================================
// TRANSCRIPT SEGMENT
// =============================================================================

/**
 * A single segment from the transcription output.
 * Contains start/end timestamps and the transcribed text.
 */
export interface TranscriptSegment {
  /** Start time in seconds (float) */
  start: number;
  /** End time in seconds (float) */
  end: number;
  /** Transcribed text */
  text: string;
  /** Optional word-level timings */
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  /** Confidence score (0-1) if available */
  confidence?: number;
}

/**
 * Complete transcript from WhisperX or Google STT
 */
export interface WhisperTranscript {
  /** Array of transcribed segments */
  segments: TranscriptSegment[];
  /** Detected or specified language */
  language: string;
  /** Total duration in seconds */
  duration: number;
  /** Model used for transcription */
  model?: string;
  /** Raw output path (if saved to file) */
  rawOutputPath?: string;
}

// =============================================================================
// CONTEXT CHUNK (for RAG pipeline)
// =============================================================================

/**
 * A chunk of content ready for embedding and vector storage.
 * This is the primary output of the transcription pipeline.
 */
export interface ContextChunk {
  /** Unique chunk identifier: {module_id}::{file_id}::chunk_{start_ms}-{end_ms} */
  chunk_id: string;
  /** Original source file name */
  source_file: string;
  /** Storage provider */
  provider: "google_drive" | "onedrive" | "local" | "other";
  /** Slide number, page number, or timestamp range (e.g., "00:02:30-00:03:05") */
  slide_or_page: string | null;
  /** Start time in seconds (for audio/video) */
  start_sec: number | null;
  /** End time in seconds (for audio/video) */
  end_sec: number | null;
  /** Section heading if available */
  heading: string | null;
  /** The actual text content */
  text: string;
  /** Estimated token count */
  tokens_est: number;
  /** Optional embedding vector (populated after embedText call) */
  embedding?: number[];
}

// =============================================================================
// TRANSCRIPTION JOB
// =============================================================================

/**
 * A file to be transcribed
 */
export interface TranscriptionFile {
  /** Unique file identifier */
  file_id: string;
  /** Original file name */
  file_name: string;
  /** Storage provider */
  provider: "google_drive" | "onedrive" | "local";
  /** Direct file path (if local) */
  path?: string;
  /** Remote URL (if cloud-hosted) */
  url?: string;
  /** File MIME type */
  mime_type?: string;
  /** File size in bytes */
  size_bytes?: number;
}

/**
 * Transcription job definition
 */
export interface TranscriptionJob {
  /** Unique job identifier */
  jobId: string;
  /** Module this transcription belongs to */
  module_id: string;
  /** Course ID (optional) */
  course_id?: string;
  /** Files to transcribe */
  files: TranscriptionFile[];
  /** Job status */
  status: "pending" | "processing" | "completed" | "failed" | "partial";
  /** Number of retry attempts */
  attempts: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Job creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Error message if failed */
  error?: string;
  /** Result data if completed */
  result?: TranscriptionJobResult;
}

/**
 * Result of a completed transcription job
 */
export interface TranscriptionJobResult {
  /** Total files processed */
  files_processed: number;
  /** Files that failed */
  files_failed: number;
  /** Total chunks created */
  total_chunks: number;
  /** Total transcription duration */
  total_duration_sec: number;
  /** Per-file results */
  file_results: Array<{
    file_id: string;
    status: "success" | "failed";
    chunks_count: number;
    duration_sec: number;
    error?: string;
  }>;
}

// =============================================================================
// TRANSCRIPTION ERROR
// =============================================================================

/**
 * Feature categories for transcription errors
 */
export type TranscriptionFeature =
  | "whisper_binary"
  | "whisper_model"
  | "google_stt"
  | "file_download"
  | "file_format"
  | "chunking"
  | "embedding"
  | "vector_db"
  | "queue"
  | "unknown";

/**
 * Custom error class for transcription failures.
 * Includes helpful installation/fix instructions.
 */
export class TranscriptionError extends Error {
  /** Feature/component that failed */
  public readonly feature: TranscriptionFeature;
  /** Instructions for fixing the error */
  public readonly instructions: string;
  /** Job ID if available */
  public readonly jobId?: string;
  /** File ID if available */
  public readonly fileId?: string;
  /** Original error if wrapped */
  public readonly cause?: Error;
  /** Whether this error is retryable */
  public readonly retryable: boolean;

  constructor(params: {
    message: string;
    feature: TranscriptionFeature;
    instructions: string;
    jobId?: string;
    fileId?: string;
    cause?: Error;
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = "TranscriptionError";
    this.feature = params.feature;
    this.instructions = params.instructions;
    this.jobId = params.jobId;
    this.fileId = params.fileId;
    this.cause = params.cause;
    this.retryable = params.retryable ?? false;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TranscriptionError);
    }
  }

  /**
   * Create a formatted error message with instructions
   */
  toDetailedString(): string {
    const lines = [
      `TranscriptionError [${this.feature}]: ${this.message}`,
      "",
      "Instructions to fix:",
      this.instructions,
    ];

    if (this.jobId) lines.push(`Job ID: ${this.jobId}`);
    if (this.fileId) lines.push(`File ID: ${this.fileId}`);
    if (this.retryable) lines.push("This error is retryable.");
    if (this.cause) lines.push(`Caused by: ${this.cause.message}`);

    return lines.join("\n");
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      feature: this.feature,
      instructions: this.instructions,
      jobId: this.jobId,
      fileId: this.fileId,
      retryable: this.retryable,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

// =============================================================================
// COMMON ERROR MESSAGES
// =============================================================================

export const WHISPER_NOT_FOUND_INSTRUCTIONS = `
WhisperX/Whisper binary not found. Install it using one of these methods:

Option 1: Install whisperx (recommended for accuracy):
  pip install whisperx
  # Or with conda:
  conda install -c conda-forge whisperx

Option 2: Install OpenAI whisper:
  pip install openai-whisper

Option 3: Use whisper.cpp (fastest):
  git clone https://github.com/ggerganov/whisper.cpp
  cd whisper.cpp && make
  # Set WHISPER_BINARY_PATH=/path/to/whisper.cpp/main

After installation, set the environment variable:
  export WHISPER_BINARY_PATH=/path/to/whisper

For Docker, use the whisperx container:
  docker pull ghcr.io/m-bain/whisperx:latest
`;

export const WHISPER_MODEL_INSTRUCTIONS = `
Whisper model not found. Download it using:

For whisperx:
  # Models are downloaded automatically on first run
  # Or manually: whisperx --model base --download

For OpenAI whisper:
  whisper --model base --help  # Downloads on first use

For whisper.cpp:
  cd whisper.cpp
  bash models/download-ggml-model.sh base

Available models: tiny, base, small, medium, large, large-v2, large-v3
Set the model using: export WHISPER_MODEL=base
`;

export const GOOGLE_STT_INSTRUCTIONS = `
Google Speech-to-Text authentication failed.

1. Create a service account in Google Cloud Console
2. Enable the Speech-to-Text API
3. Download the JSON key file
4. Set the environment variable:
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

For long audio files (>1 minute), you also need:
5. Create a GCS bucket for temporary storage
6. Set: export GCS_BUCKET=your-bucket-name

Documentation: https://cloud.google.com/speech-to-text/docs/quickstart-client-libraries
`;

// =============================================================================
// CHUNKING OPTIONS
// =============================================================================

export interface ChunkingOptions {
  /** Maximum tokens per chunk (default: 800) */
  maxTokens?: number;
  /** Maximum seconds per chunk (default: 90) */
  maxSeconds?: number;
  /** Preserve sentence boundaries when chunking (default: true) */
  preserveSentences?: boolean;
  /** Custom tokenizer function (default: chars/4) */
  tokenizer?: (text: string) => number;
  /** Module ID for chunk_id generation */
  moduleId?: string;
  /** File ID for chunk_id generation */
  fileId?: string;
  /** Source file name */
  sourceFile?: string;
  /** Storage provider */
  provider?: ContextChunk["provider"];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Estimate token count (rough approximation).
 * Uses ~4 characters per token for English.
 */
export function estimateTokens(text: string): number {
  // More accurate: count words and multiply by ~1.33
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount * 1.33);
}

/**
 * Format seconds as HH:MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Create slide_or_page string from timestamps
 */
export function formatTimeRange(startSec: number, endSec: number): string {
  return `${formatTimestamp(startSec)}-${formatTimestamp(endSec)}`;
}

/**
 * Generate a unique chunk ID
 */
export function generateChunkId(
  moduleId: string,
  fileId: string,
  startMs: number,
  endMs: number
): string {
  return `${moduleId}::${fileId}::chunk_${startMs}-${endMs}`;
}

/**
 * Round to 2 decimal places (for timestamps)
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// =============================================================================
// PII REDACTION
// =============================================================================

/**
 * Simple PII redaction patterns
 */
const PII_PATTERNS = [
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL]" },
  // Phone numbers (various formats)
  { pattern: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: "[PHONE]" },
  // SSN
  { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: "[SSN]" },
  // Credit card numbers
  { pattern: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, replacement: "[CARD]" },
  // IP addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: "[IP]" },
];

/**
 * Redact PII from text
 */
export function redactPII(text: string): string {
  let redacted = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

/**
 * Check if text contains potential PII
 */
export function containsPII(text: string): boolean {
  return PII_PATTERNS.some(({ pattern }) => pattern.test(text));
}
