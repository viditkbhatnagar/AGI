/**
 * Signed Link Service
 * 
 * Generates short-lived signed URLs for media playback with timestamp support.
 * Supports Google Drive, OneDrive, and local files.
 * 
 * Strategies:
 * 1. Provider-native signed URLs (preferred when available)
 * 2. Backend proxy with JWT token (fallback for protected content)
 * 
 * Environment Variables:
 * - SIGNING_KEY: Secret for JWT signing (required)
 * - GOOGLE_SERVICE_ACCOUNT_JSON: Path to service account JSON (for Drive)
 * - MEDIA_LINK_EXPIRY_SECONDS: Default link expiry (default: 300)
 */

import jwt from "jsonwebtoken";
import { Counter } from "prom-client";

// =============================================================================
// TYPES
// =============================================================================

export type MediaProvider = "google_drive" | "onedrive" | "local";

export interface SignedLinkParams {
    /** File ID from the provider */
    file_id: string;
    /** Media provider */
    provider: MediaProvider;
    /** Start time in seconds for timestamp jumping */
    start?: number;
    /** Link expiry in seconds (default: 300) */
    expiry?: number;
    /** User ID for authorization */
    user_id?: string;
    /** Module ID for ACL check */
    module_id?: string;
}

export interface SignedLinkResult {
    /** URL to play media */
    playUrl: string;
    /** Start time in seconds */
    start_sec: number;
    /** Expiry timestamp */
    expiry_at: string;
    /** Whether this is a proxy URL */
    is_proxy: boolean;
}

