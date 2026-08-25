import { Request, Response } from 'express';
import { VideoLinkReport } from '../models/videoLinkReport';
import { runVideoLinkCheck } from '../services/videoLinkChecker';

/** GET /api/admin/video-links — latest scan report. */
export const getLatestVideoLinkReport = async (_req: Request, res: Response) => {
  try {
    const report = await VideoLinkReport.findOne().sort({ runAt: -1 }).lean();
    if (!report) {
      return res.status(200).json({
        runAt: null,
        totalVideoSlots: 0,
        uniqueVideos: 0,
        brokenSlots: 0,
        newlyBroken: 0,
        issues: [],
        message: 'No scan has run yet. Trigger one with POST /api/admin/video-links/scan.',
      });
    }
    return res.status(200).json(report);
  } catch (error) {
    console.error('Get video link report error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/admin/video-links/scan — run a scan now.
 *
 * A full sweep takes a couple of minutes, so the response returns immediately
 * and the scan continues in the background; the client polls the GET endpoint
 * for the result rather than holding a request open.
 */
export const triggerVideoLinkScan = async (_req: Request, res: Response) => {
  try {
    runVideoLinkCheck().catch((err) => console.error('❌ [VideoLinkChecker] Manual scan failed:', err));
    return res.status(202).json({ message: 'Video link scan started. Poll GET /api/admin/video-links for the result.' });
  } catch (error) {
    console.error('Trigger video link scan error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
