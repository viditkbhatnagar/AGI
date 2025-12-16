/**
 * Google Speech-to-Text Transcription Runner
 * 
 * Cloud-based transcription using Google Cloud Speech-to-Text API.
 * Supports long-running recognition for files > 1 minute.
 */

import * as fs from "fs";
import * as path from "path";
import {
    TranscriptSegment,
    WhisperTranscript,
    TranscriptionError,
    GOOGLE_STT_INSTRUCTIONS,
    round2,
} from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface GoogleSTTParams {
    /** Path to local audio file */
    filePath: string;
    /** Language code (e.g., 'en-US') */
    language?: string;
    /** GCS bucket for long audio (optional) */
    gcsBucket?: string;
    /** Job ID for logging */
    jobId?: string;
}

interface WordInfo {
    word: string;
    startTime: { seconds: string; nanos: number };
    endTime: { seconds: string; nanos: number };
    confidence?: number;
}

interface SpeechRecognitionResult {
    alternatives: Array<{
        transcript: string;
        confidence: number;
        words?: WordInfo[];
    }>;
}

// =============================================================================
// MAIN TRANSCRIPTION FUNCTION
// =============================================================================

/**
 * Transcribe audio file using Google Cloud Speech-to-Text.
 * 
 * @param params - Transcription parameters
 * @returns Promise resolving to WhisperTranscript with segments
 */
export async function transcribeWithGoogleSTT(
    params: GoogleSTTParams
): Promise<WhisperTranscript> {
    const {
        filePath,
        language = "en-US",
        gcsBucket = process.env.GCS_BUCKET,
        jobId = "unknown",
    } = params;

    // Check for Google credentials
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) {
        throw new TranscriptionError({
            message: "Google Cloud credentials not configured",
            feature: "google_stt",
            instructions: GOOGLE_STT_INSTRUCTIONS,
            jobId,
            retryable: false,
        });
    }

    // Validate file exists
    if (!fs.existsSync(filePath)) {
        throw new TranscriptionError({
            message: `Input file not found: ${filePath}`,
            feature: "file_download",
            instructions: "Ensure the file path is correct and the file exists.",
            jobId,
            retryable: false,
        });
    }

    try {
        // Dynamic import to avoid requiring google-cloud when not used
        const { SpeechClient } = await import("@google-cloud/speech").catch(() => {
            throw new TranscriptionError({
                message: "Google Cloud Speech library not installed",
                feature: "google_stt",
                instructions: "Install with: npm install @google-cloud/speech",
                jobId,
                retryable: false,
            });
        });

        const client = new SpeechClient();

        // Get file info
        const stats = fs.statSync(filePath);
        const fileSizeBytes = stats.size;
        const isLongAudio = fileSizeBytes > 10 * 1024 * 1024; // > 10MB

        console.log(`[GoogleSTT] Starting transcription for ${filePath} (${fileSizeBytes} bytes)`);

        let results: SpeechRecognitionResult[];

        if (isLongAudio && gcsBucket) {
            // Use async recognition for long audio
            results = await transcribeLongAudio(client, filePath, gcsBucket, language, jobId);
        } else {
            // Use sync recognition for short audio
            results = await transcribeShortAudio(client, filePath, language, jobId);
        }

        // Convert results to segments
        const segments = resultsToSegments(results);

        console.log(`[GoogleSTT] Completed: ${segments.length} segments`);

        const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

        return {
            segments,
            language,
            duration: round2(duration),
            model: "google-stt",
        };
    } catch (error) {
        if (error instanceof TranscriptionError) {
            throw error;
        }

        const message = error instanceof Error ? error.message : "Unknown error";

        // Check for specific Google API errors
        if (message.includes("403") || message.includes("permission")) {
            throw new TranscriptionError({
                message: `Google API permission denied: ${message}`,
                feature: "google_stt",
                instructions: GOOGLE_STT_INSTRUCTIONS,
                jobId,
                cause: error instanceof Error ? error : undefined,
                retryable: false,
            });
        }

        if (message.includes("429") || message.includes("quota")) {
            throw new TranscriptionError({
                message: `Google API quota exceeded: ${message}`,
                feature: "google_stt",
                instructions: "Wait and retry, or upgrade your Google Cloud quota.",
                jobId,
                cause: error instanceof Error ? error : undefined,
                retryable: true,
            });
        }

        throw new TranscriptionError({
            message: `Google STT failed: ${message}`,
            feature: "google_stt",
            instructions: "Check Google Cloud configuration and network connectivity.",
            jobId,
            cause: error instanceof Error ? error : undefined,
            retryable: true,
        });
    }
}

