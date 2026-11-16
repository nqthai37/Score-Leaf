import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Progress,
  Checkpoint,
  History,
  Snapshot,
  Feedback,
} from "../lib/learning";
type Segment = { id: string; start: string; end: string; milliseconds: number };
export type Repository = {
  signIn: (email: string, redirect: string) => Promise<unknown>;
  signOut: () => Promise<unknown>;
  load: (
    id: string,
  ) => Promise<{
    state: Progress;
    session: Checkpoint | null;
    revision: number;
    updated_at: string;
  } | null>;
  save: (
    state: Progress,
    session: Checkpoint | null,
    revision: number,
    owner: string,
  ) => Promise<{ revision: number }>;
  beginPractice: (options: {
    ids: number[];
    key: string;
    mode: string;
    testId: number | null;
    kind: string;
    ownerId: string;
  }) => Promise<Snapshot>;
  savePracticeAnswer: (
    attempt: string,
    id: number,
    choice: number,
    revision: number,
  ) => Promise<number>;
  gradePracticeAnswer: (attempt: string, id: number) => Promise<Feedback>;
  practiceSnapshot: (id: string) => Promise<Snapshot>;
  completePractice: (id: string) => Promise<Snapshot>;
  claimActivity: (
    attempt: string,
    source: string,
  ) => Promise<{ owned: boolean; server_now: string; expires_at?: string }>;
  recordActivity: (
    attempt: string,
    source: string,
    segment: Segment,
  ) => Promise<{ id: string; milliseconds: number }>;
  releaseActivity: (attempt: string, source: string) => Promise<void>;
  activityDays: (timezone: string) => Promise<Record<string, number>>;
  openPractices: () => Promise<{ id: string; session_name: string }[]>;
  practiceHistory: () => Promise<History[]>;
  reviewItems: () => Promise<{ question_id: number }[]>;
};
export function createCloudRepository(client: SupabaseClient): Repository;
export function createProgressSync(options: {
  repository: Repository;
  revision?: number;
  userId?: string | null;
  sameProgress?: (payload: unknown, remote: unknown) => boolean;
  onStatus?: (status: string) => void;
  onCommit?: (revision: number, pending: boolean) => void;
}): {
  readonly revision: number;
  readonly pending: boolean;
  enqueue: (state: Progress, session: Checkpoint | null) => void;
  close: () => void;
  flush: () => Promise<boolean>;
};
