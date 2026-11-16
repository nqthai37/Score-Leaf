# Next.js migration status

Updated 16/11/2026 (Asia/Saigon). Baseline: fd0583286830531c5c365c7fdca00405a8a3e259.
Branch: migration/nextjs-foundation. Production Pages remains on main.

| Milestone | Actual status |
| --- | --- |
| N0 | Complete: legacy source/database/audio tests, build/output tests and protected baseline hashes recorded. |
| N1 | Local app implemented: App Router + TypeScript, server pages/layout, small client navigation/error boundaries, all target route entry points and responsive CSS. Production Node build and HTTP route checks pass. Vercel deployment complete: https://toeic-path-next-preview.vercel.app. Production HTTP route checks also pass against this hosted app. |
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

User selected Vercel and completed a fresh device authorization for the official CLI. Preview project: `nqthai37s-projects/toeic-path-next-preview`.

- Stable preview: https://toeic-path-next-preview.vercel.app
- Immutable deployment: https://toeic-path-next-preview-5huw3nyps-nqthai37s-projects.vercel.app
- Deployment ID: `dpl_BiNqS9LWDMoXoPV7JtCkZ7xvLH1m`, READY on 16/11/2026.
- Deployed application source: `598963fa1df56458eba15960ce6fb6c14860ab1a` (later branch commits update documentation only).
- GitHub Actions run `43753732222`: both `test` and `next-preview` passed.
- Hosted `PREVIEW_BASE_URL=https://toeic-path-next-preview.vercel.app npm run test:routes`: passed, including direct/repeated route loads, callback, private session cache, 404/not-found view and SVG.
- Browser: test-library navigation/refresh, dynamic session placeholder and dashboard artwork observed on Vercel; screenshot stored in workspace artifacts/previews/nextjs-vercel-preview.png.

Vercel assigned the first deployment to the isolated project's production environment. It remains a migration preview; the current learning site continues on GitHub Pages. No domain cutover or Supabase redirect change occurred. Default deployment protection remains configured; the stable project alias served the preview to an unauthenticated HTTP request and sends `X-Robots-Tag: noindex, nofollow`.

Project root: apps/web. Node 22.x configured, Next.js preset. No environment variables needed for N1. Deployment is manual through CLI; a Git-triggered Vercel deployment integration has not been configured. Authentication material stays in ignored local configuration and is never committed. No protection bypass secret was created.

## Next action after N1

N2 should port pure domain modules incrementally, run baseline parity tests against selection/planning/import/review/activity behavior and preserve all IDs/versions. Then N3 must prove guest listening/reading → submit → results → reload/resume and stable player/timer cleanup before any production replacement.
