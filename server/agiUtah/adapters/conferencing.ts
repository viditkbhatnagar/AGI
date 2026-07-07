/**
 * Live conferencing adapter (BigBlueButton in production). Interface + Console stub +
 * env selector, per the platform's adapter pattern. The Console stub lets the whole system
 * run with no vendor configured; the real BBB adapter is added when credentials exist.
 */

export interface LiveMeeting {
  meetingId: string;
  joinUrl: string;
}

export interface ConferencingAdapter {
  createMeeting(input: { courseCode: string; weekIndex: number }): Promise<LiveMeeting>;
  getJoinUrl(meetingId: string, role: 'moderator' | 'attendee'): Promise<string>;
  getRecordingUrl(meetingId: string): Promise<string | null>;
}

class ConsoleConferencingAdapter implements ConferencingAdapter {
  async createMeeting(input: { courseCode: string; weekIndex: number }): Promise<LiveMeeting> {
    const meetingId = `console-${input.courseCode}-w${input.weekIndex}`;
    return { meetingId, joinUrl: `console://live/${meetingId}` };
  }

  async getJoinUrl(meetingId: string, role: 'moderator' | 'attendee'): Promise<string> {
    return `console://live/${meetingId}?role=${role}`;
  }

  async getRecordingUrl(): Promise<string | null> {
    return null;
  }
}

export function getConferencingAdapter(): ConferencingAdapter {
  const provider = process.env.AGI_UTAH_CONFERENCING_PROVIDER ?? 'console';
  if (provider === 'console') return new ConsoleConferencingAdapter();
  throw new Error(`Conferencing provider "${provider}" is not configured yet.`);
}
