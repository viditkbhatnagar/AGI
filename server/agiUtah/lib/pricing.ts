import type { CredentialTier } from '../types';

/**
 * Pricing rules (Logan 2026-07-03). Pure and unit-tested.
 *
 * The effective price is the list price minus an OPTIONAL promo — discounts are a switchable
 * promo, never hard-coded, so the default is always list price. The deposit is capped at a
 * fraction of the tuition (≤10%). The four 25% installments apply to Diploma and MBA only; the
 * Certificate is a carve-out billed on its own.
 */

export const DEFAULT_DEPOSIT_CAP_PCT = 0.1;

export interface PromoDiscount {
  /** Fractional discount 0..1 (e.g. 0.15 = 15% off). */
  percentOff?: number;
  /** Flat USD amount off. */
  amountOff?: number;
}

export interface PriceInput {
  listTuitionUsd: number;
  applicationFeeUsd: number;
  depositCapPct?: number;
  promo?: PromoDiscount;
}

export interface PriceBreakdown {
  listTuitionUsd: number;
  effectiveTuitionUsd: number;
  applicationFeeUsd: number;
  depositCapUsd: number;
}

export function computePrice(input: PriceInput): PriceBreakdown {
  const cap = input.depositCapPct ?? DEFAULT_DEPOSIT_CAP_PCT;

  let effective = input.listTuitionUsd;
  if (input.promo?.percentOff) effective -= effective * clamp01(input.promo.percentOff);
  if (input.promo?.amountOff) effective -= input.promo.amountOff;
  effective = Math.max(0, round2(effective));

  return {
    listTuitionUsd: input.listTuitionUsd,
    effectiveTuitionUsd: effective,
    applicationFeeUsd: input.applicationFeeUsd,
    depositCapUsd: round2(effective * cap),
  };
}

/** The four 25% installments apply to Diploma and MBA; the Certificate is billed on its own. */
export function installmentsApplyToTier(tier: CredentialTier): boolean {
  return tier !== 'certificate';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
