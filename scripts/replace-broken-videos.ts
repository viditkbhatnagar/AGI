/**
 * One-off replacement of the seven broken course video slots found by the
 * August 2026 link scan. Kept in the repo as the audit record of what was
 * changed in production course content, and when.
 *
 *   npm run fix:videos            dry run — prints the diff, changes nothing
 *   npm run fix:videos -- --apply writes the replacements
 *
 * Every replacement was verified embeddable before being listed here. The run
 * re-verifies each one against YouTube before writing, so a video that broke
 * between authoring and execution is skipped rather than swapped in blind.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Course } from '../server/models/course';
import { checkYouTubeVideo, extractYouTubeId } from '../server/services/videoLinkChecker';

interface Replacement {
  courseSlug: string;
  moduleIndex: number;
  videoIndex: number;
  /** Guard: the swap only applies if the slot still holds this video id. */
  expectedOldId: string;
  newUrl: string;
  newTitle: string;
  reason: string;
}

const REPLACEMENTS: Replacement[] = [
  {
    courseSlug: 'Certified-Purchasing-and-Procurement-Manager.',
    moduleIndex: 1, videoIndex: 0, expectedOldId: 'st2nl6Vp4eg',
    newUrl: 'https://www.youtube.com/watch?v=XibS0susCP8',
    newTitle: 'What is Supplier Relationship Management? SRM Process, Tools & Collaboration Types',
    reason: 'Original had embedding disabled by the owner',
  },
  {
    courseSlug: 'Certified-Purchasing-and-Procurement-Manager.',
    moduleIndex: 9, videoIndex: 0, expectedOldId: 'HPdRmNwNxss',
    newUrl: 'https://www.youtube.com/watch?v=yv6vp09NeBU',
    newTitle: '9 Procurement Skills You Need To Know',
    reason: 'Original was set to private by the owner',
  },
  {
    courseSlug: 'Certified-Project-Manager',
    moduleIndex: 1, videoIndex: 0, expectedOldId: 'v7m_g1WLYg4',
    newUrl: 'https://www.youtube.com/watch?v=c95wGysj9Nc',
    newTitle: 'What is a Business Case? Project Management in Under 5',
    reason: 'Original had embedding disabled by the owner',
  },
  {
    courseSlug: 'Certified-Project-Manager',
    moduleIndex: 6, videoIndex: 1, expectedOldId: 'ZTdawTTTTr8',
    newUrl: 'https://www.youtube.com/watch?v=JmB6GNt8JF8',
    newTitle: 'Difference between Contingency Plan and Fallback Plan',
    reason: 'Original was deleted from YouTube',
  },
  {
    courseSlug: 'Accounting-and-Finance',
    moduleIndex: 0, videoIndex: 1, expectedOldId: 'zpYNeSxEHi8',
    newUrl: 'https://www.youtube.com/watch?v=yYX4bvQSqbo',
    newTitle: 'Accounting Basics: A Guide to (Almost) Everything',
    reason: 'Original was deleted from YouTube',
  },
  {
    courseSlug: 'Accounting-and-Finance',
    moduleIndex: 1, videoIndex: 0, expectedOldId: 'zpYNeSxEHi8',
    newUrl: 'https://www.youtube.com/watch?v=Rpa_UAciIeU',
    newTitle: 'Introduction to Financial Accounting',
    reason: 'Original was deleted, and was a duplicate of the Module 0 video',
  },
  {
    courseSlug: 'Certified-Logistics-Manager',
    moduleIndex: 2, videoIndex: 2, expectedOldId: 'I_01SGaacRI',
    newUrl: 'https://www.youtube.com/watch?v=KDTt1gzkXyY',
    newTitle: 'Multimodal Transport: Optimizing Logistics with Seamless Connectivity',
    reason: 'Original channel was closed, taking the video with it',
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not set');

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB — ${apply ? 'APPLY mode' : 'DRY RUN (pass --apply to write)'}\n`);

  let applied = 0;
  let skipped = 0;

  for (const r of REPLACEMENTS) {
    const course = await Course.findOne({ slug: r.courseSlug });
    const slot = course?.modules?.[r.moduleIndex]?.videos?.[r.videoIndex];
    const label = `${r.courseSlug} · module ${r.moduleIndex} · video ${r.videoIndex}`;

    if (!slot) {
      console.log(`⏭  SKIP  ${label}\n        slot no longer exists\n`);
      skipped++;
      continue;
    }

    const currentId = extractYouTubeId(slot.url || '');
    if (currentId !== r.expectedOldId) {
      console.log(`⏭  SKIP  ${label}\n        expected ${r.expectedOldId} but found ${currentId ?? 'none'} — already changed\n`);
      skipped++;
      continue;
    }

    const verdict = await checkYouTubeVideo(extractYouTubeId(r.newUrl)!);
    if (!verdict.ok) {
      console.log(`⏭  SKIP  ${label}\n        replacement failed re-verification: ${verdict.detail}\n`);
      skipped++;
      continue;
    }

    console.log(`${apply ? '✅ APPLY' : '📝 WOULD'}  ${label}`);
    console.log(`        reason : ${r.reason}`);
    console.log(`        old    : ${slot.url}`);
    console.log(`               : "${slot.title}"`);
    console.log(`        new    : ${r.newUrl}`);
    console.log(`               : "${r.newTitle}"\n`);

    if (apply) {
      slot.url = r.newUrl;
      slot.title = r.newTitle;
      course!.markModified('modules');
      await course!.save();
      applied++;
    }
  }

  console.log('='.repeat(70));
  console.log(apply ? `Applied ${applied}, skipped ${skipped}.` : `${REPLACEMENTS.length - skipped} ready to apply, ${skipped} skipped. Re-run with --apply to write.`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error('Replacement failed:', err); process.exit(1); });
