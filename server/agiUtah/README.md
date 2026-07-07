# AGI Utah — LMS module (Phase 0 foundation)

This directory contains the **new, isolated** code for the AGI Utah online program
(the stackable Certificate ⊂ Diploma ⊂ MBA model). It is built **additively** on top
of the existing AGI platform and is designed to have **zero effect on current students
or existing data**.

## Safety model — why this cannot affect production data

- **New collections only.** Every model here uses its own `agiutah_*` MongoDB
  collection (e.g. `agiutah_courses`). It never reads or writes any existing
  collection (`courses`, `enrollments`, `students`, …).
- **Unique model names.** Every Mongoose model is prefixed `AgiUtah*`, so it can never
  overwrite or clash with an existing model (`Course`, `Enrollment`, `Student`, …).
- **Off by default.** All behaviour is gated behind feature flags that are OFF unless
  explicitly enabled via environment variables (see `config/featureFlags.ts`).
  `AGI_UTAH_ENABLED` is the master switch.
- **Inert until wired.** Nothing in the running app imports this module yet, so at
  runtime it does not load, does not register models, and does not touch the database.
- **Additive only.** When later phases must extend a shared model, they add *optional*
  fields — never rename, remove, or change existing ones.

## Contents

**Foundation**
- `types.ts` — shared credential / course / wave / event types.
- `config/featureFlags.ts` — off-by-default feature-flag helpers.
- `models/domainEvent.ts` — append-only audit / compliance event log.
- `services/emitEvent.ts` — the (only) writer for the event log.
- `models/program.ts`, `models/course.ts`, `models/courseProgramLink.ts`,
  `models/credentialDefinition.ts` — the reusable-course + stackable-credential model.
- `models/academicSpine.ts` — the 12-month core-spine order.
- `lib/strictNesting.ts` — validates Certificate ⊂ Diploma ⊂ MBA.
- `lib/credentialLogic.ts` — pure gateway / credential-earned / upgrade rules.

**Catalog + loader**
- `catalog/agiUtahCatalog.ts` — the Wave-0 core + Wave-1 (FinTech / Finance / Supply Chain)
  program stack, authored as DATA from the course map.
- `loader/catalogTypes.ts` — plain seed shapes.
- `loader/validateCatalog.ts` — invariant + strict-nesting validation (the hard gate).
- `loader/loadCatalog.ts` — idempotent upsert of a validated catalog into `agiutah_*`
  collections. Deliberately invoked only (never at boot); refuses to load an invalid catalog.

**Phase 1 — the student spine (data + pure logic; runtime service, live-class adapter, and routes still to come)**
- `models/intake.ts` — anchors the spine to a real start (year + month).
- `models/courseOffering.ts` — a course's monthly run + its Week-1-only enrollment window.
- `models/programEnrollment.ts`, `models/courseEnrollment.ts` — a student's program + per-course
  attempts (a retake is a new attempt; both persist). Uses a NEW `agiutah_*` collection — the
  existing shared `Enrollment` is never modified.
- `models/liveSession.ts`, `models/attendance.ts` — required weekly lectures + attendance
  (feeds the contact-hour ledger later).
- `lib/calendar.ts` — builds the concrete calendar + enrollment windows from the spine.
- `lib/grading.ts` — the 4.0 scale, B- pass, and latest-attempt GPA.
- `lib/eligibility.ts` — the single enrollment gate (Week-1 window + hard gateway + program
  membership + SAP/hold stubs).

**Tests** — `*.test.ts` alongside each unit (all DB-free: pure logic + a mocked model).

## How to load the catalog (deliberate, later step — not run automatically)

`loadAgiUtahCatalog()` validates then upserts into the `agiutah_*` collections. It is a
manual operation performed against a connected database when we are ready to seed — it is
not wired into the app and does not run on startup.

**Phase 2–3 — accreditation-grade + later-wave logic**
- Pure engines: `lib/sap.ts` (GPA/pace/timeframe state machine), `lib/refund.ts` (two-phase
  pro-rata), `lib/billing.ts` (progress-based 25% quarterly), `lib/contactClassification.ts`
  (the single contact-vs-engagement classifier), `lib/inactivity.ts` (14/21-day rule).
- Models: `credentialRecord`, `sapStatus`, `submission`, `examAttempt`, `financialAccount`,
  `localizationProfile`, `bridgeCohort`.
- Adapters (`adapters/`) — interface + **Console stub** + env selector for conferencing (BBB),
  credential issuer (Certifier), proctoring, originality (Turnitin), and the AI tutor. The
  Console stubs let the whole system run end-to-end with no vendor configured.

**Services (`services/`) — the runtime that ties it together (all write only to `agiutah_*`)**
- `schedulerService` (expand intake → offerings), `enrollmentService` (eligibility → enroll),
  `gradingService` (grade → credential + SAP recompute), `attendanceService` (idempotent
  contact event), `credentialService` (idempotent issuance + on-request list), `sapService`
  (recompute + persist), `contactLedgerService` (RSI projection).

**HTTP (`http/agiUtahRouter.ts`)** — a self-contained Express router. **Not mounted by this
module.** Every route 404s unless `AGI_UTAH_ENABLED` is on; mount it behind the app's auth.

## Minimal-cost mode — run on existing AGI services only (chosen for the small Utah cohort)

AGI Utah is configured to reuse the current platform's services and add NO new paid vendors:

| Need | Existing service used | New purchase? |
|---|---|---|
| Live classes | Zoom/Google **meet link** on the live session (like today's AGI live classes) | No — no BigBlueButton |
| Certificates | **Certifier.io** (already used by AGI) | No |
| Files/docs | **Cloudinary** (already used) | No |
| Email | **SMTP / Nodemailer** (already used) | No |
| Database | **MongoDB Atlas** (already used; US-region cluster) | No |
| Attendance | Recorded manually (or from a webhook later) | No |
| Finals proctoring | **Manual** — faculty invigilate over the meet link + check gov-ID, then record the result (CR02/CR05 stay flagged per Logan) | No vendor |
| Turnitin (originality) | **Off** — instructor review instead | Not used |
| AI tutor | **Off** — optional differentiator (existing Gemini/OpenAI is available if enabled later) | Not used |

The vendor adapters (BBB/Turnitin/proctoring/AI-tutor) remain in the code behind env selectors,
so any of them can be switched on later without a rebuild — but none are required to launch.

## Remaining for go-live (deliberate ops steps — NOT done here, by design)

These require real infrastructure / credentials / decisions and must be done deliberately on
the real environment; they are intentionally not automated against production:

1. **Mount the router** — one line (`app.use('/api/agi-utah', agiUtahRouter)`), behind the
   app's auth middleware. (Touches an existing file, so left for a reviewed change.)
2. **Real vendor adapters + credentials** — swap the Console stubs for BBB / Certifier /
   Turnitin / proctoring / LLM by setting the `AGI_UTAH_*_PROVIDER` env vars and adding the
   real adapter classes.
3. **Seed the data** — run `loadAgiUtahCatalog()` against the **US-region** database, then
   create an intake and `expandIntake('sep-2026')`.
4. **React UI** — the student/faculty/admin screens (the existing app's client), behind flags.
5. **Integration tests against a test DB** (e.g. mongodb-memory-server) to complement the
   pure-logic unit tests here.
6. **Final data from Logan** — locked proctored-course list, approved tuition/fees, and the
   updated catalog + DCP figures (all read as data; no code change).

## Golden rule

All program numbers (credits, hours, calendar order, proctoring) are **data** loaded
from the course map — never hard-coded. A literal `36`, `48`, `135`, or `2160` in code
is a bug: it must come from the loaded data.
