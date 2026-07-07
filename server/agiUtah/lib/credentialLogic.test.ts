import { describe, it, expect } from 'vitest';
import {
  coursesRemainingFor,
  coursesToAddOnUpgrade,
  isCredentialEarned,
  isSpecializationUnlocked,
} from './credentialLogic';

describe('isSpecializationUnlocked', () => {
  it('is unlocked only after the gateway course is passed', () => {
    expect(isSpecializationUnlocked(['CR05'], 'CR05')).toBe(true);
    expect(isSpecializationUnlocked(['CR01', 'CR03'], 'CR02')).toBe(false);
  });
});

describe('isCredentialEarned', () => {
  it('is earned only when every member course is passed', () => {
    expect(isCredentialEarned(['CR02', 'FT01', 'FT02', 'FT04', 'FT06'], ['CR02', 'FT01', 'FT02', 'FT04', 'FT06'])).toBe(true);
    expect(isCredentialEarned(['CR02', 'FT01'], ['CR02', 'FT01', 'FT02', 'FT04', 'FT06'])).toBe(false);
  });
});

describe('coursesRemainingFor', () => {
  it('lists only the outstanding member courses', () => {
    expect(coursesRemainingFor(['CR02', 'FT01'], ['CR02', 'FT01', 'FT02', 'FT06'])).toEqual(['FT02', 'FT06']);
  });

  it('is empty when the credential is complete', () => {
    expect(coursesRemainingFor(['A', 'B'], ['A', 'B'])).toEqual([]);
  });
});

describe('coursesToAddOnUpgrade', () => {
  it('charges only for courses not already completed (strict nesting => no repeats)', () => {
    const diplomaCompleted = ['CR02', 'FT01', 'FT02', 'FT04', 'FT06'];
    const mbaMembers = ['CR01', 'CR02', 'CR03', 'CR04', 'CR05', 'CR06', 'CR07', 'CR08', 'CR09', 'CR10', 'CR11', 'CR12', 'FT01', 'FT02', 'FT04', 'FT06'];
    const toAdd = coursesToAddOnUpgrade(diplomaCompleted, mbaMembers);
    // Everything except CR02 and the 4 FinTech courses (already done) — the other 11 core.
    expect(toAdd).toEqual(['CR01', 'CR03', 'CR04', 'CR05', 'CR06', 'CR07', 'CR08', 'CR09', 'CR10', 'CR11', 'CR12']);
    expect(toAdd).not.toContain('CR02');
    expect(toAdd).not.toContain('FT01');
  });
});
