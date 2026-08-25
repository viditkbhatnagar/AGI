/**
 * Manual course video link scan.
 *
 *   npm run check:videos          scan and print a report
 *   npm run check:videos -- --quiet   suppress the healthy-course lines
 *
 * The same scan runs nightly in-process via startVideoLinkChecker(); this
 * script is for running it on demand and reading the result in a terminal.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { runVideoLinkCheck } from '../server/services/videoLinkChecker';
import type { IVideoLinkIssue } from '../server/models/videoLinkReport';

const LABEL: Record<IVideoLinkIssue['status'], string> = {
  embed_disabled: 'EMBEDDING DISABLED  (plays on YouTube, blocked in the LMS)',
  deleted: 'DELETED             (removed from YouTube)',
  private: 'PRIVATE             (owner restricted access)',
  unplayable: 'UNPLAYABLE          (YouTube refuses playback)',
  unreachable: 'UNREACHABLE         (check failed — may be a transient network error)',
  not_youtube: 'BAD URL             (missing or unrecognised link)',
};

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  const result = await runVideoLinkCheck({ notify: false });

  console.log('\n' + '='.repeat(78));
  console.log(`Scanned ${result.uniqueVideos} unique videos across ${result.totalVideoSlots} slots ` +
              `in ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log(`Broken: ${result.brokenSlots}   New since last scan: ${result.newlyBroken.length}`);
  console.log('='.repeat(78));

  if (result.issues.length === 0) {
    console.log('\n✅ Every course video is playable and embeddable.\n');
  } else {
    const byCourse = new Map<string, IVideoLinkIssue[]>();
    for (const issue of result.issues) {
      const key = issue.courseTitle || issue.courseSlug;
      byCourse.set(key, [...(byCourse.get(key) || []), issue]);
    }
    for (const [course, issues] of byCourse) {
      console.log(`\n${course}`);
      for (const issue of issues) {
        const isNew = result.newlyBroken.some(
          (n) => n.courseSlug === issue.courseSlug &&
                 n.moduleIndex === issue.moduleIndex &&
                 n.videoIndex === issue.videoIndex);
        console.log(`  ${isNew ? '🆕' : '  '} ${issue.moduleTitle} (module ${issue.moduleIndex}) · video ${issue.videoIndex}`);
        console.log(`     ${LABEL[issue.status]}`);
        console.log(`     "${issue.videoTitle}"`);
        console.log(`     ${issue.url}`);
      }
    }
    console.log('');
  }

  await mongoose.disconnect();
  process.exit(result.brokenSlots > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Scan failed:', err);
  process.exit(2);
});
