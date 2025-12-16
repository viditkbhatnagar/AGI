/**
 * Transcript Chunker
 * 
 * Merges transcription segments into optimally-sized chunks for RAG.
 * Respects token limits, duration limits, and sentence boundaries.
 */

import {
    TranscriptSegment,
    ContextChunk,
    ChunkingOptions,
    estimateTokens,
    formatTimeRange,
    generateChunkId,
    round2,
} from "./types";

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_MAX_SECONDS = 90;
const DEFAULT_PRESERVE_SENTENCES = true;

// =============================================================================
// SENTENCE BOUNDARY DETECTION
// =============================================================================

/**
 * Check if text ends with sentence-ending punctuation
 */
function endsWithSentence(text: string): boolean {
    return /[.!?]\s*$/.test(text.trim());
}

/**
 * Check if text starts a new sentence (capital letter after space)
 */
function startsNewSentence(text: string): boolean {
    const trimmed = text.trimStart();
    return /^[A-Z]/.test(trimmed);
}

/**
 * Find the best split point in text (preferring sentence boundaries)
 */
function findSentenceBoundary(text: string, maxChars: number): number {
    if (text.length <= maxChars) {
        return text.length;
    }

    // Look for sentence end before maxChars
    const searchWindow = text.substring(0, maxChars);

    // Find last sentence-ending punctuation
    const matches = [...searchWindow.matchAll(/[.!?]\s+/g)];

    if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const splitPoint = (lastMatch.index || 0) + lastMatch[0].length;

        // Only use this split if it's not too early (at least 50% of target)
        if (splitPoint > maxChars * 0.5) {
            return splitPoint;
        }
    }

    // Fallback: split at last space before maxChars
    const lastSpace = searchWindow.lastIndexOf(" ");
    if (lastSpace > maxChars * 0.5) {
        return lastSpace + 1;
    }

    return maxChars;
}

// =============================================================================
// MAIN CHUNKING FUNCTION
// =============================================================================

/**
 * Chunk transcript segments into optimally-sized ContextChunks.
 * 
 * @param segments - Array of transcription segments with timestamps
 * @param opts - Chunking options
 * @returns Array of ContextChunks ready for embedding
 */
export function chunkTranscript(
    segments: TranscriptSegment[],
    opts: ChunkingOptions = {}
): ContextChunk[] {
    const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
    const maxSeconds = opts.maxSeconds ?? DEFAULT_MAX_SECONDS;
    const preserveSentences = opts.preserveSentences ?? DEFAULT_PRESERVE_SENTENCES;
    const tokenizer = opts.tokenizer ?? estimateTokens;
    const moduleId = opts.moduleId || "unknown";
    const fileId = opts.fileId || "unknown";
    const sourceFile = opts.sourceFile || "unknown";
    const provider = opts.provider || "local";

    if (segments.length === 0) {
        return [];
    }

    const chunks: ContextChunk[] = [];
    let currentTexts: string[] = [];
    let currentStart: number = segments[0].start;
    let currentEnd: number = segments[0].end;
    let currentTokens = 0;

    /**
     * Finalize the current chunk and add to results
     */
    function finalizeChunk(): void {
        if (currentTexts.length === 0) return;

        const text = currentTexts.join(" ").trim();
        if (text.length === 0) return;

        const startMs = Math.floor(currentStart * 1000);
        const endMs = Math.floor(currentEnd * 1000);

        chunks.push({
            chunk_id: generateChunkId(moduleId, fileId, startMs, endMs),
            source_file: sourceFile,
            provider,
            slide_or_page: formatTimeRange(currentStart, currentEnd),
            start_sec: round2(currentStart),
            end_sec: round2(currentEnd),
            heading: null,
            text,
            tokens_est: tokenizer(text),
        });

        // Reset accumulators
        currentTexts = [];
        currentTokens = 0;
    }

    for (const segment of segments) {
        const segmentText = segment.text.trim();
        if (segmentText.length === 0) continue;

        const segmentTokens = tokenizer(segmentText);
        const segmentDuration = segment.end - segment.start;
        const currentDuration = currentEnd - currentStart;

        // Check if adding this segment would exceed limits
        const wouldExceedTokens = currentTokens + segmentTokens > maxTokens;
        const wouldExceedDuration = currentDuration + segmentDuration > maxSeconds;

        // If we need to start a new chunk
        if (currentTexts.length > 0 && (wouldExceedTokens || wouldExceedDuration)) {
            // If preserving sentences, check if current chunk ends cleanly
            if (preserveSentences) {
                const currentText = currentTexts.join(" ");
                const endsSentence = endsWithSentence(currentText);
                const startsNew = startsNewSentence(segmentText);

                // Only split if we have a clean sentence boundary
                if (endsSentence || startsNew) {
                    finalizeChunk();
                    currentStart = segment.start;
                } else if (wouldExceedTokens && currentTokens > maxTokens * 0.7) {
                    // Force split if we're well over limits
                    finalizeChunk();
                    currentStart = segment.start;
                }
            } else {
                finalizeChunk();
                currentStart = segment.start;
            }
        }

        // Add segment to current chunk
        currentTexts.push(segmentText);
        currentTokens += segmentTokens;
        currentEnd = segment.end;

        // Handle first segment setting start time
        if (currentTexts.length === 1) {
            currentStart = segment.start;
        }
    }

    // Finalize last chunk
    finalizeChunk();

    return chunks;
}

