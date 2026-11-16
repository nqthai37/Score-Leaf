import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Quiz } from "@/components/quiz";
export const dynamic = "force-dynamic";
export const metadata = { title: "Saved practice" };
export default async function Page({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      attemptId,
    )
  )
    notFound();
  return (
    <Suspense fallback={<p>Loading practice…</p>}>
      <Quiz attemptId={attemptId} />
    </Suspense>
  );
}
