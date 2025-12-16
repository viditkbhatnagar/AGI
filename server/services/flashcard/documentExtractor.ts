/**
 * Document Content Extractor
 * 
 * Comprehensive document extraction from:
 * - Google Drive (Docs, Slides, PDFs)
 * - OneDrive documents
 * - Cloudinary uploaded files
 * - Direct PDF files
 * 
 * Features:
 * - PDF parsing with pdf-parse
 * - Google Docs/Slides export to text
 * - Gemini AI for documents needing auth
 * - Fallback content generation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DocumentContent, VideoContent, RecordingContent } from "./contentFetcher";

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedContent {
    id: string;
    title: string;
    text: string;
    tokens_est: number;
    source: {
        provider: string;
        url: string;
        type: "document" | "video" | "recording";
    };
    metadata?: {
        pages?: number;
        slides?: number;
        duration?: number;
        extractedAt: string;
        method: "pdf" | "google_export" | "gemini" | "fallback";
    };
}

export interface ExtractionOptions {
    maxTokensPerChunk?: number;
    includeMetadata?: boolean;
    useGeminiForExtraction?: boolean;
    timeout?: number;
}

// =============================================================================
// GOOGLE DRIVE URL PARSERS
// =============================================================================

/**
 * Extract file ID from various Google Drive/Docs URL formats
 */
