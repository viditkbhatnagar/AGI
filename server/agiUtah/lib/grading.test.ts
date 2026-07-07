import { describe, it, expect } from 'vitest';
import { computeGpaLatest, isPassingLetter, letterToGradePoint } from './grading';

describe('letterToGradePoint', () => {
  it('maps letters to points', () => {
    expect(letterToGradePoint('A')).toBe(4.0);
    expect(letterToGradePoint('B-')).toBe(2.7);
    expect(letterToGradePoint('F')).toBe(0.0);
  });

  it('returns null for non-GPA grades and undefined for unknown letters', () => {
    expect(letterToGradePoint('W')).toBeNull();
    expect(letterToGradePoint('TR')).toBeNull();
    expect(letterToGradePoint('ZZ')).toBeUndefined();
  });
});

describe('isPassingLetter', () => {
  it('passes at B- and above, fails below', () => {
    expect(isPassingLetter('B-')).toBe(true);
    expect(isPassingLetter('B')).toBe(true);
    expect(isPassingLetter('F')).toBe(false);
    expect(isPassingLetter('W')).toBe(false);
  });
});

describe('computeGpaLatest', () => {
  it('averages one grade per course', () => {
    expect(
      computeGpaLatest([
        { courseCode: 'CR01', attemptNo: 1, gradePoint: 4.0 },
        { courseCode: 'CR02', attemptNo: 1, gradePoint: 3.0 },
      ]),
    ).toBe(3.5);
  });

  it('uses the latest attempt on a retake', () => {
    // CR01 failed (0.0) then retaken to B (3.0); only the latest counts.
    expect(
      computeGpaLatest([
        { courseCode: 'CR01', attemptNo: 1, gradePoint: 0.0 },
        { courseCode: 'CR01', attemptNo: 2, gradePoint: 3.0 },
      ]),
    ).toBe(3.0);
  });

  it('excludes non-GPA grades (W/TR = null) and returns 0 when empty', () => {
    expect(
      computeGpaLatest([
        { courseCode: 'CR01', attemptNo: 1, gradePoint: 4.0 },
        { courseCode: 'CR02', attemptNo: 1, gradePoint: null },
      ]),
    ).toBe(4.0);
    expect(computeGpaLatest([])).toBe(0);
  });
});
