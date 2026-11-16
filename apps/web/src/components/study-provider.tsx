"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl, authOriginRedirect } from "@/lib/site-url";
import {
  createCloudRepository,
  createProgressSync,
} from "@/generated/repository.js";
import domain from "@/generated/core.js";
import {
  bank,
  vocabulary,
  metadata,
  initialProgress,
  readLocal,
  writeLocal,
  timezone,
  type Progress,
  type Checkpoint,
  type History,
} from "@/lib/learning";
type Repository = ReturnType<typeof createCloudRepository>;
type Study = {
  ready: boolean;
  user: User | null;
  progress: Progress;
  checkpoint: Checkpoint | null;
  days: Record<string, number>;
  open: { id: string; session_name: string }[];
  status: string;
  notice: string;
  repo: Repository;
  storageKey: string;
  update: (fn: (s: Progress) => Progress) => void;
  saveCheckpoint: (c: Checkpoint | null) => void;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  addHistory: (h: History) => void;
  setNotice: (s: string) => void;
  setDays: (fn: (d: Record<string, number>) => Record<string, number>) => void;
  signin: (email: string) => Promise<void>;
  signout: () => Promise<void>;
  flush: () => Promise<boolean>;
};
const Context = createContext<Study | null>(null);
export const useStudy = () => {
  const value = useContext(Context);
  if (!value) throw Error("StudyProvider is required");
  return value;
};
export function StudyProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createClient),
    [repo] = useState(() => createCloudRepository(client));
  const [ready, setReady] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [progress, setProgress] = useState(initialProgress),
    [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null),
    [days, setDays] = useState<Record<string, number>>({}),
    [open, setOpen] = useState<Study["open"]>([]),
    [status, setStatus] = useState("Saved on this device"),
    [notice, setNotice] = useState("");
  const scope = useRef({
    epoch: 0,
    owner: null as string | null,
    key: "toeic-path-v1",
    ready: false,
  });
  const stateRef = useRef(progress),
    cpRef = useRef(checkpoint),
    syncRef = useRef<ReturnType<typeof createProgressSync> | null>(null),
    dirty = useRef(false),
    revisionCache = useRef(0);
  stateRef.current = progress;
  cpRef.current = checkpoint;
  const storageKey = user ? "toeic-path-user-" + user.id : "toeic-path-v1";
  function checkpointKey(key: string) {
    return key === "toeic-path-v1" ? "toeic-path-session-v1" : key + "-session";
  }
  function persist(next: Progress, cp: Checkpoint | null) {
    try {
      writeLocal(scope.current.key, next);
      writeLocal(checkpointKey(scope.current.key), cp);
      writeLocal(scope.current.key + "-sync", {
        dirty: dirty.current,
        revision: syncRef.current?.revision ?? revisionCache.current,
      });
    } catch {
      setNotice(
        "Device storage is full or unavailable. Export a backup from Settings.",
      );
    }
  }
  function queue(next: Progress, cp: Checkpoint | null) {
    dirty.current = true;
    persist(next, cp);
    if (scope.current.ready && syncRef.current) {
      syncRef.current.enqueue(next, cp);
      void syncRef.current.flush();
    }
  }
  function update(fn: (s: Progress) => Progress) {
    if (!scope.current.ready) return;
    const next = fn(stateRef.current);
    stateRef.current = next;
    setProgress(next);
    queue(next, cpRef.current);
  }
  function saveCheckpoint(cp: Checkpoint | null) {
    if (!scope.current.ready) return;
    cpRef.current = cp;
    setCheckpoint(cp);
    queue(stateRef.current, cp);
  }
  async function refresh() {
    const { owner, epoch } = scope.current;
    if (!owner) return;
    const [history, attempts, active] = await Promise.all([
      repo.practiceHistory(),
      repo.openPractices(),
      repo.activityDays(timezone()),
    ]);
    if (epoch !== scope.current.epoch) return;
    const verified = history as History[];
    const ids = new Set(verified.map((h) => h.attemptId));
    const merged = [
      ...stateRef.current.history.filter((h) => !ids.has(h.attemptId)),
      ...verified,
    ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const latest = new Map<number, boolean>();
    for (const h of domain.evidenceHistory(merged))
      for (const a of h.answers) latest.set(a.id, a.correct);
    const next = {
      ...stateRef.current,
      history: merged,
      mistakes: [...latest].filter(([, right]) => !right).map(([id]) => id),
    };
    stateRef.current = next;
    setProgress(next);
    persist(next, cpRef.current);
    setOpen(attempts);
    setDays(active || {});
  }
  async function activate(nextUser: User | null, force = false) {
    if (
      !force &&
      scope.current.ready &&
      scope.current.owner === (nextUser?.id ?? null)
    )
      return;
    syncRef.current?.close();
    syncRef.current = null;
    const epoch = ++scope.current.epoch;
    scope.current.ready = false;
    setReady(false);
    setUser(nextUser);
    setOpen([]);
    setDays({});
    setNotice("");
    const key = nextUser ? "toeic-path-user-" + nextUser.id : "toeic-path-v1";
    scope.current = { epoch, owner: nextUser?.id ?? null, key, ready: false };
    let local = readLocal<Progress>(key, initialProgress());
    try {
      const checked = domain.validateBackup(
        { app: "toeic-path", version: 1, state: local },
        bank,
        vocabulary.length,
        metadata.content_version,
      );
      local = { ...local, ...checked, history: checked.history };
    } catch {
      local = initialProgress();
    }
    let cp = readLocal<Checkpoint | null>(checkpointKey(key), null);
    const meta = readLocal(key + "-sync", { dirty: false, revision: 0 });
    dirty.current = meta.dirty;
    revisionCache.current = meta.revision;
    stateRef.current = local;
    cpRef.current = cp;
    setProgress(local);
    setCheckpoint(cp);
    setDays(readLocal(key + "-active-days", {}));
    if (nextUser) {
      try {
        const remote = await repo.load(nextUser.id);
        if (epoch !== scope.current.epoch) return;
        if (remote && !meta.dirty) {
          local = {
            ...initialProgress(),
            ...domain.validateBackup(
              { app: "toeic-path", version: 1, state: remote.state },
              bank,
              vocabulary.length,
              metadata.content_version,
            ),
          };
          cp = remote.session;
          stateRef.current = local;
          cpRef.current = cp;
          setProgress(local);
          setCheckpoint(cp);
        }
        const revision = remote?.revision ?? 0;
        syncRef.current = createProgressSync({
          repository: repo,
          userId: nextUser.id,
          revision: meta.dirty ? meta.revision : revision,
          onStatus: (value: string) => {
            if (epoch === scope.current.epoch)
              setStatus(
                (
                  {
                    saved: "Saved to cloud",
                    saving: "Saving to cloud…",
                    pending: "Waiting to sync",
                    error: "Offline — saved on this device",
                    conflict: "Cloud conflict — export backup and load latest",
                  } as Record<string, string>
                )[value] || value,
              );
          },
          onCommit: (revision: number, pending: boolean) => {
            if (epoch !== scope.current.epoch) return;
            revisionCache.current = revision;
            dirty.current = pending;
            persist(stateRef.current, cpRef.current);
          },
        });
        setStatus("Saved to cloud");
      } catch {
        if (epoch !== scope.current.epoch) return;
        setStatus("Cloud unavailable — local cache only");
        setNotice(
          "Cloud could not load. Use Reload cloud when you are back online.",
        );
      }
    } else setStatus("Saved on this device");
    if (epoch !== scope.current.epoch) return;
    scope.current.ready = true;
    setReady(true);
    persist(local, cp);
    if (nextUser && syncRef.current) {
      if (meta.dirty) {
        syncRef.current.enqueue(local, cp);
        void syncRef.current.flush();
      }
      try {
        await refresh();
      } catch {
        if (epoch === scope.current.epoch)
          setNotice("Practice history could not refresh. Retry when online.");
      }
    }
  }
  useEffect(() => {
    let alive = true;
    void client.auth.getUser().then(({ data }) => {
      if (alive) void activate(data.user);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (alive)
        setTimeout(() => {
          if (alive) void activate(session?.user ?? null);
        }, 0);
    });
    const online = () => {
      if (syncRef.current) void syncRef.current.flush();
      void refresh().catch(() => {});
    };
    window.addEventListener("online", online);
    return () => {
      alive = false;
      scope.current.epoch++;
      scope.current.ready = false;
      syncRef.current?.close();
      data.subscription.unsubscribe();
      window.removeEventListener("online", online);
    };
  }, [client]);
  async function reload() {
    try {
      writeLocal(scope.current.key + "-before-reload", {
        state: stateRef.current,
        session: cpRef.current,
      });
      writeLocal(scope.current.key + "-sync", { dirty: false, revision: 0 });
      await activate(user, true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to reload");
    }
  }
  function addHistory(h: History) {
    update((s) => {
      if (s.history.some((item) => item.attemptId === h.attemptId)) return s;
      const latest = new Set(s.mistakes);
      for (const a of h.answers) {
        if (a.correct) latest.delete(a.id);
        else latest.add(a.id);
      }
      return { ...s, history: [...s.history, h], mistakes: [...latest] };
    });
  }
  const value: Study = {
    ready,
    user,
    progress,
    checkpoint,
    days,
    open,
    status,
    notice,
    repo,
    storageKey,
    update,
    saveCheckpoint,
    refresh,
    reload,
    addHistory,
    setNotice,
    setDays,
    signin: async (email) => {
      const destination = authOriginRedirect(location.origin, "/settings");
      if (destination) {
        window.location.assign(destination);
        return;
      }
      await repo.signIn(email, authCallbackUrl(location.origin, "/settings"));
      setNotice("Check your email. Open the sign-in link in this browser.");
    },
    signout: async () => {
      if (syncRef.current?.pending && !(await syncRef.current.flush()))
        throw Error("Sync is pending. Export your backup before signing out.");
      await repo.signOut();
      await activate(null);
    },
    flush: () => syncRef.current?.flush() ?? Promise.resolve(false),
  };
  return (
    <Context.Provider value={value}>
      {notice && (
        <div role="status" className="app-notice">
          {notice}
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
