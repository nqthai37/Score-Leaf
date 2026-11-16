"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navigation, pageLabel } from "@/lib/navigation";
const icons: Record<string, string> = {
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  plan: "M4 5h16v16H4zM8 2v6M16 2v6M4 11h16M8 15h3M8 18h6",
  practice: "M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1zM12 5v15",
  tests: "M5 4h14v18H5zM9 2h6v4H9zM8 11h8M8 15h8M8 18h5",
  vocabulary: "M4 3h16v19H4zM8 16l4-9 4 9M9 13h6M8 19h8",
  review: "M4 7V3M4 7h4M4 7a9 9 0 1 1-1 8M12 7v5l3 2",
  progress: "M3 3v18h19M8 17v-5M13 17V7M18 17V4",
};
export function Navigation() {
  const pathname = usePathname(),
    [open, setOpen] = useState(false),
    toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return (
    <>
      <button
        ref={toggle}
        type="button"
        id="mobile-menu"
        aria-controls="sidebar"
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "×" : "☰"}
      </button>
      {open && (
        <button
          className="nav-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside id="sidebar" className={open ? "open" : ""}>
        <Link
          className="brand"
          href="/dashboard"
          onClick={() => setOpen(false)}
        >
          <img
            className="brand-logo"
            src="/branding/scoreleaf-logo.png"
            width={40}
            height={40}
            alt=""
            aria-hidden="true"
          />
          Score<span>Leaf</span>
        </Link>
        <div className="workspace-label">YOUR STUDY SPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/practice" && pathname.startsWith("/practice/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={icons[item.icon]} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-book">✦</div>
          <strong>Small steps. Real progress.</strong>
          <p>Your next opportunity starts with today’s practice.</p>
          <Link
            className="text-btn"
            href="/settings"
            onClick={() => setOpen(false)}
          >
            ⚙ Study preferences
          </Link>
        </div>
        <div className="profile">
          <span className="avatar">Y</span>
          <div>
            <b>Your learning journey</b>
            <small>Your personal study space</small>
          </div>
        </div>
      </aside>
    </>
  );
}
export function Breadcrumb() {
  const pathname = usePathname();
  return (
    <div className="breadcrumb">
      My workspace <span>/</span>
      <b>{pageLabel(pathname)}</b>
    </div>
  );
}
