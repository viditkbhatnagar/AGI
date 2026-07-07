import { loadAgiUtahCatalog, type LoadSummary } from '../loader/loadCatalog';
import { AgiUtahIntake } from '../models/intake';
import { expandIntake } from './schedulerService';

/**
 * One call that brings AGI Utah's data online: load the catalog, create the intake, and expand
 * it into course offerings. Idempotent, writes only to `agiutah_*`. Exposed both as an admin
 * endpoint (so it can be run from the UI on Render, no shell needed) and via the seed script.
 */

export interface BootstrapInput {
  intakeKey?: string;
  spineKey?: string;
  label?: string;
  startYear?: number;
  startMonth?: number;
}

export interface BootstrapResult {
  catalog: LoadSummary;
  intakeKey: string;
  offerings: number;
}

export async function bootstrapAgiUtah(input: BootstrapInput = {}): Promise<BootstrapResult> {
  const intakeKey = input.intakeKey ?? 'sep-2026';

  const catalog = await loadAgiUtahCatalog();

  await AgiUtahIntake.updateOne(
    { key: intakeKey },
    {
      $set: {
        spineKey: input.spineKey ?? 'core-v2',
        label: input.label ?? 'September 2026 intake',
        startYear: input.startYear ?? 2026,
        startMonth: input.startMonth ?? 9,
        active: true,
      },
    },
    { upsert: true },
  );

  const expanded = await expandIntake(intakeKey);
  return { catalog, intakeKey, offerings: expanded.offerings };
}
