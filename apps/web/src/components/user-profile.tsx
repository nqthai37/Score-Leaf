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
        setError("Chưa tải được hồ sơ. Vui lòng thử lại khi có mạng.");
        return;
      }
      setProfile(data as LearnerProfile);
      setError("");
    })()
      .catch(() => {
        if (alive.current) setError("Chưa thể kết nối hồ sơ.");
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
        setError("Chưa thể thắp lửa. Kết nối lại rồi thử lại nhé.");
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
    "Học thử";
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
        aria-label="Mở hồ sơ cá nhân"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="learner-profile"
      >
        <span className="profile-avatar">{profileInitials(displayName)}</span>
        <span className="profile-trigger-copy">
          <b>{displayName}</b>
          <small>
            Ngày {plan.elapsed}/{plan.total}
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
            <span className="eyebrow">GÓC NHỎ CỦA BẠN</span>
            <button
              type="button"
              className="profile-close"
              aria-label="Đóng hồ sơ"
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
                  ? "Học đều một chút, tiến xa mỗi ngày."
                  : "Khám phá lộ trình của riêng bạn."}
              </small>
            </div>
            {user && (
              <button
                type="button"
                className="profile-edit"
                aria-label="Sửa tên hiển thị"
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
                      "Chưa lưu được tên. Dùng từ 1–60 ký tự và thử lại.",
                    );
                } finally {
                  if (alive.current) setSaving(false);
                }
              }}
            >
              <label>
                Tên hiển thị
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
                  {saving ? "Đang lưu…" : "Lưu tên"}
                </button>
                <button
                  className="text-btn"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
          <div className="profile-plan">
            <div>
              <span>Lộ trình của bạn</span>
              <strong>
                Ngày {plan.elapsed}
                <small> / {plan.total}</small>
              </strong>
            </div>
            <span className="profile-week-label">{progress.weeks} tuần</span>
            <progress
              aria-label="Số ngày trong lộ trình"
              max={plan.total}
              value={Math.min(plan.elapsed, plan.total)}
            />
            <p>
              {plan.elapsed === 0
                ? "Lộ trình sẽ bắt đầu vào ngày bạn đã chọn."
                : plan.elapsed > plan.total
                  ? "Bạn đã đi hết thời gian dự kiến. Tiếp tục giữ thói quen nhé!"
                  : `${plan.total - plan.elapsed} ngày còn lại · ${progress.minutes} phút mỗi ngày`}
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
              <span className="eyebrow">CHUỖI ĐĂNG NHẬP</span>
              <strong>
                {owner ? (profile ? profile.streak : "—") : 0}
                <small> ngày liên tiếp</small>
              </strong>
              <p>
                {!owner
                  ? "Đăng nhập để bắt đầu giữ lửa."
                  : celebrating
                    ? "Đã thắp lửa hôm nay!"
                    : claiming
                      ? "Đang thắp lửa…"
                      : profile?.celebrated_today
                        ? "Lửa hôm nay đã sáng. Hẹn bạn ngày mai!"
                        : "Mỗi ngày quay lại là một bước tiến."}
              </p>
            </div>
          </div>
          {celebrating && (
            <span className="profile-celebration-message" role="status">
              🔥 Đã thắp lửa hôm nay! {profile?.streak} ngày liên tiếp.
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
                Thử lại
              </button>
            </div>
          )}
          <p className="profile-streak-note">
            Streak tính mỗi ngày bạn vào app khi đã đăng nhập, theo{" "}
            {profile?.timezone || "Asia/Ho_Chi_Minh"}. Bỏ lỡ một ngày sẽ bắt đầu
            lại từ 1.
          </p>
          <div className="profile-card-links">
            <Link href="/settings" onClick={() => setOpen(false)}>
              Cài đặt lộ trình <span>↗</span>
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
                      "Còn tiến độ chờ đồng bộ. Hãy xuất backup trong Cài đặt trước.",
                    );
                  }
                }}
              >
                Đăng xuất
              </button>
            ) : (
              <Link href="/" onClick={() => setOpen(false)}>
                Đăng nhập / Đăng ký <span>→</span>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
