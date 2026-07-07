import express, { type Request, type Response, type NextFunction } from 'express';
import { auth } from '../../middleware/auth';
import { requireAdmin, requireAuth, requireTeachingAccess } from '../../middleware/require-auth';
import { isAgiUtahEnabled } from '../config/featureFlags';
import { loadAgiUtahCatalog } from '../loader/loadCatalog';
import { expandIntake } from '../services/schedulerService';
import { bootstrapAgiUtah } from '../services/bootstrapService';
import { enrollStudentInCourse } from '../services/enrollmentService';
import { postCourseGrade } from '../services/gradingService';
import { recordAttendance } from '../services/attendanceService';
import { computeContactLedger } from '../services/contactLedgerService';
import { issueCredentialIfEarned, listEarnedUnissuedCredentials } from '../services/credentialService';

/**
 * Self-contained Express router for the AGI Utah program, mounted at /api/agi-utah.
 *
 * Two layers of protection, both from the existing platform:
 *  - the master feature flag: every route 404s unless AGI_UTAH_ENABLED is on, so the mount is
 *    inert until launch;
 *  - the platform's JWT auth (`auth`) + role guards (requireAdmin / requireTeachingAccess /
 *    requireAuth) — the same guards the rest of the API uses.
 *
 * Error envelope: { success, data? , error? }.
 */
export const agiUtahRouter = express.Router();

function requireAgiUtahEnabled(_req: Request, res: Response, next: NextFunction): void {
  if (!isAgiUtahEnabled()) {
    res.status(404).json({ success: false, error: 'Not found.' });
    return;
  }
  next();
}

function ok(res: Response, data: unknown): void {
  res.json({ success: true, data });
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unexpected error.';
  res.status(400).json({ success: false, error: message });
}

// Layer 1: the whole router is gated by the master feature flag.
agiUtahRouter.use(requireAgiUtahEnabled);

// Public readiness probe (flag-gated, but no auth) — defined before the auth layer.
agiUtahRouter.get('/health', (_req, res) => ok(res, { status: 'ok' }));

// Layer 2: everything below requires a valid JWT (populates req.user); role guards are per-route.
agiUtahRouter.use(auth);

// Admin: one-click bootstrap — load catalog + create the intake + expand offerings.
agiUtahRouter.post('/bootstrap', requireAdmin, async (req, res) => {
  try {
    ok(res, await bootstrapAgiUtah(req.body ?? {}));
  } catch (error) {
    fail(res, error);
  }
});

// Admin: load/refresh the catalog only (idempotent).
agiUtahRouter.post('/catalog/load', requireAdmin, async (_req, res) => {
  try {
    ok(res, await loadAgiUtahCatalog());
  } catch (error) {
    fail(res, error);
  }
});

// Admin: expand an intake into monthly course offerings.
agiUtahRouter.post('/intakes/:key/expand', requireAdmin, async (req, res) => {
  try {
    ok(res, await expandIntake(req.params.key));
  } catch (error) {
    fail(res, error);
  }
});

// Any authenticated user: enroll in a course (full eligibility gate applies).
agiUtahRouter.post('/enroll', requireAuth, async (req, res) => {
  try {
    const { studentRef, programKey, intakeKey, courseCode } = req.body ?? {};
    ok(res, await enrollStudentInCourse({ studentRef, programKey, intakeKey, courseCode }));
  } catch (error) {
    fail(res, error);
  }
});

// Faculty/admin: post a grade (triggers credential + SAP recompute).
agiUtahRouter.post('/grade', requireTeachingAccess, async (req, res) => {
  try {
    const { studentRef, courseCode, attemptNo, gradeLetter, gradedByRef } = req.body ?? {};
    ok(res, await postCourseGrade({ studentRef, courseCode, attemptNo, gradeLetter, gradedByRef }));
  } catch (error) {
    fail(res, error);
  }
});

// Any authenticated user: attendance for a live session (idempotent; emits a contact event once).
agiUtahRouter.post('/attendance', requireAuth, async (req, res) => {
  try {
    const { studentRef, intakeKey, courseCode, weekIndex, source } = req.body ?? {};
    ok(res, await recordAttendance({ studentRef, intakeKey, courseCode, weekIndex, source }));
  } catch (error) {
    fail(res, error);
  }
});

// Any authenticated user: the contact-hour / RSI ledger projection for a student.
agiUtahRouter.get('/students/:studentRef/contact-ledger', requireAuth, async (req, res) => {
  try {
    const courseCode = typeof req.query.courseCode === 'string' ? req.query.courseCode : undefined;
    ok(res, await computeContactLedger(req.params.studentRef, courseCode));
  } catch (error) {
    fail(res, error);
  }
});

// Any authenticated user: credentials earned but not yet issued (the "on request" list).
agiUtahRouter.get('/students/:studentRef/earned-credentials', requireAuth, async (req, res) => {
  try {
    ok(res, await listEarnedUnissuedCredentials(req.params.studentRef));
  } catch (error) {
    fail(res, error);
  }
});

// Admin: issue a specific credential on request (idempotent).
agiUtahRouter.post('/credentials/issue', requireAdmin, async (req, res) => {
  try {
    const { studentRef, programKey } = req.body ?? {};
    ok(res, await issueCredentialIfEarned(studentRef, programKey));
  } catch (error) {
    fail(res, error);
  }
});
