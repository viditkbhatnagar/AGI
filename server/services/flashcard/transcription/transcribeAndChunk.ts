/**
 * Transcribe and Chunk Orchestrator
 * 
 * High-level function that downloads media, transcribes it,
 * and produces ContextChunks ready for the RAG pipeline.
 */

import * as fs from "fs";
import * as path from "path";
import {
  ContextChunk,
  TranscriptionError,
  DEFAULT_CONFIG,
  estimateTokens,
  redactPII,
  containsPII,
} from "./types";
import { chunkTranscript, preprocessSegments } from "./chunker";
import { transcribeWithWhisperX, mockTranscribe } from "./whisperxRunner";
import { transcribeWithGoogleSTT, mockGoogleSTT } from "./googleSttRunner";

// =============================================================================
// TYPES
// =============================================================================

export interface TranscribeAndChunkParams {
  /** Local file path (if already downloaded) */
  filePath?: string;
  /** Unique file identifier */
  file_id: string;
  /** Original file name */
  file_name: string;
  /** Storage provider */
  provider: "google_drive" | "onedrive" | "local";
  /** Module ID for chunk generation */
  module_id: string;
  /** Maximum tokens per chunk */
  chunkTokens?: number;
  /** Maximum seconds per chunk */
  chunkSeconds?: number;
  /** Target language */
  language?: string;
  /** Job ID for logging */
  jobId?: string;
  /** Remote URL (for cloud files) */
  remoteUrl?: string;
  /** Whether to redact PII */
  redactPii?: boolean;
}

export interface TranscribeResult {
  /** Generated chunks */
  chunks: ContextChunk[];
  /** Total transcription duration in seconds */
  duration: number;
  /** Language detected/used */
  language: string;
  /** Whether PII was redacted */
  piiRedacted: boolean;
  /** Raw transcript path (if saved) */
  rawTranscriptPath?: string;
}

// =============================================================================
// MAIN ORCHESTRATION FUNCTION
// =============================================================================

/**
 * Download (if needed), transcribe, and chunk a media file.
 * 
 * @param params - Transcription and chunking parameters
 * @returns Promise with generated chunks and metadata
 */
export async function transcribeAndChunk(
  params: TranscribeAndChunkParams
): Promise<TranscribeResult> {
  const {
    file_id,
    file_name,
    provider,
    module_id,
    chunkTokens = DEFAULT_CONFIG.maxChunkTokens,
    chunkSeconds = DEFAULT_CONFIG.maxChunkSeconds,
    language = DEFAULT_CONFIG.language,
    jobId = "unknown",
    redactPii = true,
  } = params;

  let { filePath } = params;

  console.log(`[TranscribeAndChunk] Starting for ${file_name} (${file_id})`);
  console.log(`[TranscribeAndChunk] Provider: ${provider}, Module: ${module_id}`);

  // Step 1: Ensure file is downloaded
  if (!filePath) {
    filePath = await downloadFile({
      file_id,
      file_name,
      provider,
      remoteUrl: params.remoteUrl,
      jobId,
    });
  }

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new TranscriptionError({
      message: `File not found: ${filePath}`,
      feature: "file_download",
      instructions: "Ensure the file was downloaded correctly or provide a valid path.",
      jobId,
      fileId: file_id,
      retryable: false,
    });
  }

  console.log(`[TranscribeAndChunk] File path: ${filePath}`);

  // Step 2: Transcribe based on provider
  const transcribeProvider = process.env.TRANSCRIBE_PROVIDER || "whisper";
  let transcript;

  switch (transcribeProvider) {
    case "whisper":
      transcript = await transcribeWithWhisperX({
        filePath,
        language,
        jobId,
        model: DEFAULT_CONFIG.whisperModel,
        whisperBinaryPath: DEFAULT_CONFIG.whisperBinaryPath,
        outputDir: DEFAULT_CONFIG.tmpDir,
      });
      break;

    case "google_stt":
      transcript = await transcribeWithGoogleSTT({
        filePath,
        language,
        gcsBucket: DEFAULT_CONFIG.gcsBucket,
        jobId,
      });
      break;

    case "mock":
      // Use mock for testing
      transcript = mockTranscribe(filePath);
      break;

    default:
      throw new TranscriptionError({
        message: `Unknown transcription provider: ${transcribeProvider}`,
        feature: "unknown",
        instructions: "Set TRANSCRIBE_PROVIDER to 'whisper', 'google_stt', or 'mock'",
        jobId,
        retryable: false,
      });
  }

  console.log(`[TranscribeAndChunk] Transcription complete: ${transcript.segments.length} segments`);

  // Step 3: Preprocess segments
  const preprocessedSegments = preprocessSegments(transcript.segments, chunkTokens);

  // Step 4: Optionally redact PII
  let piiRedacted = false;
  const segmentsForChunking = redactPii
    ? preprocessedSegments.map((seg) => {
      if (containsPII(seg.text)) {
        piiRedacted = true;
        return { ...seg, text: redactPII(seg.text) };
      }
      return seg;
    })
    : preprocessedSegments;

  if (piiRedacted) {
    console.log(`[TranscribeAndChunk] PII redaction applied`);
  }

  // Step 5: Chunk transcript
  const chunks = chunkTranscript(segmentsForChunking, {
    maxTokens: chunkTokens,
    maxSeconds: chunkSeconds,
    preserveSentences: true,
    moduleId: module_id,
    fileId: file_id,
    sourceFile: file_name,
    provider,
    tokenizer: estimateTokens,
  });

  console.log(`[TranscribeAndChunk] Created ${chunks.length} chunks`);

  return {
    chunks,
    duration: transcript.duration,
    language: transcript.language,
    piiRedacted,
    rawTranscriptPath: transcript.rawOutputPath,
  };
}

