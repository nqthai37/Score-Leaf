"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calendarDay,
  planDay,
  profileInitials,
  type LearnerProfile,
  type FlameClaim,
} from "@/lib/profile";
import { useStudy } from "./study-provider";

function Flame({ lit = false }: { lit?: boolean }) {
  return (
    <svg
      className={"profile-flame" + (lit ? " is-lit" : "")}
      viewBox="0 0 48 58"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="flame-outer"
        d="M26 2C29 15 15 19 20 30C12 28 11 22 11 22C-1 38 6 55 24 56C45 56 49 35 38 23C39 35 30 36 30 30C34 19 33 11 26 2Z"
      />
      <path
        className="flame-inner"
        d="M25 29C27 37 18 40 20 46C16 45 15 42 15 42C12 49 18 54 24 54C34 54 37 45 31 38C31 44 27 44 28 40C29 36 27 32 25 29Z"
      />
    </svg>
  );
}
export function UserProfile() {
  const { user, ready, progress, signout } = useStudy(),
    [client] = useState(createClient);
  const [open, setOpen] = useState(false),
    [profile, setProfile] = useState<LearnerProfile | null>(null),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(""),
    [saving, setSaving] = useState(false),
    [celebrating, setCelebrating] = useState(false),
    [claiming, setClaiming] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    alive = useRef(true),
    openRef = useRef(open),
    mutationVersion = useRef(0),
    profileRef = useRef(profile),
    request = useRef<Promise<void> | null>(null),
    claimedDay = useRef("");
  profileRef.current = profile;
  openRef.current = open;
  const owner = user?.id ?? null;
  function changeOpen(value: boolean) {
    openRef.current = value;
    setOpen(value);
    if (!value) {
      setCelebrating(false);
      setEditing(false);
    }
  }
  async function touch() {
    if (!owner || request.current) return request.current;
    const version = mutationVersion.current;
    request.current = (async () => {
      const { data, error } = await client.rpc("touch_profile", {
        p_owner: owner,
      });
      if (!alive.current || version !== mutationVersion.current) return;
      if (error) {
        setError(
          "Unable to load your profile. Please try again when you are online.",
        );
        return;
      }
      setProfile(data as LearnerProfile);
      setError("");
    })()
      .catch(() => {
        if (alive.current) setError("Unable to connect to your profile.");
      })
      .finally(() => {
        request.current = null;
      });
    return request.current;
  }
  useEffect(() => {
    alive.current = true;
    if (ready && owner) void touch();
    const refresh = () => {
        if (!document.hidden && ready && owner) void touch();
      },
      tick = () => {
        const current = profileRef.current;
        if (
          !document.hidden &&
          ready &&
          owner &&
          (!current ||
            calendarDay(new Date(), current.timezone) !== current.today)
        )
          void touch();
      };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(tick, 60000);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [owner, ready, client]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
        if (!root.current?.contains(e.target as Node)) changeOpen(false);
      },
      escape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          changeOpen(false);
          trigger.current?.focus();
        }
      };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(() => {
    if (!open) {
      setCelebrating(false);
      setEditing(false);
    }
  }, [open]);
  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 2400);
    return () => clearTimeout(timer);
  }, [celebrating]);
  async function claim() {
    if (!owner || claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await client.rpc("claim_profile_flame", {
        p_owner: owner,
      });
      if (!alive.current) return;
      if (error) throw error;
      const result = data as FlameClaim;
      mutationVersion.current++;
      setProfile(result);
      setError("");
      if (result.celebrate && claimedDay.current !== result.today) {
        claimedDay.current = result.today;
        setCelebrating(openRef.current);
      }
    } catch {
      if (alive.current)
        setError("Unable to light your flame. Please reconnect and try again.");
    } finally {
      if (alive.current) setClaiming(false);
    }
  }
  function toggle() {
    const next = !open;
    changeOpen(next);
    if (next && owner) {
      const current = profileRef.current;
      if (
        !current ||
        !current.celebrated_today ||
        calendarDay(new Date(), current.timezone) !== current.today
      )
        void claim();
    }
  }
  const displayName =
    profile?.display_name ||
    (typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "") ||
    user?.email?.split("@")[0] ||
    "Guest";
  const today = profile?.today || calendarDay(new Date()),
    plan = planDay(progress.start, progress.weeks, today);
  return (
    <div className="user-profile" ref={root}>
      <button
        type="button"
        className="profile-trigger"
        ref={trigger}
        onClick={toggle}
        disabled={!ready}
        aria-label="Open your profile"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="learner-profile"
      >
        <span className="profile-avatar">{profileInitials(displayName)}</span>
        <span className="profile-trigger-copy">
          <b>{displayName}</b>
          <small>
            Day {plan.elapsed}/{plan.total}
          </small>
        </span>
        <span className="profile-mini-streak">
          <Flame lit={!!profile?.streak} />
          <b>{profile?.streak ?? 0}</b>
        </span>
        <span className="profile-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && (
        <section
          id="learner-profile"
          className="profile-popover"
          role="dialog"
          aria-labelledby="learner-profile-title"
        >
          <div className="profile-card-heading">
            <span className="eyebrow">YOUR LITTLE CORNER</span>
            <button
              type="button"
              className="profile-close"
              aria-label="Close profile"
              onClick={() => {
                changeOpen(false);
                trigger.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          <div className="profile-identity">
            <span className="profile-avatar large">
              {profileInitials(displayName)}
            </span>
            <div>
              <h2 id="learner-profile-title">{displayName}</h2>
              <small>
                {user
                  ? "A little practice, a little progress."
                  : "Find a study routine that works for you."}
              </small>
            </div>
            {user && (
              <button
                type="button"
                className="profile-edit"
                aria-label="Edit display name"
                onClick={() => {
                  setName(displayName);
                  setEditing(!editing);
                }}
              >
                ✎
              </button>
            )}
          </div>
          {editing && (
            <form
              className="profile-name-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!owner || saving) return;
                setSaving(true);
                mutationVersion.current++;
                try {
                  const { data, error } = await client.rpc(
                    "save_profile_name",
                    { p_name: name, p_owner: owner },
                  );
                  if (!alive.current) return;
                  if (error) throw error;
                  mutationVersion.current++;
                  setProfile(data as LearnerProfile);
                  setEditing(false);
                  setError("");
                } catch {
                  if (alive.current)
                    setError(
                      "Unable to save your name. Use 1–60 characters and try again.",
                    );
                } finally {
                  if (alive.current) setSaving(false);
                }
              }}
            >
              <label>
                Display name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  minLength={1}
                  required
                  autoComplete="nickname"
                />
              </label>
              <div>
                <button
                  className="primary"
                  type="submit"
                  disabled={saving || !name.trim()}
                >
                  {saving ? "Saving…" : "Save name"}
                </button>
                <button
                  className="text-btn"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="profile-plan">
            <div>
              <span>Your study plan</span>
              <strong>
                Day {plan.elapsed}
                <small> / {plan.total}</small>
              </strong>
            </div>
            <span className="profile-week-label">{progress.weeks} weeks</span>
            <progress
              aria-label="Days in your study plan"
              max={plan.total}
              value={Math.min(plan.elapsed, plan.total)}
            />
            <p>
              {plan.elapsed === 0
                ? "Your plan starts on your selected date."
                : plan.elapsed > plan.total
                  ? "Your planned study period is complete. Keep your routine going!"
                  : `${plan.total - plan.elapsed} ${plan.total - plan.elapsed === 1 ? "day" : "days"} left · ${progress.minutes} minutes a day`}
            </p>
          </div>
          <div
            className={
              "profile-streak-card" + (celebrating ? " flame-celebrating" : "")
            }
          >
            <div className="profile-fire-scene">
              <Flame lit={!!profile?.streak} />
              {celebrating && (
                <div className="flame-sparks" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <i
                      key={i}
                      style={{ "--spark": i } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className="eyebrow">LOGIN STREAK</span>
              <strong>
                {owner ? (profile ? profile.streak : "—") : 0}
                <small>
                  {profile?.streak === 1 ? " day in a row" : " days in a row"}
                </small>
              </strong>
              <p>
                {!owner
                  ? "Sign in to start your streak."
                  : celebrating
                    ? "Your flame is lit for today!"
                    : claiming
                      ? "Lighting your flame…"
                      : profile?.celebrated_today
                        ? "Your flame is lit. See you tomorrow!"
                        : "Every day you return is a step forward."}
              </p>
            </div>
          </div>
          {celebrating && (
            <span className="profile-celebration-message" role="status">
              🔥 Your flame is lit for today! {profile?.streak}{" "}
              {profile?.streak === 1 ? "day" : "days"} in a row.
            </span>
          )}
          {error && (
            <div className="profile-error" role="status">
              {error}
              <button
                type="button"
                className="text-btn"
                disabled={claiming}
                onClick={() => void claim()}
              >
                Try again
              </button>
            </div>
          )}
          <p className="profile-streak-note">
            Your streak counts each day you visit while signed in, using{" "}
            {profile?.timezone || "Asia/Ho_Chi_Minh"}. Missing a day restarts
            your streak at 1.
          </p>
          <div className="profile-card-links">
            <Link href="/settings" onClick={() => setOpen(false)}>
              Study settings <span>↗</span>
            </Link>
            {owner ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signout();
                    changeOpen(false);
                  } catch {
                    setError(
                      "Some progress is waiting to sync. Export a backup in Settings first.",
                    );
                  }
                }}
              >
                Sign out
              </button>
            ) : (
              <Link href="/" onClick={() => setOpen(false)}>
                Sign in / Sign up <span>→</span>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
