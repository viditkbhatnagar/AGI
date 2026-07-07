/**
 * Originality / AI-writing check adapter (Turnitin in production). Interface + Console stub +
 * env selector. The scores are a signal, not proof — paired with draft history by faculty.
 */

export interface OriginalityScores {
  similarityScore: number;
  aiWritingScore: number;
}

export interface OriginalityAdapter {
  check(input: { studentRef: string; courseCode: string; fileRef?: string }): Promise<OriginalityScores>;
}

class ConsoleOriginalityAdapter implements OriginalityAdapter {
  async check(): Promise<OriginalityScores> {
    return { similarityScore: 0, aiWritingScore: 0 };
  }
}

export function getOriginalityAdapter(): OriginalityAdapter {
  const provider = process.env.AGI_UTAH_ORIGINALITY_PROVIDER ?? 'console';
  if (provider === 'console') return new ConsoleOriginalityAdapter();
  throw new Error(`Originality provider "${provider}" is not configured yet.`);
}
