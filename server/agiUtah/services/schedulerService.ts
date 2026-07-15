import { AgiUtahIntake } from '../models/intake';
import { AgiUtahAcademicSpine } from '../models/academicSpine';
import { AgiUtahCourseOffering } from '../models/courseOffering';
import { AgiUtahCourse } from '../models/course';
import { buildCalendar } from '../lib/calendar';
import { emitEvent } from './emitEvent';

/**
 * Expands an intake into concrete monthly course offerings (with Week-1 enrollment windows).
 *
 * The 12-course core spine runs in months 1..N from the academic spine. Specialization courses
 * (every active non-core course) are then scheduled in the months that follow the core spine —
 * each track's courses in code order (entry → capstone) — so a Diploma or MBA that requires a
 * specialization can actually be enrolled and earned through the live flow. The exact spec-month
 * schedule is a deterministic default and can be refined against the official academic calendar;
 * the window mechanics are identical to the core spine.
 *
 * Idempotent: upserts by (intakeKey, courseCode). Writes only to `agiutah_*` collections.
 */
export async function expandIntake(
  intakeKey: string,
): Promise<{ offerings: number; core: number; specialization: number }> {
  const intake = await AgiUtahIntake.findOne({ key: intakeKey }).lean();
  if (!intake) throw new Error(`Intake "${intakeKey}" not found.`);

  const spine = await AgiUtahAcademicSpine.findOne({ key: intake.spineKey }).lean();
  if (!spine) throw new Error(`Spine "${intake.spineKey}" not found.`);

  const anchor = { startYear: intake.startYear, startMonth: intake.startMonth };

  // Core spine: months 1..N.
  const coreCalendar = buildCalendar(anchor, spine.slots);
  const coreMonths = coreCalendar.length;

  // Specialization courses: every active non-core course, grouped by track and scheduled in the
  // months after the core spine, each track's courses in code order (e.g. FT01 → FT02 → FT04 → FT06).
  const specCourses = await AgiUtahCourse.find({ track: { $ne: 'core' }, status: 'active' })
    .select('code track')
    .lean();

  const codesByTrack = new Map<string, string[]>();
  for (const course of specCourses) {
    const codes = codesByTrack.get(course.track) ?? [];
    codes.push(course.code);
    codesByTrack.set(course.track, codes);
  }

  const specSlots = Array.from(codesByTrack.values()).flatMap((codes) =>
    [...codes]
      .sort()
      .map((code, position) => ({ monthIndex: coreMonths + position + 1, coreCourseCode: code })),
  );
  const specCalendar = specSlots.length ? buildCalendar(anchor, specSlots) : [];

  const entries = [...coreCalendar, ...specCalendar];

  await AgiUtahCourseOffering.bulkWrite(
    entries.map((entry) => ({
      updateOne: {
        filter: { intakeKey, courseCode: entry.coreCourseCode },
        update: {
          $set: {
            monthIndex: entry.monthIndex,
            calendarYear: entry.calendarYear,
            calendarMonth: entry.calendarMonth,
            enrollmentOpensAt: entry.enrollmentOpensAt,
            enrollmentClosesAt: entry.enrollmentClosesAt,
            status: 'scheduled',
          },
        },
        upsert: true,
      },
    })),
  );

  await emitEvent({
    eventType: 'intake.expanded',
    subjects: [{ kind: 'intake', ref: intakeKey }],
    payload: { offerings: entries.length, core: coreCalendar.length, specialization: specCalendar.length },
  });

  return { offerings: entries.length, core: coreCalendar.length, specialization: specCalendar.length };
}
