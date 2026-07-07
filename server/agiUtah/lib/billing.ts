/**
 * Progress-based quarterly billing. Pure and unit-tested.
 *
 * Tuition is billed in four equal 25% increments that unlock by measured PROGRESS, not by
 * the calendar: quarter N becomes due once the student passes the (N-1)×25% progress mark.
 * (The precise definition of "progress" — courses vs contact hours — was flagged to Logan;
 * this takes a 0..1 progress fraction so any definition maps in.)
 */

export const QUARTER_FRACTION = 0.25;
export const QUARTER_COUNT = 4;

/**
 * Progress fraction from CREDIT HOURS — the installment metric Logan specified (read off the
 * course map), not courses-completed. Feed the result into computeBillingSchedule. Note: the
 * Certificate is billed on its own and does not use these installments (see pricing.ts).
 */
export function progressByCredits(completedCredits: number, totalCredits: number): number {
  if (totalCredits <= 0) return 0;
  return Math.max(0, Math.min(1, completedCredits / totalCredits));
}

export interface BillingInput {
  totalTuition: number;
  /** Program progress, 0..1. */
  progressFraction: number;
}

export interface BillingSchedule {
  quarterAmount: number;
  quartersDue: number;
  amountDue: number;
  amountRemaining: number;
}

export function computeBillingSchedule(input: BillingInput): BillingSchedule {
  const pct = Math.max(0, Math.min(1, input.progressFraction));
  const quarterAmount = round2(input.totalTuition * QUARTER_FRACTION);

  // Quarter N (1..4) is due once progress ≥ (N-1)×25%. At progress 0, Q1 is already due.
  let quartersDue = 0;
  for (let n = 1; n <= QUARTER_COUNT; n += 1) {
    if (pct >= (n - 1) * QUARTER_FRACTION) quartersDue += 1;
  }

  const amountDue = round2(quarterAmount * quartersDue);
  return {
    quarterAmount,
    quartersDue,
    amountDue,
    amountRemaining: round2(input.totalTuition - amountDue),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
