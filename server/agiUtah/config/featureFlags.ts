/**
 * Feature flags for the AGI Utah module.
 *
 * Everything is OFF unless the corresponding environment variable is set to the
 * string 'true'. `AGI_UTAH_ENABLED` is the master switch: no AGI Utah feature is ever
 * active unless it is on. This guarantees the module stays invisible to current
 * students until it is deliberately enabled.
 */

export const AGI_UTAH_FLAGS = {
  /** Master switch for the entire AGI Utah subsystem. */
  MASTER: 'AGI_UTAH_ENABLED',
  /** Wave 1 specializations: FinTech, Finance, Supply Chain & Operations. */
  WAVE_1: 'AGI_UTAH_WAVE_1',
  /** Wave 2 specializations: ESG, Digital Transformation. */
  WAVE_2: 'AGI_UTAH_WAVE_2',
  /** Wave 3 specializations: HR & People, Marketing. */
  WAVE_3: 'AGI_UTAH_WAVE_3',
} as const;

export type AgiUtahFlagKey = (typeof AGI_UTAH_FLAGS)[keyof typeof AGI_UTAH_FLAGS];

/** True only if the given environment flag is explicitly set to the string 'true'. */
export function isFlagEnabled(flag: string): boolean {
  return process.env[flag] === 'true';
}

/** True only if the AGI Utah master switch is on. Off by default. */
export function isAgiUtahEnabled(): boolean {
  return isFlagEnabled(AGI_UTAH_FLAGS.MASTER);
}

/**
 * True only if BOTH the master switch and the specific feature flag are on.
 *
 * Use this at every AGI Utah entry point (routes, jobs, UI gates) so the whole
 * subsystem stays behind the master switch and can be turned off instantly.
 */
export function isAgiUtahFeatureEnabled(flag: AgiUtahFlagKey): boolean {
  return isAgiUtahEnabled() && isFlagEnabled(flag);
}
