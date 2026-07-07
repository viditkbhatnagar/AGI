import { describe, it, expect } from 'vitest';
import { isSubset, validateStrictNesting, type CredentialSet } from './strictNesting';

describe('isSubset', () => {
  it('is true when every element is present in the superset', () => {
    expect(isSubset(['a', 'b'], ['a', 'b', 'c'])).toBe(true);
  });

  it('is false when an element is missing', () => {
    expect(isSubset(['a', 'z'], ['a', 'b', 'c'])).toBe(false);
  });

  it('treats the empty set as a subset of anything', () => {
    expect(isSubset([], ['a'])).toBe(true);
  });
});

describe('validateStrictNesting', () => {
  const nested: CredentialSet[] = [
    { programKey: 'cert-x', tier: 'certificate', specializationKey: 'x', memberCourseCodes: ['E'] },
    { programKey: 'dip-x', tier: 'diploma', specializationKey: 'x', memberCourseCodes: ['G', 'E', 'C1', 'CAP'] },
    { programKey: 'mba-x', tier: 'mba', specializationKey: 'x', memberCourseCodes: ['CR01', 'G', 'E', 'C1', 'CAP'] },
  ];

  it('passes when Certificate ⊂ Diploma ⊂ MBA', () => {
    const result = validateStrictNesting(nested);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('flags a certificate that is not a subset of its diploma', () => {
    const broken: CredentialSet[] = [
      { programKey: 'cert-x', tier: 'certificate', specializationKey: 'x', memberCourseCodes: ['NOT_IN_DIP'] },
      { programKey: 'dip-x', tier: 'diploma', specializationKey: 'x', memberCourseCodes: ['G', 'E'] },
    ];
    const result = validateStrictNesting(broken);
    expect(result.ok).toBe(false);
    expect(result.violations[0].missingCourseCodes).toContain('NOT_IN_DIP');
  });

  it('flags a diploma that is not a subset of its MBA', () => {
    const broken: CredentialSet[] = [
      { programKey: 'dip-x', tier: 'diploma', specializationKey: 'x', memberCourseCodes: ['G', 'EXTRA'] },
      { programKey: 'mba-x', tier: 'mba', specializationKey: 'x', memberCourseCodes: ['G'] },
    ];
    const result = validateStrictNesting(broken);
    expect(result.ok).toBe(false);
    expect(result.violations[0].missingCourseCodes).toContain('EXTRA');
  });

  it('validates each specialization group independently', () => {
    const twoSpecs: CredentialSet[] = [
      ...nested,
      { programKey: 'cert-y', tier: 'certificate', specializationKey: 'y', memberCourseCodes: ['MISSING'] },
      { programKey: 'dip-y', tier: 'diploma', specializationKey: 'y', memberCourseCodes: ['GY'] },
    ];
    const result = validateStrictNesting(twoSpecs);
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].specializationKey).toBe('y');
  });
});
