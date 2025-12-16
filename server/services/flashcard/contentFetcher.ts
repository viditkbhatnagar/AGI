/**
 * Module Content Fetcher
 * 
 * Fetches content from courses/modules including:
 * - Google Drive documents (slides, PDFs)
 * - OneDrive documents
 * - Cloudinary uploaded files
 * - YouTube videos
 * - Recordings
 * 
 * Prepares content chunks for flashcard generation.
 */

import mongoose from "mongoose";
import { Course } from "../../models/course";
import { Recording } from "../../models/recording";
import { SandboxCourse } from "../../models/sandboxCourse";
import type { Chunk } from "./types";
import { randomUUID } from "crypto";

// =============================================================================
// TYPES
// =============================================================================

export interface ModuleContentRequest {
    courseSlug: string;
    moduleIndex: number;
    isSandbox?: boolean;
    includeRecordings?: boolean;
}

export interface ModuleContent {
    module_id: string;
    course_id: string;
    module_title: string;
    course_title: string;
    documents: DocumentContent[];
    videos: VideoContent[];
    recordings: RecordingContent[];
}

export interface DocumentContent {
    id: string;
    title: string;
    url: string;
    type: "link" | "upload";
    provider: "google_drive" | "onedrive" | "cloudinary" | "local" | "other";
    fileType?: string;
    publicId?: string;
}

export interface VideoContent {
    id: string;
    title: string;
    url: string;
    duration: number;
    provider: "youtube" | "vimeo" | "other";
}

export interface RecordingContent {
    id: string;
    title: string;
    url: string;
    date: Date;
    description?: string;
}

// =============================================================================
// PROVIDER DETECTION
// =============================================================================

function detectProvider(url: string): DocumentContent["provider"] {
    if (!url) return "other";

    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("docs.google.com")) {
        return "google_drive";
    }
    if (lowerUrl.includes("onedrive.live.com") || lowerUrl.includes("1drv.ms") || lowerUrl.includes("sharepoint.com")) {
        return "onedrive";
    }
    if (lowerUrl.includes("cloudinary.com") || lowerUrl.includes("res.cloudinary.com")) {
        return "cloudinary";
    }

    return "other";
}

function detectVideoProvider(url: string): VideoContent["provider"] {
    if (!url) return "other";

    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
        return "youtube";
    }
    if (lowerUrl.includes("vimeo.com")) {
        return "vimeo";
    }

    return "other";
}

// =============================================================================
// MAIN FETCH FUNCTION
// =============================================================================

/**
 * Fetch all content for a module from the database
 */
export async function fetchModuleContent(
    request: ModuleContentRequest
): Promise<ModuleContent> {
    const { courseSlug, moduleIndex, isSandbox = false, includeRecordings = true } = request;

    console.log(`[ContentFetcher] Fetching content for ${courseSlug}/module-${moduleIndex}`);

    // Fetch course
    const course = isSandbox 
        ? await SandboxCourse.findOne({ slug: courseSlug })
        : await Course.findOne({ slug: courseSlug });

    if (!course) {
        throw new Error(`Course not found: ${courseSlug}`);
    }

    // Get the module - check both modules and mbaModules arrays
    let module;
    let moduleType = "modules";

    if (course.modules && course.modules.length > moduleIndex) {
        module = course.modules[moduleIndex];
    } else if (course.mbaModules && course.mbaModules.length > moduleIndex) {
        module = course.mbaModules[moduleIndex];
        moduleType = "mbaModules";
    }

    if (!module) {
        throw new Error(`Module not found: ${courseSlug}/module-${moduleIndex}`);
    }

    const moduleId = `${courseSlug}::${moduleType}::${moduleIndex}`;

    // Process documents
    const documents: DocumentContent[] = [];
    if (module.documents && Array.isArray(module.documents)) {
        for (const doc of module.documents) {
            // Handle both link-based and upload-based documents
            const docAny = doc as any;
            const url = docAny.url || docAny.fileUrl || "";
            if (!url) continue;

            documents.push({
                id: `doc-${randomUUID().substring(0, 8)}`,
                title: docAny.title || "Untitled Document",
                url,
                type: docAny.type || "link",
                provider: detectProvider(url),
                fileType: docAny.fileType,
                publicId: docAny.publicId,
            });
        }
    }

    // Process videos
    const videos: VideoContent[] = [];
    if (module.videos && Array.isArray(module.videos)) {
        for (const video of module.videos) {
            if (!video.url) continue;

            videos.push({
                id: `vid-${randomUUID().substring(0, 8)}`,
                title: video.title || "Untitled Video",
                url: video.url,
                duration: video.duration || 0,
                provider: detectVideoProvider(video.url),
            });
        }
    }

    // Fetch recordings for this module
    const recordings: RecordingContent[] = [];
    if (includeRecordings) {
        try {
            const recordingDocs = await Recording.find({
                courseSlug,
                moduleIndex,
                isVisible: true,
            }).sort({ classDate: -1 });

            for (const rec of recordingDocs) {
                const recAny = rec as any;
                recordings.push({
                    id: recAny._id?.toString() || `rec-${randomUUID().substring(0, 8)}`,
                    title: recAny.title,
                    url: recAny.fileUrl,
                    date: recAny.classDate,
                    description: recAny.description,
                });
            }
        } catch (error) {
            console.warn(`[ContentFetcher] Could not fetch recordings:`, error);
        }
    }

    console.log(`[ContentFetcher] Found ${documents.length} documents, ${videos.length} videos, ${recordings.length} recordings`);

    return {
        module_id: moduleId,
        course_id: courseSlug,
        module_title: module.title || `Module ${moduleIndex + 1}`,
        course_title: course.title,
        documents,
        videos,
        recordings,
    };
}

