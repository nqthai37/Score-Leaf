"use client";
import { useEffect, useRef } from "react";
import {
  createActivityClock,
  splitActivityDays,
} from "@/generated/activity.js";
import { readLocal, writeLocal, timezone } from "@/lib/learning";
import { useStudy } from "./study-provider";
type Segment = { id: string; start: string; end: string; milliseconds: number };
type Outbox = { source: string; segments: Segment[] };
export function useStudyActivity(
  id: string | null,
  remoteId: string | null,
  deadline: number | null,
  onTime: (milliseconds: number) => void,
) {
  const study = useStudy(),
    current = useRef(study),
    time = useRef(onTime),
    stopRef = useRef<() => Promise<void>>(async () => {});
  current.current = study;
  time.current = onTime;
  useEffect(() => {
    if (!id || !study.ready) return;
    const owner = study.user?.id || null,
      key = study.storageKey,
      repo = study.repo,
      source = crypto.randomUUID();
    let closed = false,
      owned = false,
      leaseUntil = 0,
      claiming = false,
      flushing: Promise<void> | null = null;
    const outKey = key + "-activity-outbox-" + (remoteId || id),
      stored = readLocal<Outbox[] | Outbox>(outKey, []),
      outbox: Outbox[] = Array.isArray(stored)
        ? stored
        : stored?.source
          ? [stored]
          : [];
    let nowBase = Date.now(),
      monoBase = performance.now();
    const isCurrent = () =>
      current.current.user?.id === owner || (!owner && !current.current.user);
    function persist() {
      try {
        writeLocal(outKey, outbox);
      } catch {
        if (isCurrent())
          current.current.setNotice(
            "Activity could not be saved on this device.",
          );
      }
    }
    async function flush() {
      if (flushing) return flushing;
      let complete = false;
      flushing = (async () => {
        if (!remoteId) return;
        for (const box of outbox) {
          while (box.segments.length) {
            const segment = box.segments[0];
            try {
              const ack = await repo.recordActivity(
                remoteId,
                box.source,
                segment,
              );
              if (ack?.id !== segment.id)
                throw Error("Activity acknowledgement missing");
              box.segments.shift();
              persist();
            } catch (error) {
              const terminal =
                error instanceof Error &&
                /Activity source changed|Attempt closed|Invalid or overlapping/.test(
                  error.message,
                );
              if (terminal) {
                writeLocal(outKey + "-unaccepted-" + box.source, box);
                box.segments = [];
                persist();
                if (isCurrent())
                  current.current.setNotice(
                    "Earlier study time could not sync. A local backup was kept; those minutes are excluded from the daily goal.",
                  );
                break;
              }
              if (isCurrent() && !closed)
                current.current.setNotice(
                  "Some study time is pending sync. It is saved on this device.",
                );
              return;
            }
          }
        }
        complete = true;
        if (isCurrent()) {
          try {
            const days = await repo.activityDays(timezone());
            if (isCurrent()) current.current.setDays(() => days || {});
          } catch {}
        }
      })().finally(() => {
        flushing = null;
        if (complete && !closed && outbox.some((box) => box.segments.length))
          void flush();
      });
      return flushing;
    }
    async function claim() {
      if (claiming || closed) return;
      if (!remoteId) {
        const leaseKey = key + "-activity-lease",
          previous = readLocal<{ source: string; until: number } | null>(
            leaseKey,
            null,
          );
        owned =
          !previous ||
          previous.source === source ||
          previous.until <= Date.now();
        if (owned) {
          writeLocal(leaseKey, { source, until: Date.now() + 45000 });
          leaseUntil = performance.now() + 40000;
        }
        return;
      }
      claiming = true;
      try {
        await flush();
        const lease = await repo.claimActivity(remoteId, source);
        if (closed) {
          if (lease.owned) await repo.releaseActivity(remoteId, source);
          return;
        }
        owned = lease.owned;
        nowBase = Date.parse(lease.server_now);
        monoBase = performance.now();
        leaseUntil = lease.owned ? performance.now() + 40000 : 0;
        if (!lease.owned && isCurrent())
          current.current.setNotice(
            "Study time is being recorded in another tab. This tab can still save answers.",
          );
      } catch {
        owned = false;
      } finally {
        claiming = false;
      }
    }
    const meter = createActivityClock({
      now: () => performance.now(),
      wallNow: () => nowBase,
      id: () => crypto.randomUUID(),
      onSegment: (raw: Segment) => {
        const segment = { ...raw };
        if (deadline) {
          const end = Math.min(Date.parse(segment.end), deadline),
            start = Date.parse(segment.start);
          if (end <= start) return;
          segment.end = new Date(end).toISOString();
          segment.milliseconds = end - start;
        }
        if (!isCurrent()) return;
        time.current(segment.milliseconds);
        if (remoteId) {
          let box = outbox.find((b) => b.source === source);
          if (!box) {
            box = { source, segments: [] };
            outbox.push(box);
          }
          box.segments.push(segment);
          persist();
          void flush();
        } else {
          const additions = splitActivityDays([segment], timezone());
          current.current.setDays((previous) => {
            const next = { ...previous };
            for (const [date, seconds] of Object.entries(additions))
              next[date] = (next[date] || 0) + (seconds as number);
            try {
              writeLocal(key + "-active-days", next);
            } catch {}
            return next;
          });
        }
      },
    });
    meter.setVisible(false);
    // A signed-in clock starts only after the server grants the account lease.
    let remoteMeter: ReturnType<typeof createActivityClock> | null = null;
    async function initialize() {
      if (remoteId) {
        await claim();
        if (!closed) {
          remoteMeter = createActivityClock({
            now: () => performance.now(),
            wallNow: () => nowBase + (performance.now() - monoBase),
            id: () => crypto.randomUUID(),
            onSegment: (segment: Segment) => {
              if (!isCurrent()) return;
              const end = deadline
                ? Math.min(Date.parse(segment.end), deadline)
                : Date.parse(segment.end);
              if (end <= Date.parse(segment.start)) return;
              segment = {
                ...segment,
                end: new Date(end).toISOString(),
                milliseconds: end - Date.parse(segment.start),
              };
              time.current(segment.milliseconds);
              let box = outbox.find((b) => b.source === source);
              if (!box) {
                box = { source, segments: [] };
                outbox.push(box);
              }
              box.segments.push(segment);
              persist();
              void flush();
            },
          });
          remoteMeter.setVisible(false);
        }
      }
    }
    if (!remoteId) void claim();
    void initialize();
    const clock = () => (remoteId ? remoteMeter : meter);
    const step = () => {
      const audio =
        document.querySelector<HTMLAudioElement>("audio[data-study]");
      const localLease = remoteId
        ? null
        : readLocal<{ source: string; until: number } | null>(
            key + "-activity-lease",
            null,
          );
      const active =
        !document.hidden &&
        owned &&
        performance.now() < leaseUntil &&
        (!!remoteId ||
          (localLease?.source === source && localLease.until > Date.now()));
      clock()?.setVisible(active);
      clock()?.setListening(
        active &&
          !!audio &&
          !audio.paused &&
          !audio.ended &&
          audio.readyState >= 3,
      );
      clock()?.tick();
    };
    const interact = () => {
      if (!document.hidden) clock()?.interact();
    };
    const visibility = () => step();
    document.addEventListener("pointerdown", interact);
    document.addEventListener("keydown", interact);
    document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(step, 1000),
      renew = setInterval(() => {
        if (!document.hidden) void claim();
      }, 15000);
    async function stop() {
      clock()?.stop();
      await flush();
      if (!remoteId) {
        const lease = readLocal<{ source: string } | null>(
          key + "-activity-lease",
          null,
        );
        if (lease?.source === source)
          localStorage.removeItem(key + "-activity-lease");
      }
      if (remoteId && owned) {
        owned = false;
        await repo.releaseActivity(remoteId, source).catch(() => {});
      }
    }
    stopRef.current = stop;
    const hide = () => {
      void stop();
    };
    window.addEventListener("pagehide", hide);
    return () => {
      closed = true;
      clearInterval(timer);
      clearInterval(renew);
      clock()?.stop();
      document.removeEventListener("pointerdown", interact);
      document.removeEventListener("keydown", interact);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      if (!remoteId) {
        const lease = readLocal<{ source: string } | null>(
          key + "-activity-lease",
          null,
        );
        if (lease?.source === source)
          localStorage.removeItem(key + "-activity-lease");
      }
      void flush()
        .then(() => {
          if (remoteId && owned) return repo.releaseActivity(remoteId, source);
        })
        .catch(() => {});
    };
  }, [id, remoteId, study.user?.id, study.ready, study.storageKey, deadline]);
  return () => stopRef.current();
}
