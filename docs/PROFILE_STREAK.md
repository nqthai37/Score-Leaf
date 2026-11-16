# Learner profile and login streak

The top-right avatar opens a profile card with an editable display name, preparation day and daily login streak. Learning pages require a signed-in account. Existing device-only progress can be imported after signing in.

- `x` is the inclusive number of calendar days since the start date in study preferences; the start date is day 1. Future plans show day 0. `y` is the configured number of weeks multiplied by seven. Days beyond the plan are shown honestly; only the progress bar is capped.
- A login day means opening or returning to the app with an authenticated session. A persisted session counts without requiring a password every day. The server computes the date in `profiles.timezone`, defaulting to `Asia/Ho_Chi_Minh`; the browser cannot submit a historical date or a streak value.
- The streak is the run of consecutive login dates ending today. Repeated visits count once. A gap resets the next visit to one. Recording begins with this feature; earlier login history is not fabricated from practice activity.
- Opening the profile requests an atomic daily flame claim. A row lock allows only one tab/device to claim that account/day. Closing/reopening, refresh and route changes cannot replay the effect. Reduced-motion preferences disable movement while retaining the lit flame and confirmation.
- Names are saved separately from learning backups. The new `profile_login_days` table allows authenticated users to read only their own rows. Mutations use owner-fenced RPCs, so late requests from a previous account cannot update the next account. Backups cannot import login dates or reset daily flame claims.

Migration: `supabase/migrations/202611160007_profile_streak.sql`. Apply once after migrations 001–006. The original migration baseline stays frozen; new additive migrations receive their own PostgreSQL tests.

Validation: `node tests/profile-streak.test.mjs`, `npm run web:test`, `npm run build`, `npm run web:test:routes`. PostgreSQL tests cover date computation, consecutive days and gaps, repeat claims, names, anonymous access, RLS and account changes. Calendar tests include future starts, leap days and timezone midnight.

React UI tests additionally cover immediate RPC replies, close/reopen during the 2.4-second animation, remount with an already claimed day, Escape dismissal and guest isolation. The additive migration was applied successfully to the existing Supabase project. Browser QA on Vercel confirmed the owner’s day 6/56 and streak 1, along with a 375px mobile document without horizontal overflow or avatar/menu overlap.
