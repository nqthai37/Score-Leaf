"use client";
import { usePathname } from "next/navigation";
import { Navigation, Breadcrumb } from "./navigation";
import { useStudy } from "./study-provider";
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { ready } = useStudy();
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
          <span className="header-note">
            <i />A little better, every day
          </span>
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