// =============================================================================
// SHORT AUDIO (SYNC RECOGNITION)
// =============================================================================

async function transcribeShortAudio(
    client: any,
    filePath: string,
    language: string,
    jobId: string
): Promise<SpeechRecognitionResult[]> {
    // Read file content
    const audioBytes = fs.readFileSync(filePath).toString("base64");

    // Detect encoding from file extension
    const ext = path.extname(filePath).toLowerCase();
    const encoding = getAudioEncoding(ext);

    const request = {
        audio: { content: audioBytes },
        config: {
            encoding,
            sampleRateHertz: getSampleRate(ext),
            languageCode: language,
            enableWordTimeOffsets: true,
            enableAutomaticPunctuation: true,
            model: "latest_long",
        },
    };

    console.log(`[GoogleSTT] Using sync recognition for ${filePath}`);

    const [response] = await client.recognize(request);
    return response.results || [];
}

// =============================================================================
// LONG AUDIO (ASYNC RECOGNITION)
// =============================================================================

async function transcribeLongAudio(
    client: any,
    filePath: string,
    gcsBucket: string,
    language: string,
    jobId: string
): Promise<SpeechRecognitionResult[]> {
    // For long audio, we need to upload to GCS first
    const { Storage } = await import("@google-cloud/storage").catch(() => {
        throw new TranscriptionError({
            message: "Google Cloud Storage library not installed",
            feature: "google_stt",
            instructions: "Install with: npm install @google-cloud/storage",
            jobId,
            retryable: false,
        });
    });

    const storage = new Storage();
    const bucket = storage.bucket(gcsBucket);

    const fileName = `transcription-${jobId}-${Date.now()}${path.extname(filePath)}`;
    const gcsUri = `gs://${gcsBucket}/${fileName}`;

    console.log(`[GoogleSTT] Uploading to GCS: ${gcsUri}`);

    // Upload file
    await bucket.upload(filePath, {
        destination: fileName,
        metadata: { contentType: "audio/mpeg" },
    });

    try {
        const ext = path.extname(filePath).toLowerCase();
        const encoding = getAudioEncoding(ext);

        const request = {
            audio: { uri: gcsUri },
            config: {
                encoding,
                sampleRateHertz: getSampleRate(ext),
                languageCode: language,
                enableWordTimeOffsets: true,
                enableAutomaticPunctuation: true,
                model: "latest_long",
            },
        };

        console.log(`[GoogleSTT] Starting long-running recognition for ${gcsUri}`);

        const [operation] = await client.longRunningRecognize(request);
        const [response] = await operation.promise();

        return response.results || [];
    } finally {
        // Clean up GCS file
        try {
            await bucket.file(fileName).delete();
            console.log(`[GoogleSTT] Cleaned up GCS file: ${fileName}`);
        } catch (e) {
            console.warn(`[GoogleSTT] Failed to clean up GCS file: ${fileName}`);
        }
    }
}

// =============================================================================
// RESULT CONVERSION
// =============================================================================

/**
 * Convert Google STT results to transcript segments.
 * Groups words into natural segments based on timing and punctuation.
 */
function resultsToSegments(results: SpeechRecognitionResult[]): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];

    for (const result of results) {
        if (!result.alternatives || result.alternatives.length === 0) continue;

        const alt = result.alternatives[0];

        // If word timings are available, create segments from words
        if (alt.words && alt.words.length > 0) {
            const wordSegments = groupWordsIntoSegments(alt.words);
            segments.push(...wordSegments);
        } else {
            // Fallback: use the entire transcript as one segment
            segments.push({
                start: 0,
                end: 0,
                text: alt.transcript,
                confidence: alt.confidence,
            });
        }
    }

    return segments;
}

