import { Suspense } from "react";
import { Quiz } from "@/components/quiz";
export const metadata = { title: "Practice session" };
export default function Page() {
  return (
    <Suspense fallback={<p>Loading practice…</p>}>
      <Quiz />
    </Suspense>
  );
}
