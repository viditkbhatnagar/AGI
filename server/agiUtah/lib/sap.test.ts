import { describe, it, expect } from 'vitest';
import { evaluateSap } from './sap';

const meeting = { gpa: 3.5, attemptedCredits: 12, completedCredits: 12, timeframePct: 100 };

describe('evaluateSap', () => {
  it('is good when GPA, pace and timeframe are all healthy', () => {
    const r = evaluateSap(meeting);
    expect(r.state).toBe('good');
    expect(r.gpaOk).toBe(true);
    expect(r.paceOk).toBe(true);
    expect(r.pace).toBe(1);
    expect(r.reasons).toEqual([]);
  });

  it('warns on a GPA below 3.0', () => {
    expect(evaluateSap({ ...meeting, gpa: 2.9 }).state).toBe('warning');
  });

  it('warns on pace below 67%', () => {
    const r = evaluateSap({ ...meeting, attemptedCredits: 12, completedCredits: 6 });
    expect(r.paceOk).toBe(false);
    expect(r.state).toBe('warning');
  });

  it('escalates to probation when both GPA and pace fail', () => {
    expect(evaluateSap({ gpa: 2.0, attemptedCredits: 12, completedCredits: 3, timeframePct: 100 }).state).toBe('probation');
  });

  it('follows the timeframe ladder: 125 warn, 140 probation, 150 dismissed', () => {
    expect(evaluateSap({ ...meeting, timeframePct: 130 }).state).toBe('warning');
    expect(evaluateSap({ ...meeting, timeframePct: 142 }).state).toBe('probation');
    expect(evaluateSap({ ...meeting, timeframePct: 150 }).state).toBe('dismissed');
  });
});
