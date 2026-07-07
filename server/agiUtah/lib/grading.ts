/**
 * Grading rules (AGI 4.0 scale). Pure and unit-tested.
 *
 * B- (2.7) is the minimum pass. When a course is retaken, both attempts stay on the
 * transcript but GPA uses the LATEST attempt (Logan's confirmed rule). W (withdrawal) and
 * TR (transfer) carry no grade point and are excluded from GPA.
 */

export interface GradeScaleEntry {
  letter: string;
  /** null = not counted in GPA (e.g. W, TR). */
  gradePoint: number | null;
}

export const AGI_UTAH_GRADE_SCALE: GradeScaleEntry[] = [
  { letter: 'A', gradePoint: 4.0 },
  { letter: 'A-', gradePoint: 3.7 },
  { letter: 'B+', gradePoint: 3.3 },
  { letter: 'B', gradePoint: 3.0 },
  { letter: 'B-', gradePoint: 2.7 },
  { letter: 'F', gradePoint: 0.0 },
  { letter: 'W', gradePoint: null },
  { letter: 'TR', gradePoint: null },
];

export const MIN_PASS_GRADE_POINT = 2.7;

const SCALE_BY_LETTER = new Map(AGI_UTAH_GRADE_SCALE.map((e) => [e.letter, e.gradePoint]));

/** Grade point for a letter, or `undefined` if the letter is not on the scale. */
export function letterToGradePoint(letter: string): number | null | undefined {
  return SCALE_BY_LETTER.has(letter) ? SCALE_BY_LETTER.get(letter) : undefined;
}

export function isPassingGradePoint(gradePoint: number): boolean {
  return gradePoint >= MIN_PASS_GRADE_POINT;
}

export function isPassingLetter(letter: string): boolean {
  const gp = letterToGradePoint(letter);
  return typeof gp === 'number' && isPassingGradePoint(gp);
}

export interface AttemptGrade {
  courseCode: string;
  attemptNo: number;
  /** null = non-GPA grade (W/TR); undefined/absent = not yet graded. */
  gradePoint?: number | null;
}

/**
 * Cumulative GPA using the latest attempt of each course. Non-GPA grades (W/TR = null) and
 * ungraded attempts are excluded. Returns 0 when there is nothing GPA-bearing yet.
 */
export function computeGpaLatest(attempts: readonly AttemptGrade[]): number {
  const latestByCourse = new Map<string, AttemptGrade>();
  for (const attempt of attempts) {
    const current = latestByCourse.get(attempt.courseCode);
    if (!current || attempt.attemptNo > current.attemptNo) {
      latestByCourse.set(attempt.courseCode, attempt);
    }
  }

  const gpaBearing = [...latestByCourse.values()]
    .map((a) => a.gradePoint)
    .filter((gp): gp is number => typeof gp === 'number');

  if (gpaBearing.length === 0) return 0;

  const total = gpaBearing.reduce((sum, gp) => sum + gp, 0);
  return Math.round((total / gpaBearing.length) * 100) / 100;
}