/**
 * Convert module content to chunks for flashcard generation
 * 
 * For documents from Google Drive/OneDrive, we need to:
 * 1. Extract text content (would need document processing integration)
 * 2. Split into manageable chunks
 * 
 * This function creates placeholder chunks that describe the content sources.
 * The actual content extraction requires additional processing.
 */
export async function prepareChunksFromContent(
    content: ModuleContent,
    options: {
        maxChunkTokens?: number;
        includeDocumentMetadata?: boolean;
        extractContent?: boolean;
        useGeminiForExtraction?: boolean;
    } = {}
): Promise<Chunk[]> {
    const {
        maxChunkTokens = 500,
        includeDocumentMetadata = true,
        extractContent = false,
        useGeminiForExtraction = false
    } = options;

    // If extraction is enabled, use the document extractor
    if (extractContent) {
        return prepareChunksWithExtraction(content, {
            maxChunkTokens,
            useGeminiForExtraction,
        });
    }

    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    // Create chunks from document metadata (in production, this would extract actual text)
    for (const doc of content.documents) {
        chunks.push({
            chunk_id: `${content.module_id}::doc::${chunkIndex}`,
            source_file: doc.title,
            provider: doc.provider,
            slide_or_page: null,
            start_sec: null,
            end_sec: null,
            heading: doc.title,
            text: includeDocumentMetadata
                ? `Document: ${doc.title}\nSource: ${doc.provider}\nURL: ${doc.url}\n\n[Content from this ${doc.provider} document would be extracted and processed here]`
                : `[Document: ${doc.title}]`,
            tokens_est: 50,
        });
        chunkIndex++;
    }

    // Create chunks from video metadata
    for (const video of content.videos) {
        chunks.push({
            chunk_id: `${content.module_id}::video::${chunkIndex}`,
            source_file: video.title,
            provider: video.provider === "youtube" ? "google_drive" : "other",
            slide_or_page: null,
            start_sec: 0,
            end_sec: video.duration * 60,
            heading: video.title,
            text: `Video: ${video.title}\nDuration: ${video.duration} minutes\nSource: ${video.provider}\n\n[Transcript from this video would be extracted and processed here]`,
            tokens_est: 50,
        });
        chunkIndex++;
    }

    // Create chunks from recordings
    for (const recording of content.recordings) {
        chunks.push({
            chunk_id: `${content.module_id}::rec::${chunkIndex}`,
            source_file: recording.title,
            provider: detectProvider(recording.url),
            slide_or_page: null,
            start_sec: 0,
            end_sec: null,
            heading: recording.title,
            text: `Recording: ${recording.title}\nDate: ${recording.date.toISOString()}\n${recording.description || ""}\n\n[Transcript from this recording would be extracted and processed here]`,
            tokens_est: 60,
        });
        chunkIndex++;
    }

    console.log(`[ContentFetcher] Prepared ${chunks.length} chunks from module content`);

    return chunks;
}

/**
 * Prepare chunks with actual content extraction from documents
 * 
 * This function attempts to extract real text content from:
 * - Google Drive documents (if publicly accessible)
 * - Uses Gemini for documents that need authentication
 */
