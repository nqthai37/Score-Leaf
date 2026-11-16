import data from "@/generated/learning.json";
export type Question = {
  id: number;
  part: number;
  prompt: string;
  options: string[];
  answer?: number;
  explanation?: string;
  audio?: string;
  audio_asset_id?: string;
  passage?: string;
  scene?: string;
  group_id: string;
  content_version: string;
  skill_tags: string[];
  metadata_status: string;
  estimated_seconds?: number;
  group_estimated_seconds?: number;
};
export type Answer = { id: number; chosen: number | null; correct: boolean };
export type History = {
  attemptId?: string;
  date: string;
  name: string;
  seconds: number;
  answers: Answer[];
  source?: string;
  assessment?: string;
  server_graded?: boolean;
  content_version?: string;
  setId?: number | null;
  time_source?: string;
  legacy_seconds?: number;
};
export type Progress = {
  weeks: number;
  target: number;
  minutes: number;
  start: string;
  history: History[];
  mistakes: number[];
  unverified_mistakes: number[];
  known: number[];
  vocabDays: string[];
};
export type Checkpoint = {
  version: number;
  contentVersion: string;
  id: string;
  kind: string;
  name: string;
  questionIds: number[];
  index: number;
  answers: Record<number, number>;
  checked: boolean;
  start: number;
  limit: number;
  deadline: number | null;
  activeMilliseconds: number;
  setId: number | null;
  remote: {
    id: string;
    ownerId: string;
    revision: number;
    pending: Record<number, number>;
  } | null;
};
export type Feedback = {
  question_id: number;
  answer: number;
  correct: boolean;
  explanation: string;
};
export type Snapshot = {
  attempt: {
    id: string;
    user_id: string;
    mode: string;
    status: string;
    kind: string;
    session_name: string;
    revision: number;
    started_at: string;
    expires_at: string | null;
    test_id: number | null;
  };
  server_now: string;
  questions: {
    question_id: number;
    content_version: string;
    snapshot: Question;
  }[];
  answers: Record<number, number>;
  checked: number[];
  feedback: Feedback[];
  result: { correct: number; total: number; accuracy: number } | null;
  active_seconds: number;
};
export const bank = data.bank as Question[];
export const scenes = data.scenes as Record<string, string>;
export const tests = data.tests;
export const vocabulary = data.vocabulary;
export const metadata = data.metadata;
export const recordings = data.recordings;
export const timezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
export const day = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const initialProgress = (): Progress => ({
  weeks: 8,
  target: 750,
  minutes: 45,
  start: new Date().toISOString(),
  history: [],
  mistakes: [],
  unverified_mistakes: [],
  known: [],
  vocabDays: [],
});
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function validCheckpoint(
  value: Checkpoint | null,
  history: History[],
): Checkpoint | null {
  if (
    !value ||
    value.version !== 1 ||
    value.contentVersion !== metadata.content_version ||
    typeof value.name !== "string" ||
    !Array.isArray(value.questionIds) ||
    !value.questionIds.length ||
    new Set(value.questionIds).size !== value.questionIds.length ||
    value.questionIds.some((id) => !bank.some((q) => q.id === id)) ||
    !Number.isInteger(value.index) ||
    value.index < 0 ||
    value.index >= value.questionIds.length ||
    !value.answers ||
    history.some((h) => h.attemptId === value.id)
  )
    return null;
  if (
    !Number.isFinite(value.start) ||
    !Number.isFinite(value.limit) ||
    value.limit < 0 ||
    value.limit > 86400 ||
    (value.limit && value.deadline !== value.start + value.limit * 1000)
  )
    return null;
  if (
    Object.entries(value.answers).some(
      ([id, choice]) =>
        !value.questionIds.includes(Number(id)) ||
        !Number.isInteger(choice) ||
        choice < 0 ||
        choice >= bank.find((q) => q.id === Number(id))!.options.length,
    )
  )
    return null;
  return value;
}
