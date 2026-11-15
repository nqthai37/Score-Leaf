# N0 — Stable migration baseline

Date: 16/11/2026 (Asia/Saigon).
Branch: `migration/nextjs-foundation`.
Baseline main: `fd0583286830531c5c365c7fdca00405a8a3e259`, confirmed against origin/main.
Current production: https://nqthai37.github.io/toeic-path/

## Verification completed before scaffolding

- `npm test`: content identity, active clock/adapter, trusted import, spaced review, planner, cloud account isolation, server practice, scroll stability, audio/hash and PostgreSQL tests passed.
- `npm run build` and `npm run test:build`: passed.
- 246 question IDs, 154 whole groups, 102 audio IDs, 10 test IDs and 24 vocabulary cards retained.
- Migrations 001–006 retained, including active-study segments and import provenance. No backend rewrite or migration rollback is part of N0–N1.
- Domain, browser adapters, legacy HTML/CSS and migration hashes are recorded in `baseline.json`. `npm run migration:check` detects drift and verifies the preview's copied CSS and public inventory.

## Behaviors the React migration must preserve

| Area | Contract | Current automated evidence |
| --- | --- | --- |
| Selection | Whole listening/reading groups; shared time once | domain / daily-plan tests |
| Quiz | Select/check without scroll jump or audio restart | practice / server-practice / audio tests |
| Guest | IDs-only checkpoint; reload/resume checked feedback | practice tests |
| Online | Acknowledged answers, revision conflicts, repeat submit idempotency | server-practice / PostgreSQL tests |
| Accounts | Separate guest/account caches; late responses fenced | cloud / activity adapter tests |
| Active time | Monotonic, visible/recent engagement or actual audio; no absence on reload | activity tests |
| Timed mode | Original server deadline, no answer keys until permitted | database / server-practice tests |
| Import | Exact-version recalculation; unknown version excluded from evidence | import-trust / database tests |
| Review | First answers separate from spaced recall; experimental 1/3/7 days | review / planner tests |
| Playback | Faye/Dmitri assets; stop/error/stale callback cleanup | audio / WAV/hash tests |

Hosted two-account/two-device acceptance remains pending from the prior iteration; these automated checks do not establish hosted Auth acceptance. AI was explicitly deferred by the user and remains outside this migration foundation.

## Rollback and data transfer

The Pages workflow and deployed main remain the current learning site. This branch adds `apps/web` and a separate CI job; root legacy build/deploy commands still target `src` → `dist`.

Guest storage is origin-bound. Before N6, use the current Settings export and the version-aware import path on the new origin; cloud learners must sign in again. Do not automatically copy or reinterpret old localStorage in N1. Preserve the original export as a recovery copy.

N1's callback is intentionally unconnected: it strips auth query parameters and returns to Settings, with no-store/no-referrer. Do not configure Supabase redirects to the preview until N4 provides a real code exchange and session checks.

## Documentation used

- https://nextjs.org/docs/app/getting-started/installation
- https://nextjs.org/docs/app/getting-started/deploying
- Installed Next.js 16.4.6 `dist/docs`: layouts/pages, server/client boundaries, dynamic params, route handlers, error retry, streamed not-found responses.
