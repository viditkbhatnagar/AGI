# AGI Utah — Go-Live Runbook (minimal / existing-services launch)

The code is complete, tested, and isolated. Bringing it online is the short sequence below.
Everything runs on services you already use — **no new vendors, no new purchases.**

## Before you start
- The whole program is off until `AGI_UTAH_ENABLED=true`, so these steps are safe to do in order.
- It uses only `agiutah_*` MongoDB collections — it never touches existing student data.

## Steps

### 1. Deploy the code
Merge this branch and deploy as usual. It adds the `server/agiUtah/` + `client/src/agiUtah/`
modules, mounts the API (`/api/agi-utah`), and adds the client route (`/agi-utah`). With the
flag off (default), none of it is reachable — deploying is inert.

### 2. Set the environment variables
In the deployment environment (e.g. Render/host env settings):
```
AGI_UTAH_ENABLED=true
AGI_UTAH_WAVE_1=true
```
That's all — every external tool falls back to the built-in mode (meet-link live classes,
manual proctoring, no Turnitin/AI-tutor). No vendor keys needed.

### 3. Seed the program data (run once)
With the production `MONGO_URI` set (the Utah region — Atlas GCP `us-west3`, Salt Lake City):
```
npx tsx server/agiUtah/scripts/seedAgiUtah.ts
```
This loads the catalog, creates the September-2026 intake, and expands it into course
offerings. It is idempotent (safe to re-run).

### 4. Create the students
Add the Utah students in the **existing admin** (same as any AGI student). They log in with
their normal account; AGI Utah reuses the existing JWT auth and roles. Share the link:
```
https://<your-app>/agi-utah
```
- **Students** enroll, see eligibility, and claim credentials.
- **Faculty/admin** grade, record attendance, and run the Admin tab.

### 5. Smoke-test with one student
On `/agi-utah`: Admin tab → the catalog/intake are loaded → Student tab → enroll a test
student in `CR05` for `sep-2026` → Faculty tab → post a grade → check the RSI Ledger tab.

## How each need is met (no new spend)
- **Live classes** — paste a Zoom/Google Meet link on the session (existing pattern).
- **Proctoring** — a live faculty member over the meeting link + ID check (as Logan confirmed).
- **Certificates** — your existing Certifier.io.
- **Files / email / database** — your existing Cloudinary / SMTP / MongoDB (Utah region).
- **Turnitin / AI tutor** — off; can be switched on later via `AGI_UTAH_*_PROVIDER` env vars.

## To roll back
Set `AGI_UTAH_ENABLED=false` (or unset it). The program instantly disappears — no data to
undo, and current students are unaffected throughout.

## Still open (non-blocking, business)
- Final tuition sign-off (built configurable; pricing is provisional data).
- Capstone proctoring flag (left off until locked).
- WCAG audit + SLA execution status (Logan is confirming).
