/**
 * Transcript Ingestion Worker
 * 
 * Sample worker script that processes transcript files from a directory,
 * chunks them, generates embeddings, and upserts to vector DB.
 * 
 * Usage:
 *   npx tsx server/services/flashcard/workers/ingestTranscripts.ts \
 *     --dir ./transcripts \
 *     --module mod-hr-101 \
 *     --chunk-tokens 500
 */

import * as fs from "fs";
import * as path from "path";
import { embedText, estimateTokens } from "../vectorDb/embeddings";
import { upsertChunks } from "../vectorDb/upsertChunks";
import type { ContextChunk } from "../vectorDb/types";

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

interface IngestOptions {
  directory: string;
  moduleId: string;
  chunkTokens: number;
  overlapTokens: number;
  dryRun: boolean;
}

function parseArgs(): IngestOptions {
  const args = process.argv.slice(2);
  const options: IngestOptions = {
    directory: "./transcripts",
    moduleId: "default-module",
    chunkTokens: 500,
    overlapTokens: 50,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dir":
      case "-d":
        options.directory = args[++i];
        break;
      case "--module":
      case "-m":
        options.moduleId = args[++i];
        break;
      case "--chunk-tokens":
      case "-c":
        options.chunkTokens = parseInt(args[++i], 10);
        break;
      case "--overlap":
      case "-o":
        options.overlapTokens = parseInt(args[++i], 10);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Transcript Ingestion Worker

Usage:
  npx tsx server/services/flashcard/workers/ingestTranscripts.ts [options]

Options:
  -d, --dir <path>        Directory containing transcript files (default: ./transcripts)
  -m, --module <id>       Module ID for the chunks (required)
  -c, --chunk-tokens <n>  Target tokens per chunk (default: 500)
  -o, --overlap <n>       Overlap tokens between chunks (default: 50)
  --dry-run               Process files but don't upsert to vector DB
  -h, --help              Show this help message

Supported file formats:
  - .txt (plain text)
  - .json (whisper output format)
  - .vtt (WebVTT subtitles)
  - .srt (SubRip subtitles)

Example:
  npx tsx server/services/flashcard/workers/ingestTranscripts.ts \\
    --dir ./data/transcripts \\
    --module mod-hr-fundamentals \\
    --chunk-tokens 600
`);
}

// =============================================================================
// FILE PROCESSING
// =============================================================================

interface TranscriptFile {
  path: string;
  name: string;
  format: "txt" | "json" | "vtt" | "srt";
}

function findTranscriptFiles(directory: string): TranscriptFile[] {
  if (!fs.existsSync(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }

  const files: TranscriptFile[] = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    let format: TranscriptFile["format"] | null = null;

    switch (ext) {
      case ".txt":
        format = "txt";
        break;
      case ".json":
        format = "json";
        break;
      case ".vtt":
        format = "vtt";
        break;
      case ".srt":
        format = "srt";
        break;
    }

    if (format) {
      files.push({
        path: path.join(directory, entry.name),
        name: entry.name,
        format,
      });
    }
  }

  return files;
}

interface Segment {
  text: string;
  start_sec: number | null;
  end_sec: number | null;
}

function parseTranscriptFile(file: TranscriptFile): Segment[] {
  const content = fs.readFileSync(file.path, "utf-8");

  switch (file.format) {
    case "txt":
      return parsePlainText(content);
    case "json":
      return parseWhisperJson(content);
    case "vtt":
      return parseVtt(content);
    case "srt":
      return parseSrt(content);
    default:
      throw new Error(`Unsupported format: ${file.format}`);
  }
}

function parsePlainText(content: string): Segment[] {
  // Split by paragraphs or sentences
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  
  return paragraphs.map(text => ({
    text: text.trim(),
    start_sec: null,
    end_sec: null,
  }));
}

function parseWhisperJson(content: string): Segment[] {
  const data = JSON.parse(content);
  const segments = data.transcription || data.segments || [];

  return segments.map((seg: any) => ({
    text: (seg.text || "").trim(),
    start_sec: seg.offsets?.from / 1000 || seg.start || null,
    end_sec: seg.offsets?.to / 1000 || seg.end || null,
  }));
}

function parseVtt(content: string): Segment[] {
  const segments: Segment[] = [];
  const lines = content.split("\n");
  let currentSegment: Partial<Segment> = {};

  for (const line of lines) {
    // Skip WEBVTT header and empty lines
    if (line.startsWith("WEBVTT") || line.trim() === "") continue;

    // Timestamp line: 00:00:00.000 --> 00:00:05.000
    const timestampMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );

    if (timestampMatch) {
      const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = timestampMatch;
      currentSegment.start_sec =
        parseInt(h1) * 3600 + parseInt(m1) * 60 + parseInt(s1) + parseInt(ms1) / 1000;
      currentSegment.end_sec =
        parseInt(h2) * 3600 + parseInt(m2) * 60 + parseInt(s2) + parseInt(ms2) / 1000;
    } else if (currentSegment.start_sec !== undefined) {
      // Text line
      currentSegment.text = (currentSegment.text || "") + " " + line.trim();
      
      // Check if next line is empty (end of cue)
      if (line.trim() && currentSegment.text) {
        segments.push({
          text: currentSegment.text.trim(),
          start_sec: currentSegment.start_sec,
          end_sec: currentSegment.end_sec || null,
        });
        currentSegment = {};
      }
    }
  }

  return segments;
}

function parseSrt(content: string): Segment[] {
  const segments: Segment[] = [];
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    // Line 1: sequence number (skip)
    // Line 2: timestamps
    const timestampMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );

    if (timestampMatch) {
      const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = timestampMatch;
      const start_sec =
        parseInt(h1) * 3600 + parseInt(m1) * 60 + parseInt(s1) + parseInt(ms1) / 1000;
      const end_sec =
        parseInt(h2) * 3600 + parseInt(m2) * 60 + parseInt(s2) + parseInt(ms2) / 1000;

      // Lines 3+: text
      const text = lines.slice(2).join(" ").trim();

      segments.push({ text, start_sec, end_sec });
    }
  }

  return segments;
}

// =============================================================================
// CHUNKING
// =============================================================================

function chunkSegments(
  segments: Segment[],
  fileName: string,
  moduleId: string,
  targetTokens: number,
  overlapTokens: number
): ContextChunk[] {
  const chunks: ContextChunk[] = [];
  let currentText = "";
  let currentTokens = 0;
  let currentStartSec: number | null = null;
  let currentEndSec: number | null = null;
  let chunkIndex = 0;

  for (const segment of segments) {
    const segmentTokens = estimateTokens(segment.text);

    // Check if adding this segment exceeds target
    if (currentTokens + segmentTokens > targetTokens && currentText) {
      // Save current chunk
      chunks.push(createChunk(
        currentText,
        fileName,
        moduleId,
        chunkIndex++,
        currentStartSec,
        currentEndSec
      ));

      // Start new chunk with overlap
      const words = currentText.split(/\s+/);
      const overlapWords = Math.ceil(overlapTokens * 0.75); // Rough word estimate
      currentText = words.slice(-overlapWords).join(" ");
      currentTokens = estimateTokens(currentText);
      currentStartSec = segment.start_sec;
    }

    // Add segment to current chunk
    currentText += (currentText ? " " : "") + segment.text;
    currentTokens += segmentTokens;
    
    if (currentStartSec === null) {
      currentStartSec = segment.start_sec;
    }
    currentEndSec = segment.end_sec;
  }

  // Don't forget last chunk
  if (currentText) {
    chunks.push(createChunk(
      currentText,
      fileName,
      moduleId,
      chunkIndex,
      currentStartSec,
      currentEndSec
    ));
  }

  return chunks;
}

function createChunk(
  text: string,
  fileName: string,
  moduleId: string,
  index: number,
  startSec: number | null,
  endSec: number | null
): ContextChunk {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const slideOrPage = startSec !== null && endSec !== null
    ? `${formatTime(startSec)}-${formatTime(endSec)}`
    : `chunk ${index + 1}`;

  return {
    chunk_id: `${moduleId}_${path.basename(fileName, path.extname(fileName))}_c${index}`,
    source_file: fileName,
    provider: "local",
    slide_or_page: slideOrPage,
    start_sec: startSec,
    end_sec: endSec,
    heading: null,
    text: text.trim(),
    tokens_est: estimateTokens(text),
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const options = parseArgs();

  console.log("=".repeat(60));
  console.log("Transcript Ingestion Worker");
  console.log("=".repeat(60));
  console.log(`Directory: ${options.directory}`);
  console.log(`Module ID: ${options.moduleId}`);
  console.log(`Chunk tokens: ${options.chunkTokens}`);
  console.log(`Overlap tokens: ${options.overlapTokens}`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log("=".repeat(60));

  // Find transcript files
  const files = findTranscriptFiles(options.directory);
  console.log(`Found ${files.length} transcript files`);

  if (files.length === 0) {
    console.log("No transcript files found. Exiting.");
    return;
  }

  // Process each file
  const allChunks: ContextChunk[] = [];

  for (const file of files) {
    console.log(`\nProcessing: ${file.name}`);

    try {
      const segments = parseTranscriptFile(file);
      console.log(`  Parsed ${segments.length} segments`);

      const chunks = chunkSegments(
        segments,
        file.name,
        options.moduleId,
        options.chunkTokens,
        options.overlapTokens
      );
      console.log(`  Created ${chunks.length} chunks`);

      allChunks.push(...chunks);
    } catch (error) {
      console.error(`  Error processing ${file.name}:`, error);
    }
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);

  if (options.dryRun) {
    console.log("\n[DRY RUN] Would upsert the following chunks:");
    for (const chunk of allChunks.slice(0, 5)) {
      console.log(`  - ${chunk.chunk_id}: ${chunk.text.substring(0, 50)}...`);
    }
    if (allChunks.length > 5) {
      console.log(`  ... and ${allChunks.length - 5} more`);
    }
    return;
  }

  // Generate embeddings and upsert
  console.log("\nGenerating embeddings and upserting to vector DB...");

  try {
    await upsertChunks({
      chunks: allChunks,
      module_id: options.moduleId,
    });
    console.log("✓ Successfully upserted all chunks");
  } catch (error) {
    console.error("Error upserting chunks:", error);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Ingestion complete!");
  console.log("=".repeat(60));
}

// Run if executed directly
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export {
  parseArgs,
  findTranscriptFiles,
  parseTranscriptFile,
  chunkSegments,
};
