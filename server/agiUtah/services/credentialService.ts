import { AgiUtahCredentialDefinition } from '../models/credentialDefinition';
import { AgiUtahCourseEnrollment } from '../models/courseEnrollment';
import { AgiUtahCredentialRecord } from '../models/credentialRecord';
import { isCredentialEarned } from '../lib/credentialLogic';
import { getCredentialIssuer } from '../adapters/credentialIssuer';
import { emitEvent } from './emitEvent';

export interface IssueResult {
  issued: boolean;
  reason?: 'program-not-found' | 'requirements-not-met' | 'already-issued';
}

async function passedCourseCodes(studentRef: string): Promise<string[]> {
  const passed = await AgiUtahCourseEnrollment.find({ studentRef, status: 'passed' }).lean();
  return passed.map((p) => p.courseCode);
}

/**
 * Issues the credential for `programKey` if the student has earned it and it has not already
 * been issued. Idempotent (one record per student+program). Used both by the grading flow
 * (for the enrolled program) and for on-request intermediate credentials.
 */
export async function issueCredentialIfEarned(studentRef: string, programKey: string): Promise<IssueResult> {
  const def = await AgiUtahCredentialDefinition.findOne({ programKey }).lean();
  if (!def) return { issued: false, reason: 'program-not-found' };

  const passed = await passedCourseCodes(studentRef);
  if (!isCredentialEarned(passed, def.memberCourseCodes)) return { issued: false, reason: 'requirements-not-met' };

  const existing = await AgiUtahCredentialRecord.findOne({ studentRef, programKey }).lean();
  if (existing) return { issued: false, reason: 'already-issued' };

  const issuer = getCredentialIssuer();
  const { issuerCredentialId } = await issuer.issue({ studentRef, programKey, awardName: def.awardName });

  await AgiUtahCredentialRecord.create({
    studentRef,
    programKey,
    tier: def.tier,
    awardName: def.awardName,
    issuerCredentialId,
    status: 'issued',
  });

  await emitEvent({
    eventType: `credential.${def.tier}.issued`,
    subjects: [{ kind: 'student', ref: studentRef }, { kind: 'program', ref: programKey }],
    payload: { awardName: def.awardName, issuerCredentialId },
  });

  return { issued: true };
}

/**
 * Lists the credentials a student has earned but not yet been issued — the basis for the
 * "award intermediate credential on request" flow (Logan: intermediate credentials on request).
 */
export async function listEarnedUnissuedCredentials(studentRef: string): Promise<string[]> {
  const passed = await passedCourseCodes(studentRef);
  const [definitions, issued] = await Promise.all([
    AgiUtahCredentialDefinition.find({}).lean(),
    AgiUtahCredentialRecord.find({ studentRef }).lean(),
  ]);
  const issuedKeys = new Set(issued.map((r) => r.programKey));
  return definitions
    .filter((d) => !issuedKeys.has(d.programKey) && isCredentialEarned(passed, d.memberCourseCodes))
    .map((d) => d.programKey);
}
