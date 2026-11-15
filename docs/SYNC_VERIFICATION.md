# Sync and learning data verification

Date: 15/11/2026. Base: 328dfe20c86bfe912a227965ef05f19a81ed0fb3.
Scope: automated verification first, as requested by the user. AI explicitly deferred.

## Environments

- Node 22, pure domain/browser-adapter tests with controlled monotonic clocks and network acknowledgements.
- PostgreSQL via PGlite, two synthetic owner UUIDs A/B, authenticated/anonymous roles and auth.uid() stub. These are isolated in-memory fixtures, never user learning history.
- Supabase project: migrations 005 and 006 run through Dashboard after checking existing schema; no historical migration edited or learner rows deleted.
- Static built preview at 127.0.0.1:4174, guest-only QA.

## Automated expected/actual

| Scenario | Expected | Actual / evidence |
| --- | --- | --- |
| A open attempt, B reads/updates | B denied; separate history/checkpoint/time | PASS, database + cloud + activity adapter tests |
| Answer ack lost | Remain pending; retry without duplicate result | PASS, answer queue / server-practice tests |
| Activity ack lost | Same segment UUID acknowledged once; budget read from server | PASS, activity-adapter + database tests |
| Duplicate submit/start | Same result/attempt, no extra history | PASS, database + server-practice tests |
| Two sources on one account | Only one active lease; overlapping intervals rejected | PASS, database tests |
| Cross-account late callback | Does not update new user's state/time | PASS, cloud + activity adapter tests |
| Different devices use stale revision | Explicit conflict, preserved local backup | PASS, server-practice + cloud tests |
| Expired timed attempt | Cannot save late answers or extend deadline | PASS, database + server-practice tests |
| Hidden tab / suspended clock / reload | No absence inferred as study | PASS, activity domain + adapter tests |
| Visible audio | Counts while actually playing; idle input timeout bypassed | PASS, activity domain tests; browser audio playback still needs a full manual pass |
| Local midnight | Split UTC interval using IANA timezone | PASS, JS + PostgreSQL tests |
| Unknown import version | Retained as unverified, no skill/review evidence | PASS, import-trust tests |
| Forged correct / server flag | Correctness recalculated only for matching version, no verified flag | PASS, JS + PostgreSQL tests |
| Spaced recall | 1 → 3 → 7 days; immediate repeat never advances | PASS, review tests |

## Hosted manual acceptance still pending

The user has not supplied two test email accounts and selected automated verification first. Do not infer hosted Auth/JWT or independent device acceptance from PGlite/VM results.

- [ ] A signs in on two independent devices, resumes exactly server-acknowledged choices.
- [ ] Submit on device 2, revisit device 1; unique submitted result and explicit closed state.
- [ ] Real browser offline/reconnect and expired-login flows.
- [ ] Sign out A/sign in B on real browsers, including time ledger and checkpoint.
- [ ] Listening, hidden/background tab and mobile throttling checks on real devices.

## Measurement limits / recovery

Activity is a client interaction estimate, not an anti-cheating signal. A visible unattended tab can accrue up to the 120-second idle threshold. Timer suspension gaps over 5 seconds are discarded. New activity sources may wait up to 45 seconds for a closed source's lease. Unsynced chunks persist separately; a displaced lease cannot silently add its offline time. Deadline and answer grading remain server-controlled.

Legacy/imported durations remain estimates, never daily-budget input. Guest time is a local estimate; it is not imported as trusted cloud activity. No fake claims of hosted two-account acceptance or AI completion.
