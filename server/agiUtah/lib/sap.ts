/**
 * Satisfactory Academic Progress (SAP) evaluation. Pure and unit-tested.
 *
 * A student must meet all three: cumulative GPA ≥ 3.0, pace ≥ 67% (completed ÷ attempted),
 * and elapsed time ≤ 150% of the standard program length. Timeframe thresholds drive the
 * state ladder; a GPA or pace failure escalates it. (The exact GPA/pace ↔ timeframe interplay
 * was flagged to Logan; this is the documented interpretation and is easy to tune.)
 */

export type SapState = 'good' | 'warning' | 'probation' | 'dismissed';

export const SAP_MIN_GPA = 3.0;
export const SAP_MIN_PACE = 0.67;
export const SAP_WARNING_TIMEFRAME_PCT = 125;
export const SAP_PROBATION_TIMEFRAME_PCT = 140;
export const SAP_DISMISSAL_TIMEFRAME_PCT = 150;

export interface SapInput {
  gpa: number;
  attemptedCredits: number;
  completedCredits: number;
  /** Elapsed time as a percent of the standard program length (e.g. 130 = 130%). */
  timeframePct: number;
}

export interface SapResult {
  state: SapState;
  gpaOk: boolean;
  paceOk: boolean;
  pace: number;
  reasons: string[];
}

export function evaluateSap(input: SapInput): SapResult {
  const pace = input.attemptedCredits > 0 ? input.completedCredits / input.attemptedCredits : 1;
  const gpaOk = input.gpa >= SAP_MIN_GPA;
  const paceOk = pace >= SAP_MIN_PACE;

  const reasons: string[] = [];
  if (!gpaOk) reasons.push(`GPA ${input.gpa.toFixed(2)} is below the ${SAP_MIN_GPA.toFixed(1)} minimum.`);
  if (!paceOk) reasons.push(`Pace ${(pace * 100).toFixed(0)}% is below the ${SAP_MIN_PACE * 100}% minimum.`);
  if (input.timeframePct >= SAP_DISMISSAL_TIMEFRAME_PCT) {
    reasons.push(`Elapsed time ${input.timeframePct}% has reached the ${SAP_DISMISSAL_TIMEFRAME_PCT}% maximum.`);
  }

  const state = deriveState(input.timeframePct, gpaOk, paceOk);
  return { state, gpaOk, paceOk, pace, reasons };
}

function deriveState(timeframePct: number, gpaOk: boolean, paceOk: boolean): SapState {
  if (timeframePct >= SAP_DISMISSAL_TIMEFRAME_PCT) return 'dismissed';
  const bothFailing = !gpaOk && !paceOk;
  if (timeframePct >= SAP_PROBATION_TIMEFRAME_PCT || bothFailing) return 'probation';
  if (timeframePct >= SAP_WARNING_TIMEFRAME_PCT || !gpaOk || !paceOk) return 'warning';
  return 'good';
}
