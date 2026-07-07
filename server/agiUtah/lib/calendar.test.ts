import { describe, it, expect } from 'vitest';
import { addMonths, buildCalendar, ENROLLMENT_WINDOW_DAYS } from './calendar';
import { AGI_UTAH_CATALOG } from '../catalog/agiUtahCatalog';

describe('addMonths', () => {
  it('adds within the same year', () => {
    expect(addMonths(2026, 9, 3)).toEqual({ year: 2026, month: 12 }); // Sep + 3 = Dec
  });

  it('rolls over the year', () => {
    expect(addMonths(2026, 9, 4)).toEqual({ year: 2027, month: 1 }); // Sep + 4 = Jan 2027
    expect(addMonths(2026, 9, 11)).toEqual({ year: 2027, month: 8 }); // Sep + 11 = Aug 2027
  });
});

describe('buildCalendar (Sep 2026 intake, confirmed spine)', () => {
  const calendar = buildCalendar({ startYear: 2026, startMonth: 9 }, AGI_UTAH_CATALOG.spine);

  it('produces 12 months in order', () => {
    expect(calendar).toHaveLength(12);
    expect(calendar.map((c) => c.monthIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('places the confirmed courses in the right months', () => {
    const byMonth = new Map(calendar.map((c) => [c.monthIndex, c]));
    expect(byMonth.get(1)).toMatchObject({ coreCourseCode: 'CR05', calendarYear: 2026, calendarMonth: 9 });
    expect(byMonth.get(4)).toMatchObject({ coreCourseCode: 'CR01', calendarYear: 2026, calendarMonth: 12 });
    expect(byMonth.get(5)).toMatchObject({ coreCourseCode: 'CR02', calendarYear: 2027, calendarMonth: 1 });
    expect(byMonth.get(12)).toMatchObject({ coreCourseCode: 'CR12', calendarYear: 2027, calendarMonth: 8 });
  });

  it('opens a Week-1-only enrollment window', () => {
    const m5 = calendar.find((c) => c.monthIndex === 5)!;
    expect(m5.enrollmentOpensAt.getTime()).toBe(Date.UTC(2027, 0, 1));
    expect(m5.enrollmentClosesAt.getTime()).toBe(Date.UTC(2027, 0, 1 + ENROLLMENT_WINDOW_DAYS));
  });
});
