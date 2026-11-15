# Learning data reliability — implementation decisions

## Activity (migration 005)

- Store immutable UTC activity segments (UUID, owner, attempt, source, end, milliseconds). A private lease permits only one source per account across attempts; lease lasts 45 seconds and renews every 15 seconds while active.
- Report at most 30 seconds per segment. Server serializes leases/segments, checks owner/open/deadline, source window, no overlap and stable retry payload. Duplicate accepted IDs return the existing acknowledgement even after submit. No direct client table writes.
- Client measures intervals with performance.now(), counts only visible quiz and recent interaction (120-second idle threshold) or actual audio playback. Hidden/suspended gaps never accrue. Idle detection is an estimate: up to the idle threshold may accrue before detecting a visible unattended screen.
- A reload creates a new clock/source and never adds the absence. A second source waits until the lease expires. Client keeps unsent intervals separately, never labels them server-saved; intervals from a displaced lease are not silently counted.
- UTC intervals are split by local-midnight boundaries in the requested IANA timezone when aggregating. Daily totals include open attempts, and completion never adds time again.
- Guest intervals use the same clock and a device-local lease; guest estimates are not server-verified. Legacy durations remain visible as legacy estimates and never reduce the new daily budget.

## Provenance

- Server results are trusted only when rehydrated by owner-checked RPC. Claimed flags/IDs in a file confer no authority.
- Current-version imported answers are recalculated against that exact bank version. Unknown versions retain unverified historical values, excluded from evidence, scheduling and trusted mistakes.
- Trusted runtime evidence sources: current local practice, version-matched recalculated backup, rehydrated server attempts. Public static content still precludes claims of exam security.

## Review

- First-answer evidence remains independent from spaced recall. After an error: due in 1 day. Correct on/after due date: next interval 3 days, then 7 days; same-day/immediate repeats do not advance. Any later error resets to 1 day. No mastery claim.
- Existing reviewed skill tags are used when enough evidence exists; otherwise use Part, with explicit limited confidence.

## External prerequisites

- User chose automated verification first; independent accounts/devices not available yet. Never label simulated tests as hosted multi-device acceptance.
- User explicitly deferred AI in this iteration on 15/11/2026. No provider integration, key or paid call is added.
