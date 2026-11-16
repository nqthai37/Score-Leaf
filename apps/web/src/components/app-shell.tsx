"use client";
import { usePathname } from "next/navigation";
import { Navigation, Breadcrumb } from "./navigation";
import { useStudy } from "./study-provider";
import { UserProfile } from "./user-profile";
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { ready, user } = useStudy();
  if (path === "/" || path === "/login")
    return (
      <main className="auth-main" id="main-content">
        {children}
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
