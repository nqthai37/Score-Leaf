# ScoreLeaf documentation

Production demo: [scoreleaf.vercel.app](https://scoreleaf.vercel.app).
`main` is the single maintained branch; completed feature branches have been merged and removed. Their commits remain in Git history.

## Current application

- [Project introduction](../README.md): features, architecture and local setup.
- [Deployment](DEPLOYMENT.md): Next.js, Vercel, Supabase and validation commands.
- [Authentication](AUTH_ACCESS.md): protected routes and canonical email redirects.
- [Brand](BRAND.md): ScoreLeaf name, logo and production domain.
- [Profile and streak](PROFILE_STREAK.md): learner profile and daily flame behavior.
- [Learning data](LEARNING_DATA_DESIGN.md): active time and trusted imports.
- [Sync verification](SYNC_VERIFICATION.md): automated evidence and pending device acceptance.
- [Migration status](migration/STATUS.md): implemented Next.js features and remaining limits.
- [Database](../supabase/README.md): schema, migrations and ownership rules.

## Earlier plans and evidence

[Archived plans](archive/README.md) record earlier decisions; they are not the current deployment instructions. The `migration/` baseline and audio provenance JSON files remain in place for content and regression validation.

## Remaining work

- Real two-account / two-device acceptance, offline recovery and mobile audio checks.
- Owner verification of a newly requested ScoreLeaf email link, password login and new-account confirmation.
- Manual listening review of all recordings and broader question / difficulty review.
- Full-length practice exams and a larger question bank.
- Optional future work: React Native, full offline support and AI explanations (deferred by the owner).
- Optional Vercel Git integration; production deployments currently use the CLI.

The former static source under `src/` is still used by content generation and regression tests. It must not be deleted as unused production code.
