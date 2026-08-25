import * as cron from 'node-cron';
import type { Types } from 'mongoose';
import { Course } from '../models/course';
import { User } from '../models/user';
import { VideoLinkReport, IVideoLinkIssue } from '../models/videoLinkReport';
import { createBulkNotifications } from './notificationService';

/**
 * Course video link checker.
 *
 * Course content is hosted on third-party YouTube channels we do not control.
 * Owners delete videos, switch them to private, or turn off embedding at any
 * time, with no signal to us — the video simply stops playing inside the LMS
 * and the student's module progress freezes, because watch time can never be
 * recorded for a player that refuses to start.
 *
 * Historically that surfaced as a support ticket days or weeks later. This
 * service scans every video slot in every course on a schedule, records what
 * it finds, and alerts admins about anything that broke since the last run.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const EMBED_ORIGIN = process.env.FRONTEND_URL || 'https://elearning.globalagi.org';

/** Requests in flight against YouTube. Kept low deliberately — this is a
 *  background sweep, not a latency-sensitive path, and we do not want to look
 *  like a scraper. */
const CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 20_000;

type CheckStatus = IVideoLinkIssue['status'];
interface CheckResult { ok: boolean; status?: CheckStatus; detail: string }

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Two-stage check.
 *
 * oEmbed answers "does this video exist and may third parties embed it" with a
 * status code: 200 healthy, 401 embedding disabled by the owner, 403 private,
 * 404 deleted. That alone is not conclusive — a video can pass oEmbed and still
 * refuse to start in a real player — so anything that passes stage one is then
 * loaded through the same nocookie embed host and origin the student's browser
 * uses, and the response is checked for YouTube's refusal markers.
 */
