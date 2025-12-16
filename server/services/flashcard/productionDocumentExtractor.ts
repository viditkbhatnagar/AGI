/**
 * Production Document Extractor
 * 
 * Comprehensive extraction from:
 * - Google Drive (Docs, Slides, Sheets, PDFs)
 * - OneDrive/SharePoint documents
 * - Cloudinary uploads
 * - Direct URLs
 * 
 * Uses multiple extraction strategies with fallbacks.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRequire } from "module";
import type { DocumentContent, VideoContent, RecordingContent } from "./contentFetcher";
import { recordAPICall } from "../apiUsage";

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedDocument {
    id: string;
    title: string;
    text: string;
    tokens_est: number;
    source: {
        provider: string;
        url: string;
        type: "document" | "video" | "recording";
    };
    metadata: {
        pages?: number;
        slides?: number;
        duration?: number;
        extractedAt: string;
        method: "direct" | "export" | "pdf" | "gemini" | "fallback";
        success: boolean;
    };
}

export interface ExtractionResult {
    documents: ExtractedDocument[];
    totalExtracted: number;
    successCount: number;
    failedCount: number;
    methods: Record<string, number>;
}

// =============================================================================
// URL PARSERS
// =============================================================================

/**
 * Extract Google Drive file ID from various URL formats
 */
export function parseGoogleDriveUrl(url: string): { fileId: string | null; docType: string } {
    const patterns = [
        { regex: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/, type: "slides" },
        { regex: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/, type: "doc" },
        { regex: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/, type: "sheets" },
        { regex: /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/, type: "file" },
        { regex: /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/, type: "file" },
        { regex: /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/, type: "file" },
    ];

    for (const { regex, type } of patterns) {
        const match = url.match(regex);
        if (match) {
            return { fileId: match[1], docType: type };
        }
    }

    return { fileId: null, docType: "unknown" };
}

/**
 * Parse OneDrive/SharePoint URL
 */
export function parseOneDriveUrl(url: string): { shareId: string | null; isSharePoint: boolean } {
    // OneDrive short links
    const shortMatch = url.match(/1drv\.ms\/([a-zA-Z])\/([a-zA-Z0-9!_-]+)/);
    if (shortMatch) {
        return { shareId: shortMatch[2], isSharePoint: false };
    }

    // SharePoint links
    if (url.includes("sharepoint.com")) {
        return { shareId: url, isSharePoint: true };
    }

    // OneDrive live links
    const liveMatch = url.match(/onedrive\.live\.com.*resid=([a-zA-Z0-9!]+)/);
    if (liveMatch) {
        return { shareId: liveMatch[1], isSharePoint: false };
    }

    return { shareId: null, isSharePoint: false };
}

// =============================================================================
// GOOGLE DRIVE EXTRACTION
// =============================================================================

/**
 * Extract content from Google Drive document
 */
async function extractFromGoogleDrive(
    fileId: string,
    docType: string,
    title: string
): Promise<{ text: string | null; method: string }> {
    console.log(`[DocExtractor] Extracting Google Drive ${docType}: ${fileId}`);

    // Method 1: Try direct export for Google Workspace documents
    if (["doc", "slides", "sheets"].includes(docType)) {
        try {
            const exportFormats: Record<string, string> = {
                doc: "txt",
                slides: "txt",
                sheets: "csv",
            };

            const exportUrl = getGoogleExportUrl(fileId, docType, exportFormats[docType]);
            const response = await fetchWithTimeout(exportUrl, 15000);

            if (response.ok) {
                const text = await response.text();
                // Validate it's actual content, not an error page
                if (text && !text.includes("<!DOCTYPE") && !text.includes("Sign in") && text.length > 100) {
                    console.log(`[DocExtractor] Google export success: ${text.length} chars`);
                    return { text: cleanExtractedText(text), method: "export" };
                }
            }
        } catch (error) {
            console.warn(`[DocExtractor] Google export failed:`, error);
        }
    }

    // Method 2: Try direct download (for PDFs and other files)
    try {
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const response = await fetchWithTimeout(downloadUrl, 20000);

        if (response.ok) {
            const contentType = response.headers.get("content-type") || "";

            if (contentType.includes("pdf") || contentType.includes("octet-stream")) {
                const buffer = Buffer.from(await response.arrayBuffer());
                const pdfText = await extractTextFromPDF(buffer);
                if (pdfText) {
                    return { text: cleanExtractedText(pdfText), method: "pdf" };
                }
            } else if (contentType.includes("text")) {
                const text = await response.text();
                if (text && text.length > 50) {
                    return { text: cleanExtractedText(text), method: "direct" };
                }
            }
        }
    } catch (error) {
        console.warn(`[DocExtractor] Direct download failed:`, error);
    }

    return { text: null, method: "failed" };
}