// =============================================================================
// FILE DOWNLOAD
// =============================================================================

interface DownloadParams {
  file_id: string;
  file_name: string;
  provider: "google_drive" | "onedrive" | "local";
  remoteUrl?: string;
  jobId: string;
}

/**
 * Download file from cloud storage to local tmp directory.
 * This is a placeholder - implement actual download logic based on provider.
 */
async function downloadFile(params: DownloadParams): Promise<string> {
  const { file_id, file_name, provider, remoteUrl, jobId } = params;

  const tmpDir = DEFAULT_CONFIG.tmpDir;
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const localPath = path.join(tmpDir, `${file_id}_${file_name}`);

  // If file already exists locally, return it
  if (fs.existsSync(localPath)) {
    console.log(`[Download] File already exists: ${localPath}`);
    return localPath;
  }

  switch (provider) {
    case "local":
      // For local files, the remoteUrl should be the actual path
      if (remoteUrl && fs.existsSync(remoteUrl)) {
        return remoteUrl;
      }
      throw new TranscriptionError({
        message: `Local file not found: ${remoteUrl || file_name}`,
        feature: "file_download",
        instructions: "Provide the correct file path for local files.",
        jobId,
        fileId: file_id,
        retryable: false,
      });

    case "google_drive":
      return await downloadFromGoogleDrive(file_id, localPath, jobId);

    case "onedrive":
      return await downloadFromOneDrive(file_id, localPath, jobId);

    default:
      throw new TranscriptionError({
        message: `Unsupported provider: ${provider}`,
        feature: "file_download",
        instructions: "Use 'google_drive', 'onedrive', or 'local'.",
        jobId,
        fileId: file_id,
        retryable: false,
      });
  }
}

/**
 * Download file from Google Drive.
 * Placeholder - implement with actual Google Drive API.
 */
async function downloadFromGoogleDrive(
  fileId: string,
  localPath: string,
  jobId: string
): Promise<string> {
  // TODO: Implement actual Google Drive download
  // This would use the Google Drive API:
  // const { google } = require('googleapis');
  // const drive = google.drive({ version: 'v3', auth });
  // const dest = fs.createWriteStream(localPath);
  // const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  // res.data.pipe(dest);

  throw new TranscriptionError({
    message: "Google Drive download not yet implemented",
    feature: "file_download",
    instructions: `
To implement Google Drive download:
1. Set up Google Drive API credentials
2. Install googleapis: npm install googleapis
3. Implement download logic in downloadFromGoogleDrive function

For now, provide a local file path using provider: 'local'
    `.trim(),
    jobId,
    fileId,
    retryable: false,
  });
}

/**
 * Download file from OneDrive.
 * Placeholder - implement with actual Microsoft Graph API.
 */
async function downloadFromOneDrive(
  fileId: string,
  localPath: string,
  jobId: string
): Promise<string> {
  // TODO: Implement actual OneDrive download
  // This would use the Microsoft Graph API

  throw new TranscriptionError({
    message: "OneDrive download not yet implemented",
    feature: "file_download",
    instructions: `
To implement OneDrive download:
1. Set up Microsoft Graph API credentials
2. Install @microsoft/microsoft-graph-client
3. Implement download logic in downloadFromOneDrive function

For now, provide a local file path using provider: 'local'
    `.trim(),
    jobId,
    fileId,
    retryable: false,
  });
}

// =============================================================================
// BATCH TRANSCRIPTION
// =============================================================================

export interface BatchTranscribeParams {
  files: Array<{
    file_id: string;
    file_name: string;
    path?: string;
    url?: string;
  }>;
  provider: "google_drive" | "onedrive" | "local";
  module_id: string;
  jobId: string;
}

export interface BatchTranscribeResult {
  successful: Array<{
    file_id: string;
    chunks: ContextChunk[];
    duration: number;
  }>;
  failed: Array<{
    file_id: string;
    error: string;
  }>;
  totalChunks: number;
  totalDuration: number;
}

/**
 * Transcribe multiple files in batch.
 */
export async function batchTranscribeAndChunk(
  params: BatchTranscribeParams
): Promise<BatchTranscribeResult> {
  const { files, provider, module_id, jobId } = params;

  const result: BatchTranscribeResult = {
    successful: [],
    failed: [],
    totalChunks: 0,
    totalDuration: 0,
  };

  for (const file of files) {
    try {
      const transcribeResult = await transcribeAndChunk({
        filePath: file.path,
        file_id: file.file_id,
        file_name: file.file_name,
        provider,
        module_id,
        jobId,
        remoteUrl: file.url,
      });

      result.successful.push({
        file_id: file.file_id,
        chunks: transcribeResult.chunks,
        duration: transcribeResult.duration,
      });

      result.totalChunks += transcribeResult.chunks.length;
      result.totalDuration += transcribeResult.duration;

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[BatchTranscribe] Failed for ${file.file_id}: ${message}`);

      result.failed.push({
        file_id: file.file_id,
        error: message,
      });
    }
  }

  return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { downloadFile };