// =============================================================================
// SPLIT LARGE SEGMENTS
// =============================================================================

/**
 * Split a single large segment into multiple smaller segments.
 * Used when a single segment exceeds token limits.
 * 
 * @param segment - A large transcript segment
 * @param maxTokens - Maximum tokens per resulting segment
 * @param tokenizer - Token counting function
 */
export function splitLargeSegment(
    segment: TranscriptSegment,
    maxTokens: number,
    tokenizer: (text: string) => number = estimateTokens
): TranscriptSegment[] {
    const text = segment.text;
    const tokens = tokenizer(text);

    if (tokens <= maxTokens) {
        return [segment];
    }

    // Calculate approximate chars per split
    const numSplits = Math.ceil(tokens / maxTokens);
    const charsPerSplit = Math.ceil(text.length / numSplits);
    const duration = segment.end - segment.start;
    const durationPerSplit = duration / numSplits;

    const result: TranscriptSegment[] = [];
    let offset = 0;
    let splitIndex = 0;

    while (offset < text.length) {
        const splitPoint = findSentenceBoundary(text.substring(offset), charsPerSplit);
        const splitText = text.substring(offset, offset + splitPoint).trim();

        if (splitText.length > 0) {
            result.push({
                start: round2(segment.start + splitIndex * durationPerSplit),
                end: round2(segment.start + (splitIndex + 1) * durationPerSplit),
                text: splitText,
            });
        }

        offset += splitPoint;
        splitIndex++;
    }

    // Adjust last segment's end time to match original
    if (result.length > 0) {
        result[result.length - 1].end = segment.end;
    }

    return result;
}

// =============================================================================
// PREPROCESS SEGMENTS
// =============================================================================

/**
 * Preprocess segments: clean text, split large segments, validate timestamps.
 */
export function preprocessSegments(
    segments: TranscriptSegment[],
    maxTokens: number = DEFAULT_MAX_TOKENS
): TranscriptSegment[] {
    const processed: TranscriptSegment[] = [];

    for (const segment of segments) {
        // Validate timestamps
        if (typeof segment.start !== "number" || typeof segment.end !== "number") {
            console.warn("Invalid segment timestamps, skipping:", segment);
            continue;
        }

        // Ensure start < end
        if (segment.start >= segment.end) {
            console.warn("Invalid segment duration (start >= end), skipping:", segment);
            continue;
        }

        // Clean text
        const cleanedText = cleanText(segment.text);
        if (cleanedText.length === 0) {
            continue;
        }

        const cleanedSegment: TranscriptSegment = {
            ...segment,
            start: round2(segment.start),
            end: round2(segment.end),
            text: cleanedText,
        };

        // Split if too large
        const tokens = estimateTokens(cleanedText);
        if (tokens > maxTokens) {
            processed.push(...splitLargeSegment(cleanedSegment, maxTokens));
        } else {
            processed.push(cleanedSegment);
        }
    }

    return processed;
}

/**
 * Clean text: normalize whitespace, remove filler words optionally
 */
function cleanText(text: string): string {
    return text
        .replace(/\s+/g, " ")           // Normalize whitespace
        .replace(/\[.*?\]/g, "")        // Remove [Music], [Applause], etc.
        .replace(/\(.*?\)/g, "")        // Remove (inaudible), etc.
        .trim();
}

// =============================================================================
// MERGE SMALL SEGMENTS
// =============================================================================

/**
 * Merge very small segments that are too short on their own.
 * Useful for word-level transcription output.
 */
export function mergeSmallSegments(
    segments: TranscriptSegment[],
    minWords: number = 3
): TranscriptSegment[] {
    if (segments.length === 0) return [];

    const merged: TranscriptSegment[] = [];
    let buffer: TranscriptSegment | null = null;

    for (const segment of segments) {
        const wordCount = segment.text.split(/\s+/).filter(Boolean).length;

        if (buffer === null) {
            buffer = { ...segment };
        } else if (wordCount < minWords) {
            // Merge into buffer
            buffer.text = `${buffer.text} ${segment.text}`;
            buffer.end = segment.end;
        } else {
            // Finalize buffer and start new
            const bufferWords = buffer.text.split(/\s+/).filter(Boolean).length;
            if (bufferWords < minWords) {
                // Still too small, merge with current
                buffer.text = `${buffer.text} ${segment.text}`;
                buffer.end = segment.end;
            } else {
                merged.push(buffer);
                buffer = { ...segment };
            }
        }
    }

    // Finalize last buffer
    if (buffer) {
        merged.push(buffer);
    }

    return merged;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    endsWithSentence,
    startsNewSentence,
    findSentenceBoundary,
    cleanText,
    DEFAULT_MAX_TOKENS,
    DEFAULT_MAX_SECONDS,
};
