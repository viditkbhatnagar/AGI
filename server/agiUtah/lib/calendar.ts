import type { SpineSlotSeed } from '../loader/catalogTypes';

/**
 * Pure calendar maths: turn the abstract spine order (program month 1..12 → core course)
 * plus an intake anchor (start year + month) into concrete calendar entries, each with a
 * Week-1-only enrollment window.
 *
 * Side-effect-free and unit-tested, so the scheduler that persists CourseOfferings can be
 * trivially correct. Dates are computed in UTC here; timezone-precise display (America/
 * Denver) is applied at the presentation/scheduling edge, not in this core maths.
 */

export interface CalendarEntry {
  monthIndex: number;
  coreCourseCode: string;
  calendarYear: number;
  calendarMonth: number;
  enrollmentOpensAt: Date;
  enrollmentClosesAt: Date;
}

/**
 * Week-1 enrollment window: enrollment closes this many days after the month opens.
 * Defaults to 7 (first week of the month, the standing policy). It can be widened via the
 * AGI_UTAH_ENROLLMENT_WINDOW_DAYS env var (e.g. during soft-launch/testing, when enrolment
 * must be reachable on any day) without changing the code default.
 */
const DEFAULT_ENROLLMENT_WINDOW_DAYS = 7;
export const ENROLLMENT_WINDOW_DAYS = (() => {
  const override = Number(process.env.AGI_UTAH_ENROLLMENT_WINDOW_DAYS);
  return Number.isFinite(override) && override > 0 ? override : DEFAULT_ENROLLMENT_WINDOW_DAYS;
})();

/** Adds `delta` months to a 1–12 month, rolling the year over as needed. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  const yearOffset = Math.floor(zeroBased / 12);
  const normalizedMonth = ((zeroBased % 12) + 12) % 12;
  return { year: year + yearOffset, month: normalizedMonth + 1 };
}

export function buildCalendar(
  intake: { startYear: number; startMonth: number },
  spine: readonly SpineSlotSeed[],
): CalendarEntry[] {
  return [...spine]
    .sort((a, b) => a.monthIndex - b.monthIndex)
    .map((slot) => {
      const { year, month } = addMonths(intake.startYear, intake.startMonth, slot.monthIndex - 1);
      const enrollmentOpensAt = new Date(Date.UTC(year, month - 1, 1));
      const enrollmentClosesAt = new Date(Date.UTC(year, month - 1, 1 + ENROLLMENT_WINDOW_DAYS));
      return {
        monthIndex: slot.monthIndex,
        coreCourseCode: slot.coreCourseCode,
        calendarYear: year,
        calendarMonth: month,
        enrollmentOpensAt,
        enrollmentClosesAt,
      };
    });
}
