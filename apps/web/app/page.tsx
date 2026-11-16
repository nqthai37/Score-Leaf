import { AuthPage } from "@/components/auth-page";
import { safeReturnPath } from "@/lib/auth-navigation";
export const metadata = {
  title: { absolute: "ScoreLeaf — Practice at your own pace" },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; signin?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      nextPath={safeReturnPath(params.next)}
      signInError={params.signin === "error"}
    />
  );
}
