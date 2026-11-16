# Authenticated access

All learning pages require a verified Supabase account: dashboard, plan, practice (including sessions and saved attempts), tests, review, vocabulary, progress and settings.

- Next.js Proxy validates the session with `auth.getUser()` for direct requests, client navigation and prefetches. Anonymous or invalid sessions receive a private, non-cacheable redirect to `/login?next=...`; refreshed or cleared cookies are preserved on the response.
- Every learning route is also inside `app/(protected)` with a server layout calling request-scoped `requireUser()`. This keeps the server boundary independent from client UI state.
- AppShell renders no private navigation, profile or learning content until authentication is ready. It removes cached screens immediately after sign-out/session expiry and redirects to sign-in, including during client/back navigation.
- Return paths accept only known same-origin learning routes. External URLs, control characters, backslashes and auth loops fall back to `/dashboard`.
- `/`, `/login`, `/auth/callback`, robots and public assets remain accessible. Email-link sign-in is available directly on the public login page so older email-only accounts can still sign in before setting a password.
- PostgreSQL RLS and owner-checked RPCs remain the authorization boundary for account data; route guards do not replace database policies. Browser-delivered educational assets are not secure examination material.

The route tests exercise anonymous GET/HEAD/RSC requests, forged/incomplete cookies, return-path preservation, public authentication pages and callback failure. Unit tests cover redirect validation and immediate removal of cached private screens on sign-out. No real owner account is signed out automatically during verification.

Email redirects use a shared canonical production origin (`https://scoreleaf.vercel.app`) rather than the currently open deployment hostname. Old public sign-in entry pages move to ScoreLeaf before creating an origin-bound PKCE verifier. Existing callbacks and authenticated sessions on the old origin remain compatible; no Supabase redirect entry was removed. Previously sent email messages are unchanged: request a fresh link from ScoreLeaf for the new address.
