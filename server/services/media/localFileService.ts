/**
 * Local File Service
 * 
 * Handles streaming of local media files.
 * 
 * Environment Variables:
 * - LOCAL_MEDIA_PATH: Base path for local media files
 */

import * as fs from "fs";
import * as path from "path";
import { lookup as mimeLookup } from "mime-types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOCAL_MEDIA_PATH = process.env.LOCAL_MEDIA_PATH || "./server/tmp/media";

// Ensure directory exists
if (!fs.existsSync(LOCAL_MEDIA_PATH)) {
    fs.mkdirSync(LOCAL_MEDIA_PATH, { recursive: true });
}

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Get file path for a local file ID.
 * 
 * File IDs can be:
 * - Direct filenames (alphanumeric with extension)
 * - Encoded paths (base64 encoded relative paths)
 */
export function resolveFilePath(fileId: string): string {
    // Security: Prevent directory traversal
    const sanitized = path.basename(fileId.replace(/\.\./g, ""));

    // Check if it's a base64 encoded path
    if (/^[a-zA-Z0-9+/]+=*$/.test(fileId) && fileId.length > 20) {
        try {
            const decoded = Buffer.from(fileId, "base64").toString("utf-8");
            const decodedSanitized = decoded.replace(/\.\./g, "").replace(/^\//, "");
            return path.join(LOCAL_MEDIA_PATH, decodedSanitized);
        } catch {
            // Not valid base64, use as-is
        }
    }

    return path.join(LOCAL_MEDIA_PATH, sanitized);
}

/**
 * Check if a local file exists.
 */
export function localFileExists(fileId: string): boolean {
    const filePath = resolveFilePath(fileId);
    return fs.existsSync(filePath);
}

/**
 * Get local file metadata.
 */
export async function getLocalFileInfo(fileId: string): Promise<{
    path: string;
    name: string;
    size: number;
    mimeType: string;
    exists: boolean;
}> {
    const filePath = resolveFilePath(fileId);

    if (!fs.existsSync(filePath)) {
        return {
            path: filePath,
            name: path.basename(filePath),
            size: 0,
            mimeType: "application/octet-stream",
            exists: false,
        };
    }

    const stats = fs.statSync(filePath);
    const name = path.basename(filePath);
    const mimeType = mimeLookup(name) || "application/octet-stream";

    return {
        path: filePath,
        name,
        size: stats.size,
        mimeType,
        exists: true,
    };
}

/**
 * Stream local file content.
 */
export async function streamLocalFile(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength?: number;
    filename?: string;
}> {
    const info = await getLocalFileInfo(fileId);

    if (!info.exists) {
        throw new Error(`File not found: ${fileId}`);
    }

    const stream = fs.createReadStream(info.path);

    return {
        stream,
        contentType: info.mimeType,
        contentLength: info.size,
        filename: info.name,
    };
}

/**
 * Stream local file with range support.
 */
export async function streamLocalFileRange(
    fileId: string,
    rangeStart: number,
    rangeEnd?: number
): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength: number;
    contentRange: string;
}> {
    const info = await getLocalFileInfo(fileId);

    if (!info.exists) {
        throw new Error(`File not found: ${fileId}`);
    }

    const end = rangeEnd ?? info.size - 1;

    // Validate range
    if (rangeStart < 0 || rangeStart >= info.size) {
        throw new Error(`Invalid range start: ${rangeStart}`);
    }

    if (end >= info.size) {
        throw new Error(`Invalid range end: ${end}`);
    }

    const stream = fs.createReadStream(info.path, {
        start: rangeStart,
        end,
    });

    return {
        stream,
        contentType: info.mimeType,
        contentLength: end - rangeStart + 1,
        contentRange: `bytes ${rangeStart}-${end}/${info.size}`,
    };
}

/**
 * Save a file to local storage.
 * Returns the file ID.
 */
export async function saveLocalFile(
    content: Buffer | NodeJS.ReadableStream,
    filename: string
): Promise<string> {
    const safeName = path.basename(filename.replace(/\.\./g, ""));
    const filePath = path.join(LOCAL_MEDIA_PATH, safeName);

    if (Buffer.isBuffer(content)) {
        fs.writeFileSync(filePath, content);
    } else {
        const writeStream = fs.createWriteStream(filePath);

        await new Promise<void>((resolve, reject) => {
            content.pipe(writeStream);
            content.on("end", resolve);
            content.on("error", reject);
            writeStream.on("error", reject);
        });
    }

    return safeName;
}

/**
 * Delete a local file.
 */
export function deleteLocalFile(fileId: string): boolean {
    const filePath = resolveFilePath(fileId);

    if (!fs.existsSync(filePath)) {
        return false;
    }

    fs.unlinkSync(filePath);
    return true;
}

/**
 * List local media files.
 */
export function listLocalFiles(): string[] {
    if (!fs.existsSync(LOCAL_MEDIA_PATH)) {
        return [];
    }

    return fs.readdirSync(LOCAL_MEDIA_PATH)
        .filter(name => !name.startsWith("."));
}

// =============================================================================
// EXPORTS
// =============================================================================

export { LOCAL_MEDIA_PATH };