function getGoogleExportUrl(fileId: string, docType: string, format: string): string {
    const baseUrls: Record<string, string> = {
        doc: `https://docs.google.com/document/d/${fileId}/export?format=${format}`,
        slides: `https://docs.google.com/presentation/d/${fileId}/export?format=${format}`,
        sheets: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=${format}`,
    };
    return baseUrls[docType] || `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// =============================================================================
// ONEDRIVE EXTRACTION
// =============================================================================

/**
 * Extract content from OneDrive document
 * Note: OneDrive requires authentication for most content
 */
async function extractFromOneDrive(
    shareId: string,
    isSharePoint: boolean,
    title: string
): Promise<{ text: string | null; method: string }> {
    console.log(`[DocExtractor] Extracting OneDrive: ${shareId.substring(0, 20)}...`);

    // OneDrive shared links typically require authentication
    // For public links, we can try to access the embed/preview
    try {
        // Try to get the download URL from a shared link
        // This works for some publicly shared files
        if (!isSharePoint && shareId) {
            const embedUrl = `https://onedrive.live.com/embed?resid=${shareId}`;
            const response = await fetchWithTimeout(embedUrl, 10000);

            if (response.ok) {
                const html = await response.text();
                // Try to extract any text content from the embed
                const textMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
                if (textMatch) {
                    return { text: cleanExtractedText(textMatch[1]), method: "direct" };
                }
            }
        }
    } catch (error) {
        console.warn(`[DocExtractor] OneDrive direct access failed:`, error);
    }

    // OneDrive typically requires Graph API authentication
    // Return null to trigger Gemini fallback
    return { text: null, method: "failed" };
}

// =============================================================================
// PDF EXTRACTION
// =============================================================================

/**
 * Extract text from PDF buffer using pdfjs-dist
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string | null> {
    try {
        // Use pdfjs-dist for PDF parsing
        const require = createRequire(import.meta.url);
        const pdfjsLib = require("pdfjs-dist/build/pdf.js");

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;

        console.log(`[DocExtractor] PDF has ${pdf.numPages} pages`);

        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 30); // Increased to 30 pages for better content coverage

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ");
            fullText += pageText + "\n\n";
        }

        if (fullText.trim().length > 50) {
            console.log(`[DocExtractor] PDF parsed: ${maxPages} pages, ${fullText.length} chars`);
            return fullText;
        }
        return null;
    } catch (error) {
        console.warn(`[DocExtractor] PDF parsing failed:`, error);
        return null;
    }
}

// =============================================================================
// CLOUDINARY EXTRACTION
// =============================================================================

/**
 * Extract content from Cloudinary URL
 */
async function extractFromCloudinary(url: string, title: string): Promise<{ text: string | null; method: string }> {
    console.log(`[DocExtractor] Extracting Cloudinary: ${title}`);

    try {
        const response = await fetchWithTimeout(url, 20000);

        if (response.ok) {
            const contentType = response.headers.get("content-type") || "";

            if (contentType.includes("pdf")) {
                const buffer = Buffer.from(await response.arrayBuffer());
                const pdfText = await extractTextFromPDF(buffer);
                if (pdfText) {
                    return { text: cleanExtractedText(pdfText), method: "pdf" };
                }
            } else if (contentType.includes("text")) {
                const text = await response.text();
                if (text && text.length > 50) {
                    return { text: cleanExtractedText(text), method: "direct" };
                }
            }
        }
    } catch (error) {
        console.warn(`[DocExtractor] Cloudinary extraction failed:`, error);
    }

    return { text: null, method: "failed" };
}

// =============================================================================
// GEMINI AI EXTRACTION (Fallback)
// =============================================================================

/**
 * Use Gemini to generate educational content based on document title
 * This is used when direct extraction fails
 */
async function extractWithGemini(
    title: string,
    url: string,
    provider: string,
    context?: string
): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[DocExtractor] No GEMINI_API_KEY for fallback extraction");
        return null;
    }

    try {
        const { withRetryThrow, GEMINI_RETRY_OPTIONS } = await import("./utils/retry");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-1.0-pro",
        });

        const prompt = `You are an expert educator. Based on this document title and context, generate comprehensive educational content that would typically be covered in such a document.

Document Title: "${title}"
Source Provider: ${provider}
${context ? `Additional Context: ${context}` : ""}

Generate detailed educational content including:

## Key Concepts (5-10 most important)
Explain each concept clearly with definitions.

## Important Terms and Definitions
Define 5-8 key terms that students must know.

## Core Learning Objectives
What should students understand after studying this material?

## Detailed Summary
A comprehensive 3-4 paragraph summary covering the main topics.

## Practice Questions
3-5 questions that test understanding of the material.

Be specific, accurate, and educational. Focus on concepts that would be tested in exams.`;

        console.log(`[DocExtractor] Using Gemini for: ${title}`);
        const startTime = Date.now();
        const modelName = process.env.GEMINI_MODEL || "gemini-1.0-pro";

        const result = await withRetryThrow(
            () => model.generateContent(prompt),
            GEMINI_RETRY_OPTIONS
        );

        const latencyMs = Date.now() - startTime;
        const text = result.response.text();

        // Track API usage
        const promptTokens = Math.ceil(prompt.length / 4);
        const completionTokens = Math.ceil((text?.length || 0) / 4);
        recordAPICall({
            provider: "gemini",
            model: modelName,
            endpoint: "/generateContent",
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            latencyMs,
            success: true,
            timestamp: new Date(),
            metadata: { title, textLength: text?.length || 0 },
        });

        if (text && text.length > 300) {
            console.log(`[DocExtractor] Gemini generated ${text.length} chars`);
            return text;
        }
        return null;
    } catch (error) {
        console.warn(`[DocExtractor] Gemini extraction failed:`, error);
        
        // Track failed call
        recordAPICall({
            provider: "gemini",
            model: process.env.GEMINI_MODEL || "gemini-1.0-pro",
            endpoint: "/generateContent",
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latencyMs: 0,
            success: false,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
        });
        
        return null;
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; FlashcardBot/1.0)",
            },
            redirect: "follow",
        });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

