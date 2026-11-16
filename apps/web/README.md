# TOEIC Path — Next.js preview

Live preview: https://toeic-path-next-preview.vercel.app

N0–N1 foundation only. Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3; Node 22.x. Versions are pinned in the local package lock. Standard Node server output (not static export).

## Run from this directory

```sh
npm ci
npm test
npm run build
npm run typecheck
npm run test:routes
npm run start
```

`npm run dev` and `npm run start` listen on http://127.0.0.1:3000. From the repo root, use `npm run web:dev`, `web:build`, `web:typecheck`, `web:test` and `web:test:routes`.

## Structure

- `app`: App Router layouts, all target route entry points, loading/error/not-found boundaries, reserved callback.
- `src/components`: small client navigation boundary; server headings/preview disclosure. Pages/layout stay Server Components.
- `src/lib`: typed navigation and public content inventory adapter.
- `src/generated`: public summary only, produced by the root baseline script; no legacy DOM bootstrap.
- `src/styles`: exact checked copies of existing CSS; `app/globals.css` contains preview/responsive additions.
- `public/illustrations`: existing hero artwork reused as SVG.
- `scripts/check-routes.mjs`: production HTTP checks, direct/repeat route loads, safe callback and dynamic session responses.

No quiz, audio player, browser storage, Supabase session or personal progress is connected in N1. Those are N2–N5 and must inherit the active-time, answer-queue, account-fence and import rules. Never present placeholders as working learning flows. Links lead back to the current learning site.

## Vercel

Deploy this directory as a separate Next.js project (`apps/web` as Root Directory if importing Git). Build: `npm run build`; install: `npm ci`; Node: 22.x. CSS and public inventory are self-contained, so no source-outside-root setting is needed. No environment variables are required in N1. Never add service-role or provider keys to NEXT_PUBLIC variables.

The legacy GitHub Pages site remains production. A Vercel deployment of this separate project is a migration preview, even if Vercel labels the isolated project environment “production”. Do not point the main domain here before N6.

N4 will add the public Supabase URL/key, server/browser adapters and callback exchange. Guest history cannot be read across origins; transfer requires explicit export/import.

### Verified hosted preview

Deployed 16/11/2026 to the separate `toeic-path-next-preview` project, application source `598963f`. Hosted HTTP route checks passed. The first Vercel deployment is labeled production inside this isolated preview project; GitHub Pages continues to serve the learning application. No Supabase callback or personal data is connected here yet. See `docs/migration/STATUS.md` in the repository for the deployment record and parity milestones.
