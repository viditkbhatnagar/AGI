import { AgiUtahIntake } from '../models/intake';
import { AgiUtahAcademicSpine } from '../models/academicSpine';
import { AgiUtahCourseOffering } from '../models/courseOffering';
import { buildCalendar } from '../lib/calendar';
import { emitEvent } from './emitEvent';

/**
 * Expands an intake into concrete monthly course offerings (with Week-1 enrollment windows)
 * for the 12-course core spine. Idempotent: upserts by (intakeKey, courseCode). Writes only
 * to `agiutah_*` collections. Specialization offerings are scheduled from their gateway month
 * as a later extension of the same shape.
 */
export async function expandIntake(intakeKey: string): Promise<{ offerings: number }> {
  const intake = await AgiUtahIntake.findOne({ key: intakeKey }).lean();
  if (!intake) throw new Error(`Intake "${intakeKey}" not found.`);

  const spine = await AgiUtahAcademicSpine.findOne({ key: intake.spineKey }).lean();
  if (!spine) throw new Error(`Spine "${intake.spineKey}" not found.`);

  const calendar = buildCalendar({ startYear: intake.startYear, startMonth: intake.startMonth }, spine.slots);

  await AgiUtahCourseOffering.bulkWrite(
    calendar.map((entry) => ({
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
    payload: { offerings: calendar.length },
  });

  return { offerings: calendar.length };
}
