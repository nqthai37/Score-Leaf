# TOEIC Path — Next.js application

This is the complete production application hosted on [Vercel](https://toeic-path-next-preview.vercel.app). The project retains its original deployment name for address continuity.

- App Router + React + TypeScript; Node.js 22.
- Welcome page: introduction beside email/password login and registration. Existing email-link users can set a password from Settings after signing in.
- Authenticated practice, recorded audio, checkpoints, timed attempts, review, vocabulary, progress and backup import/export.
- Supabase cookie authentication, server callback, server-protected learning routes and owner-checked RPCs.
- Generated content and preserved pure domain modules have stable identities and versioned assets. No legacy DOM app is bootstrapped.

From this directory: `npm ci`, `npm run dev`. Production: `npm run build`, `npm start`.

Run `npm test`, `npm run typecheck`, and `npm run test:routes` after building.

See [project introduction](../../README.md) and [development / deployment guide](../../docs/DEPLOYMENT.md) for architecture, backend setup, limitations and full verification commands.
