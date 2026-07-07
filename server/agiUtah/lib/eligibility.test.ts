import { describe, it, expect } from 'vitest';
import { evaluateEnrollmentEligibility, type EligibilityInput } from './eligibility';

const base: EligibilityInput = {
  now: new Date(Date.UTC(2027, 0, 3)), // within the window below
  enrollmentOpensAt: new Date(Date.UTC(2027, 0, 1)),
  enrollmentClosesAt: new Date(Date.UTC(2027, 0, 8)),
  courseCode: 'FT01',
  programMemberCourseCodes: ['CR02', 'FT01', 'FT02', 'FT04', 'FT06'],
  isSpecializationCourse: true,
  gatewayCourseCode: 'CR02',
  passedCourseCodes: ['CR02'],
};

describe('evaluateEnrollmentEligibility', () => {
  it('allows a valid enrollment (window open, gateway met, in program)', () => {
    const result = evaluateEnrollmentEligibility(base);
    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('blocks mid-course starts (window closed)', () => {
    const result = evaluateEnrollmentEligibility({ ...base, now: new Date(Date.UTC(2027, 0, 20)) });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('Week-1'))).toBe(true);
  });

  it('blocks a specialization course when the gateway is not passed', () => {
    const result = evaluateEnrollmentEligibility({ ...base, passedCourseCodes: [] });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('Gateway course CR02'))).toBe(true);
  });

  it('blocks a course that is not part of the program', () => {
    const result = evaluateEnrollmentEligibility({ ...base, courseCode: 'SC01' });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('not part of the selected program'))).toBe(true);
  });

  it('blocks on dismissal, financial hold, or duplicate enrollment', () => {
    expect(evaluateEnrollmentEligibility({ ...base, sapDismissed: true }).allowed).toBe(false);
    expect(evaluateEnrollmentEligibility({ ...base, financialHold: true }).allowed).toBe(false);
    expect(evaluateEnrollmentEligibility({ ...base, alreadyEnrolledOrPassed: true }).allowed).toBe(false);
  });

  it('allows a core (non-specialization) course with no gateway', () => {
    const result = evaluateEnrollmentEligibility({
      ...base,
      courseCode: 'CR02',
      isSpecializationCourse: false,
      gatewayCourseCode: undefined,
      passedCourseCodes: [],
    });
    expect(result.allowed).toBe(true);
  });
});
