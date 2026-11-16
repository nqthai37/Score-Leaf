"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { isProtectedPath, signInPath } from "@/lib/auth-navigation";
import { Navigation, Breadcrumb } from "./navigation";
import { useStudy } from "./study-provider";
import { UserProfile } from "./user-profile";
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { ready, user } = useStudy(),
    router = useRouter();
  useEffect(() => {
    if (ready && !user && isProtectedPath(path))
      router.replace(signInPath(path + window.location.search));
  }, [ready, user, path, router]);
  if (path === "/" || path === "/login")
    return (
      <main className="auth-main" id="main-content">
        {children}
      </main>
    );
  if (!isProtectedPath(path)) return <main id="main-content">{children}</main>;
  // Hide both the cached page and navigation immediately after sign-out or expiry.
  if (!ready || !user)
    return (
      <main id="main-content">
        <p role="status">
          {ready ? "Redirecting to sign in…" : "Checking your session…"}
        </p>
      </main>
    );
  return (
    <>
      <Navigation />
      <div className="shell">
        <header>
          <Breadcrumb />
          <UserProfile key={user?.id ?? "guest"} />
        </header>
        <main id="main-content">
          {ready ? children : <p role="status">Loading your study space…</p>}
        </main>
        <footer>
          Made for your next chapter.
          <span>Independent practice · Not affiliated with ETS</span>
        </footer>
      </div>
    </>
  );
}