export function extractGoogleDriveFileId(url: string): string | null {
    const patterns = [
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
        /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
        /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/,
        /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/preview/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Detect document type from URL
 */
export function detectGoogleDocType(url: string): "doc" | "slides" | "sheets" | "pdf" | "unknown" {
    if (url.includes("docs.google.com/presentation") || url.includes("/slides/")) return "slides";
    if (url.includes("docs.google.com/document") || url.includes("/document/")) return "doc";
    if (url.includes("docs.google.com/spreadsheets") || url.includes("/spreadsheets/")) return "sheets";
    if (url.includes(".pdf") || url.includes("/pdf/")) return "pdf";
    return "unknown";
}

// =============================================================================
// PDF EXTRACTION
// =============================================================================

/**
 * Extract text from PDF buffer using pdf-parse
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string | null> {
    try {
        // Use standard import - tsx should handle the ESM/CJS interop
        // @ts-ignore
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;

        const data = await pdfParse(pdfBuffer);

        if (data.text && data.text.trim().length > 50) {
            console.log(`[DocExtractor] PDF parsed: ${data.numpages} pages, ${data.text.length} chars`);
            return data.text;
        }
        return null;
    } catch (error) {
        console.warn(`[DocExtractor] PDF parsing failed:`, error);
        return null;
    }
}

/**
 * Clean extracted text
 */
function cleanText(text: string): string {
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .trim();
}

// =============================================================================
// GOOGLE DRIVE EXTRACTION
// =============================================================================

/**
 * Fetch content from Google Drive - multiple methods
 */
async function fetchGoogleDriveContent(
    fileId: string,
    docType: string,
    _title: string // Used for logging context
): Promise<{ text: string | null; method: string }> {

    // Method 1: Try text export for Docs/Slides
    if (docType === "doc" || docType === "slides" || docType === "sheets") {
        try {
            const exportUrls: Record<string, string> = {
                doc: `https://docs.google.com/document/d/${fileId}/export?format=txt`,
                slides: `https://docs.google.com/presentation/d/${fileId}/export?format=txt`,
                sheets: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`,
            };

            const response = await fetch(exportUrls[docType], {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; FlashcardBot/1.0)" },
                redirect: "follow",
            });

            if (response.ok) {
                const text = await response.text();
                if (text && !text.includes("<!DOCTYPE") && !text.includes("Sign in") && text.length > 100) {
                    console.log(`[DocExtractor] Google export successful: ${text.length} chars`);
                    return { text: cleanText(text), method: "google_export" };
                }
            }
        } catch (error) {
            console.warn(`[DocExtractor] Google export failed:`, error);
        }
    }

    // Method 2: Try to download as PDF and parse
    try {
        const pdfUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const response = await fetch(pdfUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; FlashcardBot/1.0)" },
            redirect: "follow",
        });

        if (response.ok) {
            const contentType = response.headers.get("content-type") || "";

            if (contentType.includes("pdf") || contentType.includes("octet-stream")) {
                const buffer = Buffer.from(await response.arrayBuffer());
                const text = await extractTextFromPDF(buffer);
                if (text) {
                    return { text: cleanText(text), method: "pdf" };
                }
            }
        }
    } catch (error) {
        console.warn(`[DocExtractor] PDF download failed:`, error);
    }

    return { text: null, method: "failed" };
}

// =============================================================================
// ONEDRIVE EXTRACTION
// =============================================================================

/**
 * Extract OneDrive file ID from URL
 */
export function extractOneDriveInfo(url: string): { shareId: string | null } {
    // OneDrive shared links contain encoded file info
    const match = url.match(/1drv\.ms\/([a-zA-Z0-9!_-]+)/);
    if (match) return { shareId: match[1] };

    // SharePoint links
    if (url.includes("sharepoint.com") || url.includes("onedrive.live.com")) {
        return { shareId: url }; // Use full URL for processing
    }

    return { shareId: null };
}

/**
 * Fetch OneDrive content (limited without API auth)
 */
async function fetchOneDriveContent(url: string): Promise<string | null> {
    // OneDrive requires authentication for most content
    // Try to extract shareId for logging
    const { shareId } = extractOneDriveInfo(url);
    console.log(`[DocExtractor] OneDrive (${shareId ? 'shared' : 'direct'}) requires authentication - using Gemini extraction`);
    return null;
}

// =============================================================================
// GEMINI AI EXTRACTION
// =============================================================================

/**
 * Use Gemini to generate educational content from document title
 */
async function extractWithGemini(
    title: string,
    url: string,
    provider: string,
    apiKey: string
): Promise<string | null> {
    try {
        const { withRetryThrow, GEMINI_RETRY_OPTIONS } = await import("./utils/retry");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-1.0-pro",
        });

        const prompt = `You are an expert educator. Based on this document title and context, generate comprehensive educational content that covers the key concepts, definitions, and learning objectives that would typically be included in such a document.

Document Title: "${title}"
Source: ${provider}
URL: ${url}

Generate detailed educational content organized as follows:

## Key Concepts
List and explain the 5-10 most important concepts that would be covered.

## Important Definitions
Define 5-8 key terms related to the topic.

## Learning Objectives
What should a student understand after studying this material?

## Summary
A 2-3 paragraph comprehensive summary of the topic.

Be specific, accurate, and educational. This content will be used to generate flashcards for students.`;

        console.log(`[DocExtractor] Using Gemini for: ${title}`);

        const result = await withRetryThrow(
            () => model.generateContent(prompt),
            GEMINI_RETRY_OPTIONS
        );

        const text = result.response.text();

        if (text && text.length > 200) {
            console.log(`[DocExtractor] Gemini generated ${text.length} chars`);
            return text;
        }
        return null;
    } catch (error) {
        console.warn(`[DocExtractor] Gemini extraction failed:`, error);
        return null;
    }
}

// =============================================================================
// FALLBACK CONTENT
// =============================================================================

function generateFallbackContent(title: string, url: string, provider: string): string {
    return `# ${title}

This document is part of the course curriculum and contains important educational material.

## Overview
The document "${title}" covers key concepts and learning objectives related to the module topic.

## Key Points
- Study the main concepts presented in this document
- Pay attention to definitions and terminology
- Review examples and case studies provided
- Practice applying concepts to real-world scenarios

## Source
Provider: ${provider}
URL: ${url}

Note: For best results, ensure documents are accessible for automated content extraction.`;
}

// =============================================================================
// MAIN EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract text content from a document - tries all methods
 */
export async function extractDocumentContent(
    doc: DocumentContent,
    options: ExtractionOptions = {}
): Promise<ExtractedContent> {
    const { useGeminiForExtraction = true } = options;
    const apiKey = process.env.GEMINI_API_KEY;

    let text: string | null = null;
    let method: "pdf" | "google_export" | "gemini" | "fallback" = "fallback";

    console.log(`[DocExtractor] Extracting: ${doc.title} (${doc.provider})`);

    // Try extraction based on provider
    if (doc.provider === "google_drive") {
        const fileId = extractGoogleDriveFileId(doc.url);
        if (fileId) {
            const docType = detectGoogleDocType(doc.url);
            const result = await fetchGoogleDriveContent(fileId, docType, doc.title);
            if (result.text) {
                text = result.text;
                method = result.method as "pdf" | "google_export";
            }
        }
    } else if (doc.provider === "onedrive") {
        text = await fetchOneDriveContent(doc.url);
    } else if (doc.provider === "cloudinary" && doc.url.includes(".pdf")) {
        // Try direct PDF fetch from Cloudinary
        try {
            const response = await fetch(doc.url);
            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                text = await extractTextFromPDF(buffer);
                if (text) method = "pdf";
            }
        } catch (error) {
            console.warn(`[DocExtractor] Cloudinary PDF fetch failed:`, error);
        }
    }

    // Try Gemini if direct extraction failed
    if (!text && useGeminiForExtraction && apiKey) {
        text = await extractWithGemini(doc.title, doc.url, doc.provider, apiKey);
        if (text) method = "gemini";
    }

    // Final fallback
    if (!text) {
        text = generateFallbackContent(doc.title, doc.url, doc.provider);
        method = "fallback";
        console.log(`[DocExtractor] Using fallback for: ${doc.title}`);
    }

    return {
        id: doc.id,
        title: doc.title,
        text,
        tokens_est: Math.ceil(text.length / 4),
        source: {
            provider: doc.provider,
            url: doc.url,
            type: "document",
        },
        metadata: {
            extractedAt: new Date().toISOString(),
            method,
        },
    };
}

/**
 * Extract content from a video
 */
export async function extractVideoContent(
    video: VideoContent,
    options: ExtractionOptions = {}
): Promise<ExtractedContent> {
    const { useGeminiForExtraction = true } = options;
    const apiKey = process.env.GEMINI_API_KEY;

    let text: string;
    let method: "gemini" | "fallback" = "fallback";

    if (useGeminiForExtraction && apiKey) {
        try {
            const { withRetryThrow, GEMINI_RETRY_OPTIONS } = await import("./utils/retry");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: process.env.GEMINI_MODEL || "gemini-1.0-pro",
            });

            const prompt = `Based on this educational video title, generate comprehensive educational content:

Video Title: "${video.title}"
Duration: ${video.duration} minutes

Generate content including:
1. Main topics likely covered
2. Key concepts and definitions
3. Important takeaways
4. Summary of expected learning outcomes

Be educational and specific.`;

            const result = await withRetryThrow(
                () => model.generateContent(prompt),
                GEMINI_RETRY_OPTIONS
            );

            text = result.response.text();
            method = "gemini";
        } catch (error) {
            console.warn(`[DocExtractor] Video Gemini extraction failed:`, error);
            text = `# ${video.title}\n\nDuration: ${video.duration} minutes\n\nThis educational video covers important concepts related to the module topic.`;
        }
    } else {
        text = `# ${video.title}\n\nDuration: ${video.duration} minutes\n\nThis educational video covers important concepts related to the module topic.`;
    }

    return {
        id: video.id,
        title: video.title,
        text,
        tokens_est: Math.ceil(text.length / 4),
        source: {
            provider: video.provider,
            url: video.url,
            type: "video",
        },
        metadata: {
            duration: video.duration,
            extractedAt: new Date().toISOString(),
            method,
        },
    };
}

/**
 * Extract content from a recording
 */
export async function extractRecordingContent(
    recording: RecordingContent,
    options: ExtractionOptions = {}
): Promise<ExtractedContent> {
    const text = `# ${recording.title}

Date: ${recording.date.toISOString().split("T")[0]}
${recording.description ? `Description: ${recording.description}` : ""}

This is a class recording containing lecture content, discussions, and practical examples for the module.`;

    return {
        id: recording.id,
        title: recording.title,
        text,
        tokens_est: Math.ceil(text.length / 4),
        source: {
            provider: "recording",
            url: recording.url,
            type: "recording",
        },
        metadata: {
            extractedAt: new Date().toISOString(),
            method: "fallback",
        },
    };
}

/**
 * Extract content from all module sources
 */
export async function extractAllContent(
    documents: DocumentContent[],
    videos: VideoContent[],
    recordings: RecordingContent[],
    options: ExtractionOptions = {}
): Promise<ExtractedContent[]> {
    const results: ExtractedContent[] = [];

    console.log(`[DocExtractor] Extracting from ${documents.length} documents, ${videos.length} videos, ${recordings.length} recordings`);

    // Process documents sequentially (to avoid rate limits)
    for (const doc of documents) {
        try {
            const extracted = await extractDocumentContent(doc, options);
            results.push(extracted);
        } catch (error) {
            console.error(`[DocExtractor] Failed to extract ${doc.title}:`, error);
        }
    }

    // Process videos
    for (const video of videos) {
        try {
            const extracted = await extractVideoContent(video, options);
            results.push(extracted);
        } catch (error) {
            console.error(`[DocExtractor] Failed to extract video ${video.title}:`, error);
        }
    }

    // Process recordings
    for (const recording of recordings) {
        try {
            const extracted = await extractRecordingContent(recording, options);
            results.push(extracted);
        } catch (error) {
            console.error(`[DocExtractor] Failed to extract recording ${recording.title}:`, error);
        }
    }

    const successCount = results.filter(r => r.metadata?.method !== "fallback").length;
    console.log(`[DocExtractor] Extraction complete: ${successCount}/${results.length} successful`);

    return results;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    extractDocumentContent,
    extractVideoContent,
    extractRecordingContent,
    extractAllContent,
    extractGoogleDriveFileId,
    detectGoogleDocType,
};
