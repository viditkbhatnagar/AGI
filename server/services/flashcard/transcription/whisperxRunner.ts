/**
 * WhisperX/Whisper Transcription Runner
 * 
 * Executes whisper/whisperx binary to transcribe audio/video files.
 * Parses JSON output to extract timestamped segments.
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
    TranscriptSegment,
    WhisperTranscript,
    TranscriptionError,
    DEFAULT_CONFIG,
    WHISPER_NOT_FOUND_INSTRUCTIONS,
    WHISPER_MODEL_INSTRUCTIONS,
    round2,
} from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface WhisperParams {
    /** Path to audio/video file */
    filePath: string;
    /** Whisper model to use */
    model?: string;
    /** Language code */
    language?: string;
    /** Path to whisper binary */
    whisperBinaryPath?: string;
    /** Output directory for JSON */
    outputDir?: string;
    /** Job ID for logging */
    jobId?: string;
    /** Timeout in milliseconds */
    timeoutMs?: number;
}

// =============================================================================
// MAIN TRANSCRIPTION FUNCTION
// =============================================================================

/**
 * Transcribe audio/video file using WhisperX or OpenAI Whisper.
 * 
 * @param params - Transcription parameters
 * @returns Promise resolving to WhisperTranscript with segments
 */
export async function transcribeWithWhisperX(
    params: WhisperParams
): Promise<WhisperTranscript> {
    const {
        filePath,
        model = DEFAULT_CONFIG.whisperModel,
        language = DEFAULT_CONFIG.language,
        whisperBinaryPath = DEFAULT_CONFIG.whisperBinaryPath,
        outputDir = DEFAULT_CONFIG.tmpDir,
        jobId = "unknown",
        timeoutMs = 600000, // 10 minutes default
    } = params;

    // Validate file exists
    if (!fs.existsSync(filePath)) {
        throw new TranscriptionError({
            message: `Input file not found: ${filePath}`,
            feature: "whisper_binary",
            instructions: "Ensure the file path is correct and the file exists.",
            jobId,
            retryable: false,
        });
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Check if whisper binary exists
    const binaryExists = await checkBinaryExists(whisperBinaryPath);
    if (!binaryExists) {
        throw new TranscriptionError({
            message: `Whisper binary not found: ${whisperBinaryPath}`,
            feature: "whisper_binary",
            instructions: WHISPER_NOT_FOUND_INSTRUCTIONS,
            jobId,
            retryable: false,
        });
    }

    // Build command arguments
    const args = buildWhisperArgs({
        filePath,
        model,
        language,
        outputDir,
        whisperBinaryPath,
    });

    console.log(`[WhisperX] Starting transcription for ${filePath}`);
    console.log(`[WhisperX] Command: ${whisperBinaryPath} ${args.join(" ")}`);

    // Execute whisper
    const result = await runWhisperProcess(whisperBinaryPath, args, jobId, timeoutMs);

    // Parse output
    const transcript = parseWhisperOutput(result, filePath, outputDir, model, language);

    console.log(`[WhisperX] Completed: ${transcript.segments.length} segments, ${transcript.duration}s`);

    return transcript;
}

// =============================================================================
// BINARY CHECK
// =============================================================================

/**
 * Check if the whisper binary exists and is executable
 */
async function checkBinaryExists(binaryPath: string): Promise<boolean> {
    return new Promise((resolve) => {
        const child = spawn(binaryPath, ["--help"], {
            stdio: "pipe",
            shell: process.platform === "win32",
        });

        let resolved = false;

        child.on("error", () => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        });

        child.on("close", (code) => {
            if (!resolved) {
                resolved = true;
                // Some versions return 0, some return 1 for --help
                resolve(code !== null);
            }
        });

        // Timeout after 3 seconds
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                child.kill();
                resolve(false);
            }
        }, 3000);
    });
}

// =============================================================================
// BUILD ARGUMENTS
// =============================================================================

interface ArgParams {
    filePath: string;
    model: string;
    language: string;
    outputDir: string;
    whisperBinaryPath: string;
}

