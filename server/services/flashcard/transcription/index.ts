/**
 * Transcription Module Index
 * 
 * Exports all transcription-related functions and types.
 */

// Types
export * from "./types";

// Chunker
export {
    chunkTranscript,
    splitLargeSegment,
    preprocessSegments,
    mergeSmallSegments,
} from "./chunker";

// Whisper Runner
export {
    transcribeWithWhisperX,
    mockTranscribe,
} from "./whisperxRunner";

// Google STT Runner
export {
    transcribeWithGoogleSTT,
    mockGoogleSTT,
} from "./googleSttRunner";

// Main Orchestrator
export {
    transcribeAndChunk,
    batchTranscribeAndChunk,
    type TranscribeAndChunkParams,
    type TranscribeResult,
    type BatchTranscribeParams,
    type BatchTranscribeResult,
} from "./transcribeAndChunk";
