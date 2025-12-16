/**
 * API Usage Routes
 * Endpoints for tracking and viewing API usage statistics
 */

import { Router, Request, Response } from "express";
import { getAPIUsageStats, clearAPIUsageRecords } from "./index";

const router = Router();

/**
 * GET /api/admin/api-usage
 * Get API usage statistics for Gemini and OpenAI
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const stats = getAPIUsageStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[APIUsage] Error fetching stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch API usage statistics",
        });
    }
});

/**
 * DELETE /api/admin/api-usage
 * Clear all API usage records (admin only)
 */
router.delete("/", async (req: Request, res: Response) => {
    try {
        clearAPIUsageRecords();
        res.json({
            success: true,
            message: "API usage records cleared",
        });
    } catch (error) {
        console.error("[APIUsage] Error clearing records:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear API usage records",
        });
    }
});

export default router;