/**
 * Build whisper CLI arguments based on binary type
 */
function buildWhisperArgs(params: ArgParams): string[] {
    const { filePath, model, language, outputDir, whisperBinaryPath } = params;
    const binaryName = path.basename(whisperBinaryPath).toLowerCase();

    // WhisperX arguments
    if (binaryName.includes("whisperx")) {
        return [
            filePath,
            "--model", model,
            "--language", language,
            "--output_dir", outputDir,
            "--output_format", "json",
            "--compute_type", "float32", // CPU friendly
        ];
    }

    // OpenAI Whisper arguments
    if (binaryName === "whisper") {
        return [
            filePath,
            "--model", model,
            "--language", language,
            "--output_dir", outputDir,
            "--output_format", "json",
            "--fp16", "False", // CPU compatibility
        ];
    }

    // whisper.cpp arguments (main binary)
    if (binaryName === "main" || binaryName.includes("whisper.cpp")) {
        const modelPath = process.env.WHISPER_MODEL_PATH || `models/ggml-${model}.bin`;
        return [
            "-m", modelPath,
            "-f", filePath,
            "-l", language,
            "-oj", // Output JSON
            "-of", path.join(outputDir, path.basename(filePath, path.extname(filePath))),
        ];
    }

    // Default: assume OpenAI whisper format
    return [
        filePath,
        "--model", model,
        "--language", language,
        "--output_dir", outputDir,
        "--output_format", "json",
    ];
}

// =============================================================================
// PROCESS EXECUTION
// =============================================================================

interface ProcessResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Run the whisper process and capture output
 */
function runWhisperProcess(
    binaryPath: string,
    args: string[],
    jobId: string,
    timeoutMs: number
): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(binaryPath, args, {
            stdio: "pipe",
            shell: process.platform === "win32",
        });

        let stdout = "";
        let stderr = "";
        let timedOut = false;

        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
        }, timeoutMs);

        child.stdout?.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
            stderr += data.toString();
            // Log progress for long-running transcriptions
            const line = data.toString().trim();
            if (line.includes("%") || line.includes("Transcribing")) {
                console.log(`[WhisperX] ${line}`);
            }
        });

        child.on("error", (error) => {
            clearTimeout(timeout);
            reject(new TranscriptionError({
                message: `Failed to spawn whisper process: ${error.message}`,
                feature: "whisper_binary",
                instructions: WHISPER_NOT_FOUND_INSTRUCTIONS,
                jobId,
                cause: error,
                retryable: false,
            }));
        });

        child.on("close", (code) => {
            clearTimeout(timeout);

            if (timedOut) {
                reject(new TranscriptionError({
                    message: `Transcription timed out after ${timeoutMs / 1000}s`,
                    feature: "whisper_binary",
                    instructions: "Consider using a smaller model or shorter audio file.",
                    jobId,
                    retryable: true,
                }));
                return;
            }

            if (code !== 0) {
                // Check for common errors
                if (stderr.includes("model") && stderr.includes("not found")) {
                    reject(new TranscriptionError({
                        message: `Whisper model not found`,
                        feature: "whisper_model",
                        instructions: WHISPER_MODEL_INSTRUCTIONS,
                        jobId,
                        retryable: false,
                    }));
                    return;
                }

                reject(new TranscriptionError({
                    message: `Whisper exited with code ${code}: ${stderr.slice(0, 500)}`,
                    feature: "whisper_binary",
                    instructions: `Check whisper installation. Stderr: ${stderr.slice(0, 200)}`,
                    jobId,
                    retryable: code === 137 || code === 143, // Killed by signal
                }));
                return;
            }

            resolve({ stdout, stderr, exitCode: code || 0 });
        });
    });
}

// =============================================================================
// OUTPUT PARSING
// =============================================================================

/**
 * Parse whisper output (JSON file or stdout) into transcript
 */
