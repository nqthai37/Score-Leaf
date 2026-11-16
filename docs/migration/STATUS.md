# Next.js migration status

Updated 17/11/2026 (Asia/Saigon). The user expanded the former N0–N1 foundation task to a complete Next.js and Vercel migration.

## Implemented

- Next.js App Router is the application runtime; routes render functional React learning views. No legacy HTML app or DOM bootstrap is embedded.
- Public entry: English app introduction and login / registration tabs using Supabase email/password. All learning routes require a verified account; the guest shortcut has been removed. Existing email-link sign-in is retained, with password setup in Settings.
- All seven parts, 10 original mini tests, custom learning / timed challenge, reading sprint, diagnostic and daily sessions. Complete question groups stay intact.
- Recorded Faye / Dmitri audio, playback rate, transcripts and cleanup on question / route changes. All 102 published WAV hashes and content IDs are retained.
- Guest checkpoints and results; original deadlines on resume; in-place answer feedback. Server attempts use owner-checked RPCs, queued answer writes, revision conflicts, resumable snapshots and idempotent grading.
- Account-scoped caches / progress sync, epoch fences, explicit guest import, backup preview / merge, provenance recalculation and unknown-version quarantine.
- Active time uses visibility, idle and actual playback rules, monotonic intervals, local leases for guests and server leases / acknowledged outboxes for account attempts. Imported durations do not enter daily budgets.
- Daily planner, 4/8/12-week routine, 1/3/7-day review, vocabulary, first/repeat/recall statistics and cloud history views.
- Cookie-based browser/server Supabase clients, PKCE callback and session-refresh Proxy. Exact Vercel / localhost callbacks added, and Site URL changed to the Vercel origin in the existing Supabase Dashboard. Database schema and RLS remain unchanged.
- Root dev/build/start commands run Next.js. Pages workflow publishes only the migration notice and local completed-history exporter. Old source remains a protected regression fixture and content authoring source, not a production runtime.
- README rewritten as a project introduction with current demo, features, architecture, setup and honest limitations.

## Deployment

Primary application: https://scoreleaf.vercel.app. The Vercel project is named `scoreleaf`; former public sign-in entry pages redirect to the canonical ScoreLeaf domain. Newly requested email links use the canonical callback; existing callbacks remain compatible. Deployment is through the authenticated official CLI; Git-triggered Vercel integration is not configured. Do not claim every Git push deploys automatically.

The GitHub Pages notice directs learners to Vercel and lets them export browser-local completed history before leaving the old origin. Cloud learners use the same Supabase account. Unfinished guest checkpoints cannot transfer through the completed-history importer. No browser data or database history is deleted during cutover.

## Verification and remaining limits

- Original domain / adapter / PostgreSQL tests passed, including synthetic user A/B/anonymous RLS and owner isolation.
- Next content / migration tests cover hashes, group integrity and daily budget, import trust and deduplication, checkpoints / deadlines, answer retry acknowledgements and hidden / suspended active time.
- Production build, TypeScript, Next tests and direct/repeated production route checks passed for the completed app and welcome page. Hosted route checks passed against Vercel; the final deployment is checked again after upload.
- Browser: guest daily practice → select/check → save/leave → resume checked question → submit/results verified locally. Check feedback kept the measured scroll position unchanged when the check control was already visible.
- Welcome page: login/register tabs, mismatch validation without sending a signup request, two-column desktop rendering and a single-column mobile layout verified on Vercel. Observed mobile document width and scroll width were both 375px: no horizontal overflow. Temporary viewport override was reset.
- Owner completed real email-link sign-in on Vercel. Settings showed Saved to cloud and prior preferences; Progress rehydrated server-graded history and an existing submitted snapshot displayed the same 1/8 result. This was read-only validation of the pre-existing QA attempt, not a new learner assessment. Password fields are filled only by the owner; password login, new-account email confirmation and two-account cross-device QA remain to be exercised with real credentials.
- No claim of manually listening to every recording. Difficulty calibration, full-length official exams, AI and React Native remain outside this release.

See [deployment guide](../DEPLOYMENT.md) for current commands and migration / backup behavior. The original milestone plan and protected baseline remain available as history.