export async function checkYouTubeVideo(videoId: string): Promise<CheckResult> {
  try {
    const oembed = await fetchWithTimeout(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );

    if (oembed.status === 401) {
      return { ok: false, status: 'embed_disabled', detail: 'Owner has disabled playback on other websites' };
    }
    if (oembed.status === 403) {
      return { ok: false, status: 'private', detail: 'Video is private or access-restricted' };
    }
    if (oembed.status === 404) {
      return { ok: false, status: 'deleted', detail: 'Video no longer exists on YouTube' };
    }
    if (oembed.status !== 200) {
      return { ok: false, status: 'unreachable', detail: `YouTube returned HTTP ${oembed.status}` };
    }

    const embed = await fetchWithTimeout(
      `https://www.youtube-nocookie.com/embed/${videoId}?origin=${encodeURIComponent(EMBED_ORIGIN)}`,
      { headers: { 'User-Agent': UA, Referer: EMBED_ORIGIN } },
    );
    const body = await embed.text();

    if (/Playback on other websites has been disabled/i.test(body)) {
      return { ok: false, status: 'embed_disabled', detail: 'Owner has disabled playback on other websites' };
    }
    if (/"status":"LOGIN_REQUIRED"/.test(body)) {
      return { ok: false, status: 'private', detail: 'Video requires sign-in (private or members-only)' };
    }
    if (/"status":"(ERROR|UNPLAYABLE)"/.test(body)) {
      return { ok: false, status: 'unplayable', detail: 'YouTube reports the video as unplayable' };
    }

    return { ok: true, detail: 'Playable and embeddable' };
  } catch (err) {
    // A network blip is not evidence the video is broken. Report it as its own
    // status so a transient failure is never mistaken for a dead link.
    return { ok: false, status: 'unreachable', detail: `Check failed: ${(err as Error).message}` };
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

interface VideoSlot {
  courseSlug: string;
  courseTitle: string;
  moduleIndex: number;
  moduleTitle: string;
  videoIndex: number;
  videoTitle: string;
  url: string;
}

async function collectVideoSlots(): Promise<VideoSlot[]> {
  const courses = await Course.find({}).lean();
  const slots: VideoSlot[] = [];
  for (const course of courses) {
    (course.modules || []).forEach((module: any, moduleIndex: number) => {
      (module.videos || []).forEach((video: any, videoIndex: number) => {
        slots.push({
          courseSlug: course.slug,
          courseTitle: course.title || '',
          moduleIndex,
          moduleTitle: module.title || `Module ${moduleIndex + 1}`,
          videoIndex,
          videoTitle: video.title || '',
          url: video.url || '',
        });
      });
    });
  }
  return slots;
}

export interface VideoLinkScanResult {
  totalVideoSlots: number;
  uniqueVideos: number;
  brokenSlots: number;
  issues: IVideoLinkIssue[];
  durationMs: number;
}

/**
 * Scan every video slot in every course. Videos are de-duplicated before the
 * network calls — the same YouTube video is often reused across modules, and
 * checking it once is both faster and gentler on YouTube — then the verdict is
 * fanned back out to each slot that uses it.
 */
export async function scanCourseVideos(): Promise<VideoLinkScanResult> {
  const startedAt = Date.now();
  const slots = await collectVideoSlots();

  const idBySlot = slots.map((slot) => extractYouTubeId(slot.url));
  const uniqueIds = Array.from(new Set(idBySlot.filter((id): id is string => Boolean(id))));

  const verdicts = new Map<string, CheckResult>();
  const checked = await mapWithConcurrency(uniqueIds, CONCURRENCY, checkYouTubeVideo);
  uniqueIds.forEach((id, i) => verdicts.set(id, checked[i]));

  const issues: IVideoLinkIssue[] = [];
  slots.forEach((slot, i) => {
    const videoId = idBySlot[i];

    if (!videoId) {
      issues.push({
        ...slot,
        status: 'not_youtube',
        detail: slot.url ? 'URL is not a recognised YouTube link' : 'Video has no URL set',
      });
      return;
    }

    const verdict = verdicts.get(videoId);
    if (verdict && !verdict.ok) {
      issues.push({ ...slot, videoId, status: verdict.status ?? 'unreachable', detail: verdict.detail });
    }
  });

  return {
    totalVideoSlots: slots.length,
    uniqueVideos: uniqueIds.length,
    brokenSlots: issues.length,
    issues,
    durationMs: Date.now() - startedAt,
  };
}

const slotKey = (issue: Pick<IVideoLinkIssue, 'courseSlug' | 'moduleIndex' | 'videoIndex'>) =>
  `${issue.courseSlug}::${issue.moduleIndex}::${issue.videoIndex}`;

/**
 * Run a scan, persist the report, and alert admins about anything that broke
 * since the previous run. Only *newly* broken slots raise a notification —
 * a known-broken video that is still awaiting a replacement must not re-alert
 * on every scan, or the alerts stop being read.
 */
export async function runVideoLinkCheck(options: { notify?: boolean } = {}): Promise<VideoLinkScanResult & { newlyBroken: IVideoLinkIssue[] }> {
  const { notify = true } = options;
  console.log('🎬 [VideoLinkChecker] Starting course video scan...');

  const scan = await scanCourseVideos();

  const previous = await VideoLinkReport.findOne().sort({ runAt: -1 }).lean();
  const previouslyBroken = new Set((previous?.issues || []).map(slotKey));
  const newlyBroken = scan.issues.filter((issue) => !previouslyBroken.has(slotKey(issue)));

  await VideoLinkReport.create({
    runAt: new Date(),
    totalVideoSlots: scan.totalVideoSlots,
    uniqueVideos: scan.uniqueVideos,
    brokenSlots: scan.brokenSlots,
    issues: scan.issues,
    newlyBroken: newlyBroken.length,
    durationMs: scan.durationMs,
  });

  console.log(
    `🎬 [VideoLinkChecker] Scanned ${scan.uniqueVideos} unique videos across ${scan.totalVideoSlots} slots ` +
    `in ${(scan.durationMs / 1000).toFixed(1)}s — ${scan.brokenSlots} broken, ${newlyBroken.length} new.`,
  );

  if (notify && newlyBroken.length > 0) {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>();
    const affectedCourses = Array.from(new Set(newlyBroken.map((i) => i.courseTitle || i.courseSlug)));
    const headline = newlyBroken
      .slice(0, 3)
      .map((i) => `${i.courseTitle || i.courseSlug} · ${i.moduleTitle}`)
      .join('; ');

    await createBulkNotifications(
      admins.map((a) => a._id),
      'admin',
      {
        type: 'general',
        title: `${newlyBroken.length} course video${newlyBroken.length === 1 ? '' : 's'} stopped working`,
        message:
          `${headline}${newlyBroken.length > 3 ? ` and ${newlyBroken.length - 3} more` : ''}. ` +
          `Students on ${affectedCourses.length} course${affectedCourses.length === 1 ? '' : 's'} cannot complete these modules until the videos are replaced.`,
        actionUrl: '/admin/courses',
      },
    );
  }

  return { ...scan, newlyBroken };
}

let checkerTask: cron.ScheduledTask | null = null;

/** Scan nightly at 02:30 server time — outside student hours, and early enough
 *  that a break is on the admin dashboard before the working day starts. */
export const startVideoLinkChecker = () => {
  console.log('🎬 Starting Course Video Link Checker...');
  checkerTask = cron.schedule('30 2 * * *', () => {
    runVideoLinkCheck().catch((err) => console.error('❌ [VideoLinkChecker] Scan failed:', err));
  });
  console.log('✅ Video link checker started — nightly scan at 02:30');
};

export const stopVideoLinkChecker = () => {
  if (checkerTask) {
    checkerTask.destroy();
    checkerTask = null;
    console.log('🎬 Video link checker stopped');
  }
};
