/**
 * Engagement / attendance inactivity rule. Pure and unit-tested.
 *
 * Login alone is not attendance — this measures days since the last academically-related
 * activity. A warning fires at 14 consecutive inactive days; automatic administrative
 * withdrawal at 21, with the withdrawal date backdated to the last activity.
 */

export const INACTIVITY_WARN_DAYS = 14;
export const INACTIVITY_WITHDRAW_DAYS = 21;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type InactivityAction = 'none' | 'warn' | 'withdraw';

export interface InactivityStatus {
  daysInactive: number;
  action: InactivityAction;
}

export function evaluateInactivity(lastActivityAt: Date, now: Date): InactivityStatus {
  const daysInactive = Math.floor((now.getTime() - lastActivityAt.getTime()) / MS_PER_DAY);

  let action: InactivityAction = 'none';
  if (daysInactive >= INACTIVITY_WITHDRAW_DAYS) action = 'withdraw';
  else if (daysInactive >= INACTIVITY_WARN_DAYS) action = 'warn';

  return { daysInactive, action };
}
