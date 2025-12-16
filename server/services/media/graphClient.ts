/**
 * Microsoft Graph Client
 * 
 * Thin wrapper for Microsoft Graph API / OneDrive operations.
 * Used by signed link service and media proxy.
 * 
 * Environment Variables:
 * - MS_GRAPH_CLIENT_ID: Azure AD application client ID
 * - MS_GRAPH_CLIENT_SECRET: Azure AD application secret
 * - MS_GRAPH_TENANT_ID: Azure AD tenant ID
 */

// =============================================================================
// TYPES
// =============================================================================

interface OneDriveItem {
    id: string;
    name: string;
    size: number;
    file?: {
        mimeType: string;
    };
    "@microsoft.graph.downloadUrl"?: string;
    webUrl?: string;
}

interface GraphTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
const TENANT_ID = process.env.MS_GRAPH_TENANT_ID || "common";

let accessToken: string | null = null;
let tokenExpiry: number = 0;

// =============================================================================
// AUTH
// =============================================================================

/**
 * Get access token using client credentials flow.
 */
async function getAccessToken(): Promise<string | null> {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.warn("[GraphClient] Missing MS_GRAPH_CLIENT_ID or MS_GRAPH_CLIENT_SECRET");
        return null;
    }

    // Return cached token if still valid
    if (accessToken && Date.now() < tokenExpiry - 60000) {
        return accessToken;
    }

    try {
        const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                scope: "https://graph.microsoft.com/.default",
                grant_type: "client_credentials",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token request failed: ${response.status} ${error}`);
        }

        const data = await response.json() as GraphTokenResponse;
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        return accessToken;
    } catch (error) {
        console.error("[GraphClient] Failed to get access token:", error);
        return null;
    }
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get file metadata from OneDrive.
 * 
 * @param itemId - OneDrive item ID
 * @param driveId - Optional drive ID (defaults to user's OneDrive)
 */
export async function getOneDriveItem(
    itemId: string,
    driveId?: string
): Promise<OneDriveItem | null> {
    const token = await getAccessToken();
    if (!token) {
        return null;
    }

    try {
        // Build URL based on whether driveId is provided
        const url = driveId
            ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`
            : `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            console.warn(`[GraphClient] Get item failed: ${response.status}`);
            return null;
        }

        return await response.json() as OneDriveItem;
    } catch (error) {
        console.error("[GraphClient] Get item error:", error);
        return null;
    }
}

/**
 * Get playable URL for OneDrive file.
 * 
 * Returns the temporary download URL from Graph API.
 */
export async function getOneDriveFileUrl(
    itemId: string,
    driveId?: string
): Promise<string | null> {
    const item = await getOneDriveItem(itemId, driveId);

    if (!item) {
        return null;
    }

    // The @microsoft.graph.downloadUrl is a pre-authenticated URL valid for ~1 hour
    if (item["@microsoft.graph.downloadUrl"]) {
        return item["@microsoft.graph.downloadUrl"];
    }

    // Fallback to web URL (requires auth)
    return item.webUrl || null;
}

/**
 * Create a sharing link for OneDrive file.
 */
export async function createSharingLink(
    itemId: string,
    driveId?: string,
    type: "view" | "edit" = "view",
    expiryHours: number = 1
): Promise<string | null> {
    const token = await getAccessToken();
    if (!token) {
        return null;
    }

    try {
        const url = driveId
            ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/createLink`
            : `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/createLink`;

        const expiryDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type,
                scope: "anonymous",
                expirationDateTime: expiryDate.toISOString(),
            }),
        });

        if (!response.ok) {
            console.warn(`[GraphClient] Create link failed: ${response.status}`);
            return null;
        }

        const data = await response.json() as {
            link: { webUrl: string };
        };

        return data.link.webUrl;
    } catch (error) {
        console.error("[GraphClient] Create link error:", error);
        return null;
    }
}

/**
 * Stream file content from OneDrive.
 */
export async function streamOneDriveFile(
    itemId: string,
    driveId?: string
): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength?: number;
    filename?: string;
}> {
    const token = await getAccessToken();
    if (!token) {
        throw new Error("No access token available");
    }

    // Get item metadata first
    const item = await getOneDriveItem(itemId, driveId);
    if (!item) {
        throw new Error("Item not found");
    }

    // Get download URL
    const downloadUrl = item["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
        throw new Error("No download URL available");
    }

    // Download content
    const response = await fetch(downloadUrl);

    if (!response.ok) {
        throw new Error(`OneDrive download failed: ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");
    const nodeStream = await webStreamToNodeStream(response.body!);

    return {
        stream: nodeStream,
        contentType: item.file?.mimeType || "application/octet-stream",
        contentLength: contentLength ? parseInt(contentLength, 10) : item.size,
        filename: item.name,
    };
}

/**
 * Stream file with range support.
 */
export async function streamOneDriveFileRange(
    itemId: string,
    rangeStart: number,
    rangeEnd?: number,
    driveId?: string
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

    const item = await getOneDriveItem(itemId, driveId);
    if (!item) {
        throw new Error("Item not found");
    }

    const downloadUrl = item["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
        throw new Error("No download URL available");
    }

    const fileSize = item.size;
    const end = rangeEnd ?? fileSize - 1;

    const response = await fetch(downloadUrl, {
        headers: {
            Range: `bytes=${rangeStart}-${end}`,
        },
    });

    if (!response.ok && response.status !== 206) {
        throw new Error(`OneDrive range request failed: ${response.status}`);
    }

    const nodeStream = await webStreamToNodeStream(response.body!);

    return {
        stream: nodeStream,
        contentType: item.file?.mimeType || "application/octet-stream",
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
    getAccessToken,
    CLIENT_ID,
    TENANT_ID,
};
