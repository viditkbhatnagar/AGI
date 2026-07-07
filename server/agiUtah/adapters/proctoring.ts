/**
 * Finals proctoring adapter (Honorlock/Proctorio/Respondus or in-house). Interface + Console
 * stub + env selector. Lockdown + webcam stills + ID match only — no AI behavioral proctoring.
 */

export type ProctoringResult = 'pending' | 'passed' | 'flagged' | 'failed';

export interface ProctoringSession {
  sessionToken: string;
}

export interface ProctoringAdapter {
  startSession(input: { studentRef: string; courseCode: string }): Promise<ProctoringSession>;
  getResult(sessionToken: string): Promise<{ result: ProctoringResult; idMatch: boolean }>;
}

class ConsoleProctoringAdapter implements ProctoringAdapter {
  async startSession(input: { studentRef: string; courseCode: string }): Promise<ProctoringSession> {
    return { sessionToken: `console-proctor-${input.courseCode}-${input.studentRef}` };
  }

  async getResult(): Promise<{ result: ProctoringResult; idMatch: boolean }> {
    // The stub returns a passing result so end-to-end flows can complete without a vendor.
    return { result: 'passed', idMatch: true };
  }
}

export function getProctoringAdapter(): ProctoringAdapter {
  const provider = process.env.AGI_UTAH_PROCTORING_PROVIDER ?? 'console';
  if (provider === 'console') return new ConsoleProctoringAdapter();
  throw new Error(`Proctoring provider "${provider}" is not configured yet.`);
}
