# Next.js deployment

The primary application is `apps/web`, hosted at https://scoreleaf.vercel.app. The Vercel project is named `scoreleaf`; the existing Supabase project and learning data are unchanged.

## Local development

Use Node.js 22. Install both dependency sets from the repository root:

```sh
npm ci
npm --prefix apps/web ci
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` builds Next.js; `npm start` serves that build. The previous static app is never loaded by Next.js.

Public Supabase configuration is in `apps/web/src/lib/supabase/config.ts`, with optional `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` overrides. Never place service-role keys or database passwords in browser configuration.

## Vercel

- Framework: Next.js; root directory: `apps/web`.
- Install: `npm ci`; build: `npm run build`; output: Next.js default.
- Existing project: `nqthai37s-projects/scoreleaf`.
- Deploy from `apps/web` using the authenticated Vercel CLI. This workspace keeps its CLI credentials in ignored `.vercel/auth`; do not commit or copy that directory.

```sh
npm exec --yes --package=vercel@65.16.0 -- vercel deploy --prod --yes --project scoreleaf --scope nqthai37s-projects --global-config .vercel/auth
```

Deployments are currently performed with the CLI. GitHub Actions validates pushes; it does not hold a Vercel deployment token. Automatic deployment on Git pushes requires connecting the repository in Vercel's Git settings using the owner's GitHub authorization.

## Authentication

The public entry page offers email/password login and registration; existing email-link users can request a link directly on the public sign-in page, then set a password in Settings. The app uses `@supabase/ssr` cookie clients, a PKCE exchange at `/auth/callback`, and session refresh and authentication checks in Next.js Proxy. All learning routes also sit behind the server layout in `app/(protected)`; signed-out client views are hidden immediately. See [access rules](AUTH_ACCESS.md). Personal learning data is loaded in the account-scoped client adapter; ownership is checked again by PostgreSQL RLS and RPCs. No personalized response uses a shared CDN cache.

Current Supabase Site URL: `https://scoreleaf.vercel.app/`. Exact allowed callback URLs:

- `https://scoreleaf.vercel.app/auth/callback`
- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/callback`

After changing the primary domain, update Supabase Site URL, these exact callback entries, the Pages notice destination and README. Avoid wildcard production redirects.

## Content and backups

`npm run content:next` deterministically copies authored question data, domain modules and existing audio into the Next.js application. Commit the generated output so a Vercel build from `apps/web` is self-contained. `npm run migration:check` protects the original migration baseline. Content identities and audio hashes remain unchanged.

Cloud history stays in the same Supabase project. Browser-local storage belongs to an origin: the former GitHub Pages address therefore hosts a migration notice with a local-only completed-progress exporter. Import that JSON in the new site's Settings. It never reads authentication tokens, deletes browser data or forwards private query parameters. Unfinished guest checkpoints cannot be transferred through this completed-history import; account attempts remain resumable from Supabase.

The old static sources and their build commands remain as regression/reference fixtures (`npm run legacy:build`). They are not the production application. Pages publishes only `.pages/`, never `dist/` or the Next.js output.

## Verification

```sh
npm test
npm run migration:check
npm run legacy:build
npm run test:build
npm run web:test
npm run build
npm run web:typecheck
npm run web:test:routes
npm run pages:bridge
node --test tests/pages-bridge.test.mjs
```

Hosted authentication needs the owner to open an email link in the same browser. Automated database tests cover two synthetic users, anonymous requests, ownership, RLS, revisions and grading; they do not replace an end-to-end hosted email login on two real accounts.
