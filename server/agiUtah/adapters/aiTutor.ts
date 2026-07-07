/**
 * AI tutor adapter (Claude/LLM in production, RAG scoped per course). Interface + Console stub
 * + env selector. Tutor activity is ENGAGEMENT — logged as such and never counted as contact.
 */

export interface AiTutorReply {
  answer: string;
  tokensUsed: number;
}

export interface AiTutorAdapter {
  ask(input: { courseCode: string; question: string }): Promise<AiTutorReply>;
}

class ConsoleAiTutorAdapter implements AiTutorAdapter {
  async ask(input: { courseCode: string; question: string }): Promise<AiTutorReply> {
    return {
      answer: `[console tutor for ${input.courseCode}] No live model configured. Question received: ${input.question}`,
      tokensUsed: 0,
    };
  }
}

export function getAiTutorAdapter(): AiTutorAdapter {
  const provider = process.env.AGI_UTAH_AITUTOR_PROVIDER ?? 'console';
  if (provider === 'console') return new ConsoleAiTutorAdapter();
  throw new Error(`AI tutor provider "${provider}" is not configured yet.`);
}
