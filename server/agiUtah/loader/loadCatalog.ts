import { AgiUtahCourse } from '../models/course';
import { AgiUtahProgram } from '../models/program';
import { AgiUtahCourseProgramLink } from '../models/courseProgramLink';
import { AgiUtahCredentialDefinition } from '../models/credentialDefinition';
import { AgiUtahAcademicSpine } from '../models/academicSpine';
import { emitEvent } from '../services/emitEvent';
import { validateCatalog } from './validateCatalog';
import { AGI_UTAH_CATALOG } from '../catalog/agiUtahCatalog';
import type { CatalogSeed } from './catalogTypes';

/**
 * Loads a validated catalog into the isolated `agiutah_*` collections.
 *
 * SAFETY: writes only to `agiutah_*` collections; never touches existing data. It is a
 * deliberate, explicitly-invoked operation (seed script / admin action) — nothing calls
 * it at app boot. It is idempotent: re-running upserts by business key, so it is safe to
 * re-run whenever the course map changes.
 *
 * It refuses to load anything unless validateCatalog passes, so a malformed catalog fails
 * loudly and completely instead of partially applying.
 */

export interface LoadSummary {
  courses: number;
  programs: number;
  links: number;
  credentialDefinitions: number;
  spineSlots: number;
}

const SPINE_KEY = 'core-v2';
const SPINE_LABEL = 'AGI Utah — 12-month core spine (v2, Sep-intake order)';

export async function loadAgiUtahCatalog(catalog: CatalogSeed = AGI_UTAH_CATALOG): Promise<LoadSummary> {
  const validation = validateCatalog(catalog);
  if (!validation.ok) {
    throw new Error(`AGI Utah catalog is invalid; refusing to load:\n- ${validation.errors.join('\n- ')}`);
  }

  if (catalog.courses.length > 0) {
    await AgiUtahCourse.bulkWrite(
      catalog.courses.map((c) => ({
        updateOne: {
          filter: { code: c.code },
          update: {
            $set: {
              title: c.title,
              creditsSCH: c.creditsSCH,
              learningHours: c.learningHours,
              contactHours: c.contactHours,
              independentHours: c.independentHours,
              track: c.track,
              wave: c.wave,
              proctoredFinal: c.proctoredFinal ?? false,
              proctorPayer: c.proctorPayer ?? 'none',
              status: c.status ?? 'active',
            },
          },
          upsert: true,
        },
      })),
    );
  }

  if (catalog.programs.length > 0) {
    await AgiUtahProgram.bulkWrite(
      catalog.programs.map((p) => ({
        updateOne: {
          filter: { key: p.key },
          update: {
            $set: {
              tier: p.tier,
              specializationKey: p.specializationKey,
              title: p.title,
              awardName: p.awardName,
              wave: p.wave,
              intakeModel: p.intakeModel,
              fixedAnnualIntakeMonth: p.fixedAnnualIntakeMonth,
              listTuitionUsd: p.listTuitionUsd,
              applicationFeeUsd: p.applicationFeeUsd,
              depositCapPct: p.depositCapPct,
              standardMonths: p.standardMonths,
              maxMonths: p.maxMonths,
            },
          },
          upsert: true,
        },
      })),
    );
  }

  if (catalog.links.length > 0) {
    await AgiUtahCourseProgramLink.bulkWrite(
      catalog.links.map((l) => ({
        updateOne: {
          filter: { courseCode: l.courseCode, programKey: l.programKey },
          update: {
            $set: {
              role: l.role,
              sequenceIndex: l.sequenceIndex,
              isGateway: l.isGateway ?? false,
              required: l.required ?? true,
            },
          },
          upsert: true,
        },
      })),
    );
  }

  if (catalog.credentialDefinitions.length > 0) {
    await AgiUtahCredentialDefinition.bulkWrite(
      catalog.credentialDefinitions.map((d) => ({
        updateOne: {
          filter: { programKey: d.programKey },
          update: {
            $set: {
              tier: d.tier,
              specializationKey: d.specializationKey,
              memberCourseCodes: d.memberCourseCodes,
              awardName: d.awardName,
            },
          },
          upsert: true,
        },
      })),
    );
  }

  await AgiUtahAcademicSpine.updateOne(
    { key: SPINE_KEY },
    { $set: { label: SPINE_LABEL, slots: catalog.spine } },
    { upsert: true },
  );

  const summary: LoadSummary = {
    courses: catalog.courses.length,
    programs: catalog.programs.length,
    links: catalog.links.length,
    credentialDefinitions: catalog.credentialDefinitions.length,
    spineSlots: catalog.spine.length,
  };

  await emitEvent({
    eventType: 'catalog.applied',
    subjects: [{ kind: 'catalog', ref: SPINE_KEY }],
    payload: { ...summary },
  });

  return summary;
}
