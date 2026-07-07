import { describe, it, expect } from 'vitest';
import { validateCatalog } from './validateCatalog';
import { AGI_UTAH_CATALOG } from '../catalog/agiUtahCatalog';
import type { CatalogSeed } from './catalogTypes';

function clone(): CatalogSeed {
  return JSON.parse(JSON.stringify(AGI_UTAH_CATALOG)) as CatalogSeed;
}

describe('validateCatalog — the authored Wave-0/1 catalog', () => {
  it('is valid (12 core, nested credentials, complete spine)', () => {
    const result = validateCatalog(AGI_UTAH_CATALOG);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('has exactly 12 core courses and a full 12-month spine', () => {
    const core = AGI_UTAH_CATALOG.courses.filter((c) => c.track === 'core');
    expect(core).toHaveLength(12);
    expect(AGI_UTAH_CATALOG.spine).toHaveLength(12);
  });

  it('composes the MBA as 16 courses and the diploma as 5', () => {
    const mba = AGI_UTAH_CATALOG.credentialDefinitions.find((d) => d.programKey === 'mba-fintech');
    const diploma = AGI_UTAH_CATALOG.credentialDefinitions.find((d) => d.programKey === 'diploma-fintech');
    const cert = AGI_UTAH_CATALOG.credentialDefinitions.find((d) => d.programKey === 'cert-fintech');
    expect(mba?.memberCourseCodes).toHaveLength(16);
    expect(diploma?.memberCourseCodes).toHaveLength(5);
    expect(cert?.memberCourseCodes).toHaveLength(1);
  });
});

describe('validateCatalog — catches broken catalogs', () => {
  it('rejects a missing core course', () => {
    const broken = clone();
    broken.courses = broken.courses.filter((c) => c.code !== 'CR12');
    const result = validateCatalog(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('core courses'))).toBe(true);
  });

  it('rejects a diploma that loses its gateway link', () => {
    const broken = clone();
    broken.links = broken.links.map((l) =>
      l.programKey === 'diploma-fintech' && l.isGateway ? { ...l, isGateway: false } : l,
    );
    const result = validateCatalog(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('gateway'))).toBe(true);
  });

  it('rejects a broken nesting (certificate course removed from diploma)', () => {
    const broken = clone();
    const dip = broken.credentialDefinitions.find((d) => d.programKey === 'diploma-fintech');
    if (dip) dip.memberCourseCodes = dip.memberCourseCodes.filter((c) => c !== 'FT01');
    const result = validateCatalog(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('subset'))).toBe(true);
  });

  it('rejects a link referencing an unknown course', () => {
    const broken = clone();
    broken.links.push({ courseCode: 'NOPE', programKey: 'mba-fintech', role: 'core' });
    const result = validateCatalog(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown course'))).toBe(true);
  });
});
