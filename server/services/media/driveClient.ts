/**
 * Google Drive Client
 * 
 * Thin wrapper for Google Drive API operations.
 * Used by signed link service and media proxy.
 * 
 * Environment Variables:
 * - GOOGLE_SERVICE_ACCOUNT_JSON: Path to service account credentials
 * - GOOGLE_APPLICATION_CREDENTIALS: Alternative path for ADC
 */

import * as fs from "fs";
import * as path from "path";

// =============================================================================
// TYPES
// =============================================================================

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    webContentLink?: string;
    webViewLink?: string;
}

interface ServiceAccountCredentials {
    client_email: string;
    private_key: string;
    project_id: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

let credentials: ServiceAccountCredentials | null = null;
let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Load service account credentials.
 */
async function loadCredentials(): Promise<ServiceAccountCredentials | null> {
    if (credentials) {
        return credentials;
    }

    const credentialsPath =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!credentialsPath) {
        console.warn("[DriveClient] No service account credentials configured");
        return null;
    }

    try {
        const content = fs.readFileSync(credentialsPath, "utf-8");
        credentials = JSON.parse(content);
        return credentials;
    } catch (error) {
        console.error("[DriveClient] Failed to load credentials:", error);
        return null;
    }
}

/**
 * Get access token using service account.
 */
async function getAccessToken(): Promise<string | null> {
    const creds = await loadCredentials();
    if (!creds) {
        return null;
    }

    // Return cached token if still valid
    if (accessToken && Date.now() < tokenExpiry - 60000) {
        return accessToken;
    }

    try {
        // Create JWT for service account auth
        const jwt = await import("jsonwebtoken");

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: creds.client_email,
            scope: "https://www.googleapis.com/auth/drive.readonly",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
        };

        const token = jwt.default.sign(payload, creds.private_key, { algorithm: "RS256" });

        // Exchange JWT for access token
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: token,
            }),
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        const data = await response.json() as { access_token: string; expires_in: number };
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        return accessToken;
    } catch (error) {
        console.error("[DriveClient] Failed to get access token:", error);
        return null;
    }
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get file metadata from Drive.
 */
export async function getDriveFile(fileId: string): Promise<DriveFile | null> {
    const token = await getAccessToken();
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webContentLink,webViewLink`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        if (!response.ok) {
            console.warn(`[DriveClient] Get file failed: ${response.status}`);
            return null;
        }

        return await response.json() as DriveFile;
    } catch (error) {
        console.error("[DriveClient] Get file error:", error);
        return null;
    }
}

/**
 * Get playable URL for Drive file.
 */
export async function getDriveFileUrl(fileId: string): Promise<string | null> {
    const file = await getDriveFile(fileId);

    if (!file) {
        return null;
    }

    // For video files, use preview link (embeddable)
    if (file.mimeType?.startsWith("video/")) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    // For audio, use direct download link
    if (file.mimeType?.startsWith("audio/")) {
        return file.webContentLink || null;
    }

    // For other files, return web view link
    return file.webViewLink || null;
}

/**
 * Stream file content from Drive.
 */
export async function streamDriveFile(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength?: number;
    filename?: string;
}> {
    const token = await getAccessToken();
    if (!token) {
        throw new Error("No access token available");
    }

    // Get file metadata first
    const file = await getDriveFile(fileId);
    if (!file) {
        throw new Error("File not found");
    }

    // Download file content
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (!response.ok) {
        throw new Error(`Drive download failed: ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");

    // Convert web ReadableStream to Node.js stream
    const nodeStream = await webStreamToNodeStream(response.body!);

    return {
        stream: nodeStream,
        contentType: file.mimeType || "application/octet-stream",
        contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
        filename: file.name,
    };
}

/**
 * Stream file with range support.
 */
export async function streamDriveFileRange(
    fileId: string,
    rangeStart: number,
    rangeEnd?: number
): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength: number;
    contentRange: string;
}> {
    const token = await getAccessToken();
    if (!token) {
        throw new Error("No access token available");
    }

    const file = await getDriveFile(fileId);
    if (!file) {
        throw new Error("File not found");
    }

    const fileSize = file.size ? parseInt(file.size, 10) : 0;
    const end = rangeEnd ?? fileSize - 1;

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Range: `bytes=${rangeStart}-${end}`,
            },
        }
    );

    if (!response.ok && response.status !== 206) {
        throw new Error(`Drive range request failed: ${response.status}`);
    }

    const nodeStream = await webStreamToNodeStream(response.body!);

    return {
        stream: nodeStream,
        contentType: file.mimeType || "application/octet-stream",
        contentLength: end - rangeStart + 1,
        contentRange: `bytes ${rangeStart}-${end}/${fileSize}`,
    };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert Web ReadableStream to Node.js Readable.
 */
async function webStreamToNodeStream(
    webStream: ReadableStream<Uint8Array>
): Promise<NodeJS.ReadableStream> {
    const { Readable } = await import("stream");

    return new Readable({
        async read() {
            const reader = webStream.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        this.push(null);
                        break;
                    }

                    this.push(Buffer.from(value));
                }
            } catch (error) {
                this.destroy(error as Error);
            }
        },
    });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    loadCredentials,
    getAccessToken,
};