function cleanExtractedText(text: string): string {
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // Remove control characters
        .replace(/\r\n/g, "\n") // Normalize line endings
        .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
        .replace(/[ \t]+/g, " ") // Normalize spaces
        .trim();
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// =============================================================================
// MAIN EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract content from a single document
 */
export async function extractDocumentContent(
    doc: DocumentContent,
    options: { useGeminiForExtraction?: boolean } = {}
): Promise<ExtractedDocument> {
    const { useGeminiForExtraction = true } = options;

    let text: string | null = null;
    let method: ExtractedDocument["metadata"]["method"] = "fallback";

    console.log(`[DocExtractor] Processing: ${doc.title} (${doc.provider})`);

    // Try extraction based on provider
    if (doc.provider === "google_drive") {
        const { fileId, docType } = parseGoogleDriveUrl(doc.url);
        if (fileId) {
            const result = await extractFromGoogleDrive(fileId, docType, doc.title);
            if (result.text) {
                text = result.text;
                method = result.method as ExtractedDocument["metadata"]["method"];
            }
        }
    } else if (doc.provider === "onedrive") {
        const { shareId, isSharePoint } = parseOneDriveUrl(doc.url);
        if (shareId) {
            const result = await extractFromOneDrive(shareId, isSharePoint, doc.title);
            if (result.text) {
                text = result.text;
                method = result.method as ExtractedDocument["metadata"]["method"];
            }
        }
    } else if (doc.provider === "cloudinary") {
        const result = await extractFromCloudinary(doc.url, doc.title);
        if (result.text) {
            text = result.text;
            method = result.method as ExtractedDocument["metadata"]["method"];
        }
    }

    // Fallback to Gemini if direct extraction failed
    if (!text && useGeminiForExtraction) {
        text = await extractWithGemini(doc.title, doc.url, doc.provider);
        if (text) method = "gemini";
    }

    // Final fallback - generate placeholder content
    if (!text) {
        text = generateFallbackContent(doc.title, doc.url, doc.provider);
        method = "fallback";
    }

    return {
        id: doc.id,
        title: doc.title,
        text,
        tokens_est: estimateTokens(text),
        source: {
            provider: doc.provider,
            url: doc.url,
            type: "document",
        },
        metadata: {
            extractedAt: new Date().toISOString(),
            method,
            success: method !== "fallback",
        },
    };
}

/**
 * Extract content from a video (generates educational content based on title)
 */
export async function extractVideoContent(
    video: VideoContent,
    options: { useGeminiForExtraction?: boolean } = {}
): Promise<ExtractedDocument> {
    const { useGeminiForExtraction = true } = options;

    let text: string;
    let method: ExtractedDocument["metadata"]["method"] = "fallback";

    if (useGeminiForExtraction) {
        const geminiText = await extractWithGemini(
            video.title,
            video.url,
            video.provider,
            `Duration: ${video.duration} minutes`
        );
        if (geminiText) {
            text = geminiText;
            method = "gemini";
        } else {
            text = generateVideoFallback(video);
        }
    } else {
        text = generateVideoFallback(video);
    }

    return {
        id: video.id,
        title: video.title,
        text,
        tokens_est: estimateTokens(text),
        source: {
            provider: video.provider,
            url: video.url,
            type: "video",
        },
        metadata: {
            duration: video.duration,
            extractedAt: new Date().toISOString(),
            method,
            success: method !== "fallback",
        },
    };
}

/**
 * Extract content from a recording
 */
export async function extractRecordingContent(
    recording: RecordingContent,
    options: { useGeminiForExtraction?: boolean } = {}
): Promise<ExtractedDocument> {
    const { useGeminiForExtraction = true } = options;

    let text: string;
    let method: ExtractedDocument["metadata"]["method"] = "fallback";

    if (useGeminiForExtraction) {
        const context = recording.description || `Class recording from ${recording.date.toISOString().split("T")[0]}`;
        const geminiText = await extractWithGemini(recording.title, recording.url, "recording", context);
        if (geminiText) {
            text = geminiText;
            method = "gemini";
        } else {
            text = generateRecordingFallback(recording);
        }
    } else {
        text = generateRecordingFallback(recording);
    }

    return {
        id: recording.id,
        title: recording.title,
        text,
        tokens_est: estimateTokens(text),
        source: {
            provider: "recording",
            url: recording.url,
            type: "recording",
        },
        metadata: {
            extractedAt: new Date().toISOString(),
            method,
            success: method !== "fallback",
        },
    };
}

// =============================================================================
// FALLBACK CONTENT GENERATORS
// =============================================================================

function generateFallbackContent(title: string, url: string, provider: string): string {
    return `# ${title}

## Document Overview
This document is part of the course curriculum and contains important educational material.

## Key Learning Points
Based on the document title "${title}", students should focus on:
- Understanding the core concepts presented
- Learning key terminology and definitions
- Applying concepts to practical scenarios
- Preparing for exam questions on this topic

## Study Recommendations
1. Review the main concepts thoroughly
2. Take notes on important definitions
3. Practice applying concepts to examples
4. Review any case studies or examples provided

## Source Information
- Provider: ${provider}
- URL: ${url}
- Note: For complete content, ensure document is accessible for automated extraction.`;
}

function generateVideoFallback(video: VideoContent): string {
    return `# ${video.title}

## Video Overview
Duration: ${video.duration} minutes
Source: ${video.provider}

## Expected Content
This educational video covers important concepts related to the module topic.

## Study Tips
- Watch the complete video
- Take notes on key points
- Pause and review complex sections
- Practice any demonstrated techniques

## Key Takeaways
Students should understand the main concepts presented in this video and be able to apply them in practical scenarios.`;
}

function generateRecordingFallback(recording: RecordingContent): string {
    return `# ${recording.title}

## Recording Information
Date: ${recording.date.toISOString().split("T")[0]}
${recording.description ? `Description: ${recording.description}` : ""}

## Content Overview
This class recording contains lecture content, discussions, and practical examples for the module.

## Study Recommendations
- Review the recording for key concepts
- Note any examples or case studies discussed
- Pay attention to Q&A sections
- Review any demonstrations or walkthroughs`;
}

// =============================================================================
// BATCH EXTRACTION
// =============================================================================

/**
 * Extract content from all module sources
 */
export async function extractAllModuleContent(
    documents: DocumentContent[],
    videos: VideoContent[],
    recordings: RecordingContent[],
    options: { useGeminiForExtraction?: boolean } = {}
): Promise<ExtractionResult> {
    const results: ExtractedDocument[] = [];
    const methods: Record<string, number> = {};

    console.log(`[DocExtractor] Starting batch extraction: ${documents.length} docs, ${videos.length} videos, ${recordings.length} recordings`);

    // Process documents (sequentially to avoid rate limits)
    for (const doc of documents) {
        try {
            const extracted = await extractDocumentContent(doc, options);
            results.push(extracted);
            methods[extracted.metadata.method] = (methods[extracted.metadata.method] || 0) + 1;
        } catch (error) {
            console.error(`[DocExtractor] Failed: ${doc.title}`, error);
        }
    }

    // Process videos
    for (const video of videos) {
        try {
            const extracted = await extractVideoContent(video, options);
            results.push(extracted);
            methods[extracted.metadata.method] = (methods[extracted.metadata.method] || 0) + 1;
        } catch (error) {
            console.error(`[DocExtractor] Failed: ${video.title}`, error);
        }
    }

    // Process recordings
    for (const recording of recordings) {
        try {
            const extracted = await extractRecordingContent(recording, options);
            results.push(extracted);
            methods[extracted.metadata.method] = (methods[extracted.metadata.method] || 0) + 1;
        } catch (error) {
            console.error(`[DocExtractor] Failed: ${recording.title}`, error);
        }
    }

    const successCount = results.filter(r => r.metadata.success).length;
    console.log(`[DocExtractor] Extraction complete: ${successCount}/${results.length} successful`);

    return {
        documents: results,
        totalExtracted: results.length,
        successCount,
        failedCount: results.length - successCount,
        methods,
    };
}

export default {
    extractDocumentContent,
    extractVideoContent,
    extractRecordingContent,
    extractAllModuleContent,
    parseGoogleDriveUrl,
    parseOneDriveUrl,
};
