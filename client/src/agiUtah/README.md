# AGI Utah — client screens (isolated)

A self-contained UI module for the AGI Utah program. It reuses the app's `apiRequest`
(`@/lib/queryClient`) and TanStack Query, and talks to `/api/agi-utah/*`.

**Isolated & inert:** nothing in the existing client imports this module, so it is tree-shaken
out and cannot affect the current app. The backend it calls 404s unless `AGI_UTAH_ENABLED` is
set, so it stays inert until the program is deliberately enabled.

## Contents
- `api.ts` — typed client for the AGI Utah endpoints.
- `hooks.ts` — TanStack Query hooks.
- `styles.ts` — shared Tailwind class strings.
- `StudentEnroll.tsx` — enroll in a course (shows eligibility reasons) + claimable credentials.
- `FacultyGrading.tsx` — post a grade (triggers credential + academic-progress recompute).
- `Attendance.tsx` — record live-session attendance (logs a contact-hour event once).
- `ContactLedgerView.tsx` — the contact-hour / RSI ledger for a student.
- `AdminPanel.tsx` — load/refresh catalog, expand an intake.
- `AgiUtahApp.tsx` — self-contained tabbed page combining all screens (Student / Faculty /
  Attendance / RSI Ledger / Admin).

## To expose it (one deliberate line, behind a flag)
Add a route in the client router (wouter) — e.g. in `client/src/App.tsx`:

```tsx
import { AgiUtahApp } from '@/agiUtah/AgiUtahApp';
// ...
<Route path="/agi-utah" component={AgiUtahApp} />
```

This is intentionally left for a reviewed change so the existing router is untouched.

## Status
Covers the core role flows end-to-end: student enrollment (with live eligibility reasons),
faculty grading, attendance capture, the RSI/contact-hour ledger, and admin catalog/intake.
Richer dashboards (SAP/finance detail, transcripts, faculty grading *queue* over real
submissions) build on the same `api.ts` / `hooks.ts` as endpoints are surfaced.
