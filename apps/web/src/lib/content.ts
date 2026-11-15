import summary from "@/generated/content-summary.json";
export type PartSummary = Readonly<{ part: number; name: string; category: string; questions: number }>;
export type TestSummary = Readonly<{ id: number; title: string; topic: string; questions: number; minutes: number }>;
export type ContentSummary = Readonly<{ contentVersion: string; questions: number; groups: number; audio: number; tests: number; vocabulary: number; parts: readonly PartSummary[]; testLibrary: readonly TestSummary[] }>;
// Public inventory only. Question/answer and audio adapters follow in N2.
export const content: ContentSummary = summary;
