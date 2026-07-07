import type { CatalogSeed } from './catalogTypes';
import { validateStrictNesting, type CredentialSet } from '../lib/strictNesting';

/**
 * Pure, side-effect-free validation of a CatalogSeed.
 *
 * The loader runs this first and refuses to load anything if it fails, so a bad course
 * map fails loudly instead of silently mis-composing credentials. It checks STRUCTURE
 * (referential integrity, 12-course core, credential composition, strict nesting, spine
 * completeness) — never magnitudes like "36" or "48", which are data.
 */

export interface CatalogValidationResult {
  ok: boolean;
  errors: string[];
}

const EXPECTED_CORE_COUNT = 12;

export function validateCatalog(catalog: CatalogSeed): CatalogValidationResult {
  const errors: string[] = [];

  const courseByCode = new Map(catalog.courses.map((c) => [c.code, c]));
  const programByKey = new Map(catalog.programs.map((p) => [p.key, p]));

  // 1. No duplicate course codes / program keys.
  if (courseByCode.size !== catalog.courses.length) {
    errors.push('Duplicate course codes detected.');
  }
  if (programByKey.size !== catalog.programs.length) {
    errors.push('Duplicate program keys detected.');
  }

  // 2. Referential integrity of links.
  for (const link of catalog.links) {
    if (!courseByCode.has(link.courseCode)) {
      errors.push(`Link references unknown course "${link.courseCode}".`);
    }
    if (!programByKey.has(link.programKey)) {
      errors.push(`Link references unknown program "${link.programKey}".`);
    }
  }

  // 3. Exactly one credential definition per program, referencing known courses.
  const defByProgram = new Map(catalog.credentialDefinitions.map((d) => [d.programKey, d]));
  if (defByProgram.size !== catalog.credentialDefinitions.length) {
    errors.push('Duplicate credential definitions detected (more than one per program).');
  }
  for (const program of catalog.programs) {
    if (!defByProgram.has(program.key)) {
      errors.push(`Program "${program.key}" has no credential definition.`);
    }
  }
  for (const def of catalog.credentialDefinitions) {
    if (!programByKey.has(def.programKey)) {
      errors.push(`Credential definition references unknown program "${def.programKey}".`);
    }
    for (const code of def.memberCourseCodes) {
      if (!courseByCode.has(code)) {
        errors.push(`Credential "${def.programKey}" references unknown course "${code}".`);
      }
    }
  }

  // 4. Structural checks on the course pool.
  const coreCodes = catalog.courses.filter((c) => c.track === 'core').map((c) => c.code);
  const coreSet = new Set(coreCodes);
  if (coreCodes.length !== EXPECTED_CORE_COUNT) {
    errors.push(`Expected ${EXPECTED_CORE_COUNT} core courses, found ${coreCodes.length}.`);
  }

  const specCodesByKey = new Map<string, string[]>();
  for (const course of catalog.courses) {
    if (course.track === 'core') continue;
    const group = specCodesByKey.get(course.track) ?? [];
    specCodesByKey.set(course.track, [...group, course.code]);
  }

  // 5. Credential composition per tier (structural, not magnitude).
  for (const def of catalog.credentialDefinitions) {
    const members = def.memberCourseCodes;
    const specCodes = def.specializationKey ? specCodesByKey.get(def.specializationKey) ?? [] : [];

    if (def.tier === 'certificate') {
      if (members.length !== 1) {
        errors.push(`Certificate "${def.programKey}" must contain exactly 1 course, found ${members.length}.`);
      }
    } else if (def.tier === 'diploma') {
      const coreMembers = members.filter((code) => coreSet.has(code));
      if (coreMembers.length !== 1) {
        errors.push(`Diploma "${def.programKey}" must contain exactly 1 core (gateway) course, found ${coreMembers.length}.`);
      }
      if (!isSuperset(members, specCodes)) {
        errors.push(`Diploma "${def.programKey}" must contain all of its specialization's courses.`);
      }
    } else if (def.tier === 'mba') {
      if (!isSuperset(members, coreCodes)) {
        errors.push(`MBA "${def.programKey}" must contain all ${EXPECTED_CORE_COUNT} core courses.`);
      }
      if (!isSuperset(members, specCodes)) {
        errors.push(`MBA "${def.programKey}" must contain all of its specialization's courses.`);
      }
    }
  }

  // 6. Strict nesting Certificate ⊂ Diploma ⊂ MBA.
  const credentialSets: CredentialSet[] = catalog.credentialDefinitions.map((d) => ({
    programKey: d.programKey,
    tier: d.tier,
    specializationKey: d.specializationKey,
    memberCourseCodes: d.memberCourseCodes,
  }));
  const nesting = validateStrictNesting(credentialSets);
  for (const violation of nesting.violations) {
    errors.push(`${violation.message} (missing: ${violation.missingCourseCodes.join(', ') || 'n/a'}).`);
  }

  // 7. Gateway: each diploma must have a matching isGateway link for its one core member.
  for (const def of catalog.credentialDefinitions) {
    if (def.tier !== 'diploma') continue;
    const gatewayLink = catalog.links.find((l) => l.programKey === def.programKey && l.isGateway);
    if (!gatewayLink) {
      errors.push(`Diploma "${def.programKey}" has no gateway link (isGateway).`);
    } else if (!def.memberCourseCodes.includes(gatewayLink.courseCode)) {
      errors.push(`Diploma "${def.programKey}" gateway "${gatewayLink.courseCode}" is not one of its member courses.`);
    }
  }

  // 8. Spine completeness: 12 unique months, each a core course, covering all core once.
  validateSpine(catalog, coreSet, errors);

  return { ok: errors.length === 0, errors };
}

function isSuperset(superset: readonly string[], subset: readonly string[]): boolean {
  const set = new Set(superset);
  return subset.every((code) => set.has(code));
}

function validateSpine(catalog: CatalogSeed, coreSet: Set<string>, errors: string[]): void {
  const months = new Set(catalog.spine.map((s) => s.monthIndex));
  if (months.size !== catalog.spine.length) {
    errors.push('Spine has duplicate month indexes.');
  }
  if (catalog.spine.length !== EXPECTED_CORE_COUNT) {
    errors.push(`Spine must have ${EXPECTED_CORE_COUNT} months, found ${catalog.spine.length}.`);
  }
  const covered = new Set<string>();
  for (const slot of catalog.spine) {
    if (slot.monthIndex < 1 || slot.monthIndex > EXPECTED_CORE_COUNT) {
      errors.push(`Spine month ${slot.monthIndex} is out of range 1–${EXPECTED_CORE_COUNT}.`);
    }
    if (!coreSet.has(slot.coreCourseCode)) {
      errors.push(`Spine month ${slot.monthIndex} references non-core course "${slot.coreCourseCode}".`);
    }
    covered.add(slot.coreCourseCode);
  }
  if (covered.size !== coreSet.size) {
    errors.push('Spine does not cover every core course exactly once.');
  }
}
