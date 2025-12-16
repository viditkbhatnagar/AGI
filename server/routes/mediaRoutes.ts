/**
 * Media API Routes
 * 
 * REST API routes for media playback with signed links.
 * 
 * Routes:
 * - GET /api/media/play - Generate signed playback URL
 * - GET /media/stream - Stream media content (proxy)
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
    generateSignedLink,
    verifyProxyToken,
    getFileStream,
    isValidProvider,
    isValidFileId,
    signedLinksTotal,
    streamRequestsTotal,
    type MediaProvider,
} from "../services/media/signedLink";
import {
    streamDriveFileRange,
} from "../services/media/driveClient";
import {
    streamOneDriveFileRange,
} from "../services/media/graphClient";
import {
    streamLocalFileRange,
    getLocalFileInfo,
} from "../services/media/localFileService";

// =============================================================================
// SCHEMAS
// =============================================================================

const PlayRequestSchema = z.object({
    file_id: z.string().min(1).max(256),
    provider: z.enum(["google_drive", "onedrive", "local"]),
    start: z.coerce.number().min(0).max(86400).optional().default(0),
    expiry: z.coerce.number().min(60).max(3600).optional().default(300),
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Rate limiter for media endpoints.
 */
const mediaRateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MEDIA_PER_MIN = parseInt(
    process.env.RATE_LIMIT_MEDIA_PER_MIN || "60",
    10
);

function mediaRateLimit(req: Request, res: Response, next: NextFunction) {
    const key = `media:${req.ip}`;
    const now = Date.now();
    const windowMs = 60000;

    const entry = mediaRateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        mediaRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        next();
        return;
    }

    if (entry.count >= RATE_LIMIT_MEDIA_PER_MIN) {
        res.status(429).json({
            error: "Too many requests",
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        });
        return;
    }

    entry.count++;
    next();
}

/**
 * Auth middleware placeholder.
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
    // In production, verify JWT/session
    if (!(req as any).user) {
        (req as any).user = { id: "anonymous", role: "user" };
    }
    next();
}

/**
 * Async handler wrapper.
 */
function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// =============================================================================
// ROUTERS
// =============================================================================

const apiRouter = Router();
const streamRouter = Router();

// =============================================================================
// GET /api/media/play
// =============================================================================

/**
 * Generate a signed playback URL for media.
 * 
 * Query params:
 * - file_id: File ID from provider
 * - provider: google_drive | onedrive | local
 * - start: Start time in seconds (optional)
 * - expiry: Link expiry in seconds (optional, default 300)
 */
apiRouter.get(
    "/play",
    requireAuth,
    mediaRateLimit,
    asyncHandler(async (req: Request, res: Response) => {
        // Validate query params
        const parseResult = PlayRequestSchema.safeParse(req.query);

        if (!parseResult.success) {
            res.status(400).json({
                error: "Invalid parameters",
                details: parseResult.error.errors,
            });
            return;
        }

        const { file_id, provider, start, expiry } = parseResult.data;

        // Additional validation
        if (!isValidFileId(file_id)) {
            res.status(400).json({ error: "Invalid file_id format" });
            return;
        }

        // Get user info for authorization
        const user = (req as any).user;
        const moduleId = req.query.module_id as string | undefined;

        // TODO: Check user has access to this module/file
        // For now, allow all authenticated requests

        console.log(`[MediaAPI] Play request: ${provider}/${file_id} start=${start}s by ${user.id}`);

        // Generate signed link
        const result = await generateSignedLink({
            file_id,
            provider,
            start,
            expiry,
            user_id: user.id,
            module_id: moduleId,
        });

        res.json(result);
    })
);

// =============================================================================
// GET /media/stream
// =============================================================================

/**
 * Stream media content via proxy.
 * 
 * Query params:
 * - token: Signed JWT token
 * - start: Start time in seconds (for player to seek)
 */
streamRouter.get(
    "/stream",
    asyncHandler(async (req: Request, res: Response) => {
        const token = req.query.token as string;
        const startSec = parseFloat(req.query.start as string) || 0;

        if (!token) {
            res.status(400).json({ error: "Token required" });
            return;
        }

        // Verify token
        const payload = verifyProxyToken(token);

        if (!payload) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        const { file_id, provider } = payload;

        console.log(`[MediaAPI] Stream request: ${provider}/${file_id}`);
        streamRequestsTotal.inc({ provider });

        // Handle Range header for video seeking
        const range = req.headers.range;

        if (range) {
            await handleRangeRequest(req, res, file_id, provider, range);
        } else {
            await handleFullRequest(req, res, file_id, provider);
        }
    })
);

// =============================================================================
// STREAM HANDLERS
// =============================================================================

async function handleFullRequest(
    req: Request,
    res: Response,
    fileId: string,
    provider: MediaProvider
): Promise<void> {
    try {
        const { stream, contentType, contentLength, filename } = await getFileStream({
            file_id: fileId,
            provider,
            exp: 0,
            iat: 0,
        });

        // Set headers
        res.setHeader("Content-Type", contentType);
        if (contentLength) {
            res.setHeader("Content-Length", contentLength);
        }
        if (filename) {
            res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        }
        res.setHeader("Accept-Ranges", "bytes");

        // Pipe stream
        stream.pipe(res);

        stream.on("error", (error) => {
            console.error("[MediaAPI] Stream error:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Stream failed" });
            }
        });

    } catch (error) {
        console.error("[MediaAPI] Full request failed:", error);
        res.status(500).json({ error: "Failed to stream file" });
    }
}

async function handleRangeRequest(
    req: Request,
    res: Response,
    fileId: string,
    provider: MediaProvider,
    range: string
): Promise<void> {
    try {
        // Parse Range header
        const match = range.match(/bytes=(\d+)-(\d*)/);
        if (!match) {
            res.status(400).json({ error: "Invalid Range header" });
            return;
        }

        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : undefined;

        let result: {
            stream: NodeJS.ReadableStream;
            contentType: string;
            contentLength: number;
            contentRange: string;
        };

        switch (provider) {
            case "google_drive":
                result = await streamDriveFileRange(fileId, start, end);
                break;
            case "onedrive":
                result = await streamOneDriveFileRange(fileId, start, end);
                break;
            case "local":
                result = await streamLocalFileRange(fileId, start, end);
                break;
            default:
                res.status(400).json({ error: "Unsupported provider for range" });
                return;
        }

        // Set 206 Partial Content response
        res.status(206);
        res.setHeader("Content-Type", result.contentType);
        res.setHeader("Content-Length", result.contentLength);
        res.setHeader("Content-Range", result.contentRange);
        res.setHeader("Accept-Ranges", "bytes");

        result.stream.pipe(res);

        result.stream.on("error", (error) => {
            console.error("[MediaAPI] Range stream error:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Stream failed" });
            }
        });

    } catch (error) {
        console.error("[MediaAPI] Range request failed:", error);
        res.status(500).json({ error: "Failed to stream file range" });
    }
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

function mediaErrorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("[MediaAPI] Error:", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: "Media service error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    apiRouter as mediaApiRouter,
    streamRouter as mediaStreamRouter,
    mediaErrorHandler,
    PlayRequestSchema,
};

export default apiRouter;
