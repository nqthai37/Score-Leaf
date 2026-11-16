import type { Question, History, Progress, Answer } from "../lib/learning";
type Group = {
  id: string;
  part: number;
  questions: Question[];
  seconds: number;
};
declare const domain: {
  accuracy: (answers: Answer[]) => number;
  evidenceHistory: (history: History[]) => History[];
  shuffle: <T>(values: T[], random?: () => number) => T[];
  prioritized: (
    pool: Question[],
    history: History[],
    random?: () => number,
  ) => Question[];
  groups: (pool: Question[]) => Group[];
  selectQuestions: (
    pool: Question[],
    count: number,
    history?: History[],
    options?: { balanced?: boolean; random?: () => number },
  ) => Question[];
  selectWithinBudget: (
    pool: Question[],
    seconds: number,
    history?: History[],
  ) => { groups: Group[]; estimated_seconds: number };
  performance: (
    history: History[],
    bank: Question[],
  ) => {
    parts: {
      part: number;
      count: number;
      accuracy: number;
      confidence: string;
    }[];
    first: { count: number; accuracy: number };
    repeats: { count: number; accuracy: number };
    skills: {
      id: string;
      attempts: number;
      wrong: number;
      confidence: string;
    }[];
  };
  reviewSchedule: (
    history: History[],
    bank: Question[],
    options?: { today?: string; timezone?: string },
  ) => {
    items: { id: number; due: string; stage: number }[];
    due: { id: number; due: string; stage: number }[];
    recall: { count: number; accuracy: number };
  };
  score: (questions: Question[], answers: Record<number, number>) => Answer[];
  validateBackup: (
    data: unknown,
    bank: Question[],
    vocabularyCount: number,
    currentVersion?: string | null,
  ) => Progress;
  mergeBackup: (
    current: Progress,
    incoming: Progress,
  ) => {
    state: Progress;
    added: number;
    duplicates: number;
    unverifiedAdded: number;
  };
};
export default domain;