export async function prepareChunksWithExtraction(
    content: ModuleContent,
    options: {
        maxChunkTokens?: number;
        useGeminiForExtraction?: boolean;
    } = {}
): Promise<Chunk[]> {
    const { maxChunkTokens = 500, useGeminiForExtraction = false } = options;

    // Import document extractor
    const { extractAllContent } = await import("./documentExtractor");

    console.log(`[ContentFetcher] Extracting content from ${content.documents.length} documents, ${content.videos.length} videos, ${content.recordings.length} recordings`);

    // Extract content from all sources
    const extractedContents = await extractAllContent(
        content.documents,
        content.videos,
        content.recordings,
        { useGeminiForExtraction }
    );

    // Split extracted content into chunks
    const chunks: Chunk[] = [];

    for (const extracted of extractedContents) {
        // Split large texts into multiple chunks
        const textChunks = splitTextIntoChunks(extracted.text, maxChunkTokens);

        for (let i = 0; i < textChunks.length; i++) {
            const chunkText = textChunks[i];

            chunks.push({
                chunk_id: `${content.module_id}::${extracted.source.type}::${extracted.id}::${i}`,
                source_file: extracted.title,
                provider: extracted.source.provider as any,
                slide_or_page: textChunks.length > 1 ? `part ${i + 1}/${textChunks.length}` : null,
                start_sec: extracted.source.type === "video" ? 0 : null,
                end_sec: extracted.metadata?.duration ? extracted.metadata.duration * 60 : null,
                heading: extracted.title,
                text: chunkText,
                tokens_est: Math.ceil(chunkText.length / 4),
            });
        }
    }

    console.log(`[ContentFetcher] Prepared ${chunks.length} chunks with extracted content`);

    return chunks;
}

/**
 * Split text into chunks of approximately maxTokens size
 */
function splitTextIntoChunks(text: string, maxTokens: number = 500): string[] {
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
        return [text];
    }

    const chunks: string[] = [];

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length <= maxChars) {
            currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            // If a single paragraph is too long, split by sentences
            if (paragraph.length > maxChars) {
                const sentences = paragraph.split(/(?<=[.!?])\s+/);
                currentChunk = "";

                for (const sentence of sentences) {
                    if ((currentChunk + sentence).length <= maxChars) {
                        currentChunk += (currentChunk ? " " : "") + sentence;
                    } else {
                        if (currentChunk) {
                            chunks.push(currentChunk);
                        }
                        currentChunk = sentence;
                    }
                }
            } else {
                currentChunk = paragraph;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

/**
 * List all available modules for a course
 */
export async function listCourseModules(
    courseSlug: string,
    isSandbox: boolean = false
): Promise<Array<{ index: number; title: string; type: string; documentCount: number; videoCount: number }>> {
    const course = isSandbox 
        ? await SandboxCourse.findOne({ slug: courseSlug })
        : await Course.findOne({ slug: courseSlug });

    if (!course) {
        throw new Error(`Course not found: ${courseSlug}`);
    }

    const result: Array<{ index: number; title: string; type: string; documentCount: number; videoCount: number }> = [];

    // Regular modules
    if (course.modules && Array.isArray(course.modules)) {
        course.modules.forEach((module: any, index: number) => {
            result.push({
                index,
                title: module.title || `Module ${index + 1}`,
                type: "modules",
                documentCount: module.documents?.length || 0,
                videoCount: module.videos?.length || 0,
            });
        });
    }

    // MBA modules
    if (course.mbaModules && Array.isArray(course.mbaModules)) {
        course.mbaModules.forEach((module: any, index: number) => {
            result.push({
                index,
                title: module.title || `MBA Module ${index + 1}`,
                type: "mbaModules",
                documentCount: module.documents?.length || 0,
                videoCount: module.videos?.length || 0,
            });
        });
    }

    return result;
}

/**
 * List all courses with module counts
 */
export async function listAllCourses(
    includeSandbox: boolean = false
): Promise<Array<{ slug: string; title: string; type: string; moduleCount: number; isSandbox: boolean }>> {
    const result: Array<{ slug: string; title: string; type: string; moduleCount: number; isSandbox: boolean }> = [];

    // Fetch regular courses
    const courses = await Course.find({}).select("slug title type modules mbaModules");
    for (const course of courses) {
        result.push({
            slug: course.slug,
            title: course.title,
            type: course.type,
            moduleCount: (course.modules?.length || 0) + (course.mbaModules?.length || 0),
            isSandbox: false,
        });
    }

    // Fetch sandbox courses if requested
    if (includeSandbox) {
        const sandboxCourses = await SandboxCourse.find({}).select("slug title type modules mbaModules");
        for (const course of sandboxCourses) {
            result.push({
                slug: course.slug,
                title: course.title,
                type: course.type,
                moduleCount: (course.modules?.length || 0) + (course.mbaModules?.length || 0),
                isSandbox: true,
            });
        }
    }

    return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    fetchModuleContent,
    prepareChunksFromContent,
    prepareChunksWithExtraction,
    listCourseModules,
    listAllCourses,
};
