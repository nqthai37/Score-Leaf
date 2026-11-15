# Next.js migration status

Updated 16/11/2026 (Asia/Saigon). Baseline: fd0583286830531c5c365c7fdca00405a8a3e259.
Branch: migration/nextjs-foundation. Production Pages remains on main.

| Milestone | Actual status |
| --- | --- |
| N0 | Complete: legacy source/database/audio tests, build/output tests and protected baseline hashes recorded. |
| N1 | Local app implemented: App Router + TypeScript, server pages/layout, small client navigation/error boundaries, all target route entry points and responsive CSS. Production Node build and HTTP route checks pass. Vercel deployment pending account login. |
| N2 | Not complete. Only public inventory summary and exact CSS/hero asset reuse added for N1; full typed domain/content/audio adapters are still to migrate. |
| N3 | Not started: guest reducer, player, active-time hook and checkpoint parity. |
| N4 | Not started: real Supabase browser/server auth, callback exchange, answer queue and online practice. |
| N5 | Not started: functional plan, review, vocabulary, progress, settings and provenance-aware import/export. Current pages disclose the preview and link to the current working site. |
| N6 | Not started. No domain cutover, backend rewrite or production replacement. |
| N7 | Deferred. No AI integration or paid calls. |

## Verification

- Existing `npm test`, `npm run build`, `npm run test:build`: pass before scaffolding.
- Preview inventory test, strict TypeScript, production build: pass.
- Production HTTP: every target page opened directly and repeatedly, unknown route, invalid session not-found UI, reserved callback stripping supplied code/return URL, no-store/no-referrer and SVG namespace verified.
- Dynamic invalid attempt IDs can return HTTP 200 once Next.js has started streaming, while rendering the not-found view and noindex; this follows the installed Next.js contract and is not an authorization mechanism.
- Browser QA: desktop navigation and 390×844 mobile menu, link transition closes menu, no horizontal overflow; viewport override reset afterward.
- Hero SVG visual load confirmed after fixing its standalone XML namespace. Browser screenshots are in workspace artifacts/previews, outside source control.
- Windows sandbox initially denied generated build directories; the normal production build and local HTTP checks passed when run with filesystem/network access. No operating system security settings changed.

## Preview hosting

User selected Vercel. CLI 65.16.0 reports logged out. A dry run of the official temporary-deployment option returned login_required and userActionRequired; no deployment was created. A person must complete Vercel's browser login before uploading this prepared app. Do not ask for an API token in chat or create a protection bypass token.

Vercel project root: apps/web. Runtime Node 22.x, Next.js preset. No environment variables needed for N1. Keep source on this migration branch until later parity milestones; leave Pages workflow unchanged.

## Next action after N1

N2 should port pure domain modules incrementally, run baseline parity tests against selection/planning/import/review/activity behavior and preserve all IDs/versions. Then N3 must prove guest listening/reading → submit → results → reload/resume and stable player/timer cleanup before any production replacement.