/**
 * Group words into segments based on timing and sentence boundaries.
 * Creates segments of 2-8 seconds or at sentence boundaries.
 */
function groupWordsIntoSegments(words: WordInfo[]): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    let currentWords: WordInfo[] = [];
    let segmentStart = 0;

    const MIN_SEGMENT_DURATION = 2; // seconds
    const MAX_SEGMENT_DURATION = 8; // seconds

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordStart = parseGoogleTime(word.startTime);
        const wordEnd = parseGoogleTime(word.endTime);

        if (currentWords.length === 0) {
            segmentStart = wordStart;
        }

        currentWords.push(word);

        const currentDuration = wordEnd - segmentStart;
        const isSentenceEnd = word.word.match(/[.!?]$/);
        const isLongEnough = currentDuration >= MIN_SEGMENT_DURATION;
        const isTooLong = currentDuration >= MAX_SEGMENT_DURATION;

        // Create segment at sentence boundary or when too long
        if ((isSentenceEnd && isLongEnough) || isTooLong) {
            segments.push({
                start: round2(segmentStart),
                end: round2(wordEnd),
                text: currentWords.map(w => w.word).join(" "),
                words: currentWords.map(w => ({
                    word: w.word,
                    start: parseGoogleTime(w.startTime),
                    end: parseGoogleTime(w.endTime),
                    confidence: w.confidence,
                })),
            });
            currentWords = [];
        }
    }

    // Handle remaining words
    if (currentWords.length > 0) {
        const lastWord = currentWords[currentWords.length - 1];
        segments.push({
            start: round2(segmentStart),
            end: round2(parseGoogleTime(lastWord.endTime)),
            text: currentWords.map(w => w.word).join(" "),
            words: currentWords.map(w => ({
                word: w.word,
                start: parseGoogleTime(w.startTime),
                end: parseGoogleTime(w.endTime),
                confidence: w.confidence,
            })),
        });
    }

    return segments;
}

/**
 * Parse Google's time format to seconds
 */
function parseGoogleTime(time: { seconds: string; nanos: number }): number {
    const seconds = parseInt(time.seconds || "0", 10);
    const nanos = time.nanos || 0;
    return seconds + nanos / 1e9;
}

// =============================================================================
// AUDIO FORMAT DETECTION
// =============================================================================

function getAudioEncoding(ext: string): string {
    const encodings: Record<string, string> = {
        ".mp3": "MP3",
        ".wav": "LINEAR16",
        ".flac": "FLAC",
        ".ogg": "OGG_OPUS",
        ".webm": "WEBM_OPUS",
        ".m4a": "MP3",
        ".mp4": "MP3", // Audio track
    };
    return encodings[ext] || "ENCODING_UNSPECIFIED";
}

function getSampleRate(ext: string): number {
    const rates: Record<string, number> = {
        ".mp3": 16000,
        ".wav": 16000,
        ".flac": 16000,
        ".ogg": 16000,
        ".webm": 48000,
        ".m4a": 16000,
        ".mp4": 16000,
    };
    return rates[ext] || 16000;
}

// =============================================================================
// MOCK FOR TESTING
// =============================================================================

/**
 * Mock Google STT for testing without credentials.
 */
export function mockGoogleSTT(filePath: string): WhisperTranscript {
    return {
        segments: [
            { start: 0, end: 4.5, text: "This is a mock Google STT transcription." },
            { start: 4.5, end: 9.2, text: "It returns deterministic content for testing." },
            { start: 9.2, end: 15.0, text: "Actual implementation requires Google Cloud credentials." },
        ],
        language: "en-US",
        duration: 15.0,
        model: "google-stt-mock",
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    parseGoogleTime,
    groupWordsIntoSegments,
    getAudioEncoding,
    getSampleRate,
};