export interface StreamTokenPayload {
    file_id: string;
    provider: MediaProvider;
    user_id?: string;
    module_id?: string;
    exp: number;
    iat: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SIGNING_KEY = process.env.SIGNING_KEY || "dev-signing-key-change-in-production";
const DEFAULT_EXPIRY_SECONDS = parseInt(
    process.env.MEDIA_LINK_EXPIRY_SECONDS || "300",
    10
);
const MAX_EXPIRY_SECONDS = 3600; // 1 hour max

// Warn if using default key in production
if (SIGNING_KEY === "dev-signing-key-change-in-production" && process.env.NODE_ENV === "production") {
    console.error("[SignedLink] WARNING: Using default signing key in production!");
}

// =============================================================================
// METRICS
// =============================================================================

export const signedLinksTotal = new Counter({
    name: "api_media_signed_requests_total",
    help: "Total signed media link requests",
    labelNames: ["provider", "type"],
});

export const streamRequestsTotal = new Counter({
    name: "api_media_stream_requests_total",
    help: "Total media stream requests",
    labelNames: ["provider"],
});

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Generate a signed playback URL for media.
 * 
 * @param params - Signed link parameters
 * @returns Signed link result with playUrl and metadata
 */
export async function generateSignedLink(
    params: SignedLinkParams
): Promise<SignedLinkResult> {
    const {
        file_id,
        provider,
        start = 0,
        expiry = DEFAULT_EXPIRY_SECONDS,
        user_id,
        module_id,
    } = params;

    // Validate expiry
    const safeExpiry = Math.min(Math.max(expiry, 60), MAX_EXPIRY_SECONDS);
    const expiryAt = new Date(Date.now() + safeExpiry * 1000);

    console.log(`[SignedLink] Generating link for ${provider}/${file_id} start=${start}s`);

    try {
        switch (provider) {
            case "google_drive":
                return await generateDriveLink(file_id, start, safeExpiry, expiryAt, user_id, module_id);

            case "onedrive":
                return await generateOneDriveLink(file_id, start, safeExpiry, expiryAt, user_id, module_id);

            case "local":
                return generateLocalLink(file_id, start, safeExpiry, expiryAt, user_id, module_id);

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    } catch (error) {
        console.error(`[SignedLink] Failed for ${provider}/${file_id}:`, error);

        // Fallback to proxy
        signedLinksTotal.inc({ provider, type: "proxy_fallback" });
        return generateProxyLink(file_id, provider, start, safeExpiry, expiryAt, user_id, module_id);
    }
}

/**
 * Generate a signed proxy token for streaming.
 */
export function generateProxyToken(
    file_id: string,
    provider: MediaProvider,
    expiry: number,
    user_id?: string,
    module_id?: string
): string {
    const payload: Omit<StreamTokenPayload, "exp" | "iat"> = {
        file_id,
        provider,
        user_id,
        module_id,
    };

    return jwt.sign(payload, SIGNING_KEY, {
        expiresIn: expiry,
    });
}

/**
 * Verify a proxy token and return payload.
 */
export function verifyProxyToken(token: string): StreamTokenPayload | null {
    try {
        const payload = jwt.verify(token, SIGNING_KEY) as StreamTokenPayload;
        return payload;
    } catch (error) {
        console.warn("[SignedLink] Token verification failed:", error);
        return null;
    }
}

// =============================================================================
// PROVIDER-SPECIFIC IMPLEMENTATIONS
// =============================================================================

/**
 * Generate Google Drive playback link.
 * 
 * Strategy:
 * 1. If file is publicly accessible, return direct link
 * 2. If service account has access, get download URL
 * 3. Fallback to proxy
 */
async function generateDriveLink(
    file_id: string,
    start: number,
    expiry: number,
    expiryAt: Date,
    user_id?: string,
    module_id?: string
): Promise<SignedLinkResult> {
    // Try to get direct link via Drive API
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
        try {
            const { getDriveFileUrl } = await import("./driveClient");
            const driveUrl = await getDriveFileUrl(file_id);

            if (driveUrl) {
                signedLinksTotal.inc({ provider: "google_drive", type: "direct" });

                // Add timestamp parameter for video seeking
                // Google Drive embedded player supports t= parameter
                const playUrl = start > 0
                    ? `${driveUrl}#t=${Math.floor(start)}`
                    : driveUrl;

                return {
                    playUrl,
                    start_sec: start,
                    expiry_at: expiryAt.toISOString(),
                    is_proxy: false,
                };
            }
        } catch (error) {
            console.warn("[SignedLink] Drive direct link failed:", error);
        }
    }

    // Fallback to proxy
    return generateProxyLink(file_id, "google_drive", start, expiry, expiryAt, user_id, module_id);
}

/**
 * Generate OneDrive playback link.
 * 
 * Strategy:
 * 1. Create sharing link via Graph API
 * 2. Fallback to proxy
 */
async function generateOneDriveLink(
    file_id: string,
    start: number,
    expiry: number,
    expiryAt: Date,
    user_id?: string,
    module_id?: string
): Promise<SignedLinkResult> {
    const clientId = process.env.MS_GRAPH_CLIENT_ID;
    const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;

    if (clientId && clientSecret) {
        try {
            const { getOneDriveFileUrl } = await import("./graphClient");
            const onedriveUrl = await getOneDriveFileUrl(file_id);

            if (onedriveUrl) {
                signedLinksTotal.inc({ provider: "onedrive", type: "direct" });

                return {
                    playUrl: onedriveUrl,
                    start_sec: start,
                    expiry_at: expiryAt.toISOString(),
                    is_proxy: false,
                };
            }
        } catch (error) {
            console.warn("[SignedLink] OneDrive direct link failed:", error);
        }
    }

    // Fallback to proxy
    return generateProxyLink(file_id, "onedrive", start, expiry, expiryAt, user_id, module_id);
}

/**
 * Generate local file playback link (always uses proxy).
 */
function generateLocalLink(
    file_id: string,
    start: number,
    expiry: number,
    expiryAt: Date,
    user_id?: string,
    module_id?: string
): SignedLinkResult {
    signedLinksTotal.inc({ provider: "local", type: "proxy" });
    return generateProxyLink(file_id, "local", start, expiry, expiryAt, user_id, module_id);
}

/**
 * Generate a proxy URL with signed JWT token.
 */
function generateProxyLink(
    file_id: string,
    provider: MediaProvider,
    start: number,
    expiry: number,
    expiryAt: Date,
    user_id?: string,
    module_id?: string
): SignedLinkResult {
    const token = generateProxyToken(file_id, provider, expiry, user_id, module_id);

    signedLinksTotal.inc({ provider, type: "proxy" });

    // Build proxy URL
    const baseUrl = process.env.API_BASE_URL || "";
    const playUrl = `${baseUrl}/media/stream?token=${encodeURIComponent(token)}&start=${start}`;

    return {
        playUrl,
        start_sec: start,
        expiry_at: expiryAt.toISOString(),
        is_proxy: true,
    };
}

// =============================================================================
// STREAM HELPERS
// =============================================================================

/**
 * Get file stream for proxying.
 * Returns a readable stream and content info.
 */
export async function getFileStream(
    payload: StreamTokenPayload
): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength?: number;
    filename?: string;
}> {
    const { file_id, provider } = payload;

    streamRequestsTotal.inc({ provider });

    switch (provider) {
        case "google_drive": {
            const { streamDriveFile } = await import("./driveClient");
            return await streamDriveFile(file_id);
        }

        case "onedrive": {
            const { streamOneDriveFile } = await import("./graphClient");
            return await streamOneDriveFile(file_id);
        }

        case "local": {
            const { streamLocalFile } = await import("./localFileService");
            return await streamLocalFile(file_id);
        }

        default:
            throw new Error(`Unsupported provider for streaming: ${provider}`);
    }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate provider string.
 */
export function isValidProvider(provider: string): provider is MediaProvider {
    return ["google_drive", "onedrive", "local"].includes(provider);
}

/**
 * Validate file_id format.
 */
export function isValidFileId(file_id: string): boolean {
    if (!file_id || typeof file_id !== "string") {
        return false;
    }
    // Basic validation - alphanumeric with dashes/underscores
    return /^[a-zA-Z0-9_-]{1,256}$/.test(file_id);
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    SIGNING_KEY,
    DEFAULT_EXPIRY_SECONDS,
    MAX_EXPIRY_SECONDS,
};
