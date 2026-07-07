import { apiRequest } from '@/lib/queryClient';

/**
 * Typed client for the AGI Utah API (`/api/agi-utah/*`). Reuses the app's `apiRequest`
 * (JWT from localStorage). Isolated: nothing in the existing client imports this module, so
 * it cannot affect the current app until it is deliberately routed.
 */

const BASE = '/api/agi-utah';

export interface EnrollInput {
  studentRef: string;
  programKey: string;
  intakeKey: string;
  courseCode: string;
}

export interface EnrollResult {
  allowed: boolean;
  reasons: string[];
  enrollmentId?: string;
  attemptNo?: number;
}

export interface GradeInput {
  studentRef: string;
  courseCode: string;
  attemptNo: number;
  gradeLetter: string;
  gradedByRef?: string;
}

export interface AttendanceInput {
  studentRef: string;
  intakeKey: string;
  courseCode: string;
  weekIndex: number;
  source: 'live' | 'recording' | 'manual';
}

export interface ContactLedger {
  contactEvents: number;
  engagementEvents: number;
  byType: Record<string, number>;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiRequest('POST', `${BASE}${path}`, body);
  const json = (await res.json()) as Envelope<T>;
  return json.data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await apiRequest('GET', `${BASE}${path}`);
  const json = (await res.json()) as Envelope<T>;
  return json.data as T;
}

export interface BootstrapResult {
  catalog: Record<string, number>;
  intakeKey: string;
  offerings: number;
}

export interface StudentOverview {
  programs: Array<{ programKey: string; intakeKey: string; status: string; awardName: string }>;
  courses: Array<{ courseCode: string; attemptNo: number; status: string; gradeLetter?: string; monthIndex: number }>;
  credentials: Array<{ programKey: string; awardName: string; status: string; issuedAt: string }>;
}

export interface ProgramEnrollInput {
  studentRef: string;
  programKey: string;
  intakeKey: string;
}

export const agiUtahApi = {
  bootstrap: () => post<BootstrapResult>('/bootstrap'),
  createIntake: (input: { intakeKey: string; startYear: number; startMonth: number }) =>
    post<BootstrapResult>('/bootstrap', input),
  enrollInProgram: (input: ProgramEnrollInput) => post<{ enrolled: boolean }>('/programs/enroll', input),
  studentOverview: (ref: string) => get<StudentOverview>(`/students/${encodeURIComponent(ref)}/overview`),
  loadCatalog: () => post<Record<string, number>>('/catalog/load'),
  expandIntake: (key: string) => post<{ offerings: number }>(`/intakes/${encodeURIComponent(key)}/expand`),
  enroll: (input: EnrollInput) => post<EnrollResult>('/enroll', input),
  grade: (input: GradeInput) => post<{ passed: boolean; gradePoint: number | null }>('/grade', input),
  recordAttendance: (input: AttendanceInput) => post<{ firstTime: boolean }>('/attendance', input),
  contactLedger: (studentRef: string) => get<ContactLedger>(`/students/${encodeURIComponent(studentRef)}/contact-ledger`),
  earnedCredentials: (studentRef: string) => get<string[]>(`/students/${encodeURIComponent(studentRef)}/earned-credentials`),
  issueCredential: (input: { studentRef: string; programKey: string }) =>
    post<{ issued: boolean; reason?: string }>('/credentials/issue', input),
};