function parseWhisperOutput(
    result: ProcessResult,
    inputFilePath: string,
    outputDir: string,
    model: string,
    language: string
): WhisperTranscript {
    // Try to find output JSON file
    const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
    const jsonFile = path.join(outputDir, `${baseName}.json`);

    let segments: TranscriptSegment[] = [];
    let rawContent: string | null = null;

    // First, try reading from output JSON file
    if (fs.existsSync(jsonFile)) {
        rawContent = fs.readFileSync(jsonFile, "utf-8");
        segments = parseJsonContent(rawContent);
    }

    // If no segments yet, try parsing stdout
    if (segments.length === 0 && result.stdout.trim()) {
        try {
            segments = parseJsonContent(result.stdout);
        } catch {
            // Stdout might not be JSON
        }
    }

    // Calculate duration from segments
    const duration = segments.length > 0
        ? segments[segments.length - 1].end
        : 0;

    return {
        segments,
        language,
        duration: round2(duration),
        model,
        rawOutputPath: fs.existsSync(jsonFile) ? jsonFile : undefined,
    };
}

/**
 * Parse JSON content from whisper output
 */
function parseJsonContent(content: string): TranscriptSegment[] {
    try {
        const data = JSON.parse(content);

        // WhisperX format: { segments: [...] }
        if (data.segments && Array.isArray(data.segments)) {
            return data.segments.map(normalizeSegment);
        }

        // Direct array of segments
        if (Array.isArray(data)) {
            return data.map(normalizeSegment);
        }

        // whisper.cpp format: { transcription: [...] }
        if (data.transcription && Array.isArray(data.transcription)) {
            return data.transcription.map(normalizeSegment);
        }

        return [];
    } catch (error) {
        console.warn("[WhisperX] Failed to parse JSON output:", error);
        return [];
    }
}

/**
 * Normalize a segment from various whisper output formats
 */
function normalizeSegment(raw: Record<string, unknown>): TranscriptSegment {
    // Handle different timestamp formats
    let start = 0;
    let end = 0;

    if (typeof raw.start === "number") {
        start = raw.start;
    } else if (typeof raw.t0 === "number") {
        start = raw.t0;
    } else if (typeof raw.start === "string") {
        start = parseFloat(raw.start) || 0;
    }

    if (typeof raw.end === "number") {
        end = raw.end;
    } else if (typeof raw.t1 === "number") {
        end = raw.t1;
    } else if (typeof raw.end === "string") {
        end = parseFloat(raw.end) || 0;
    }

    // Handle text
    const text = (raw.text || raw.content || "").toString().trim();

    // Handle words if present
    let words: TranscriptSegment["words"];
    if (raw.words && Array.isArray(raw.words)) {
        words = (raw.words as Record<string, unknown>[]).map((w) => ({
            word: (w.word || w.text || "").toString(),
            start: typeof w.start === "number" ? w.start : 0,
            end: typeof w.end === "number" ? w.end : 0,
            confidence: typeof w.confidence === "number" ? w.confidence : undefined,
        }));
    }

    return {
        start: round2(start),
        end: round2(end),
        text,
        words,
        confidence: typeof raw.confidence === "number" ? raw.confidence : undefined,
    };
}

// =============================================================================
// MOCK TRANSCRIPTION (for testing)
// =============================================================================

/**
 * Mock transcription for testing without whisper binary.
 * Returns deterministic segments based on file name.
 */
export function mockTranscribe(filePath: string): WhisperTranscript {
    const baseName = path.basename(filePath);

    // Generate mock segments
    const segments: TranscriptSegment[] = [
        { start: 0, end: 5.5, text: "Welcome to this lecture." },
        { start: 5.5, end: 12.2, text: "Today we will discuss important topics." },
        { start: 12.2, end: 20.0, text: "Let's begin with the fundamentals." },
        { start: 20.0, end: 28.5, text: "These concepts are essential for understanding the subject." },
        { start: 28.5, end: 35.0, text: "Now let's look at some practical examples." },
    ];

    return {
        segments,
        language: "en",
        duration: 35.0,
        model: "mock",
        rawOutputPath: undefined,
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    checkBinaryExists,
    buildWhisperArgs,
    parseJsonContent,
    normalizeSegment,
};
