import type { Metadata, Viewport } from "next";
import "@/styles/legacy-main.css";
import "@/styles/legacy-library.css";
import "./globals.css";
import "@/styles/profile.css";
import { AppShell } from "@/components/app-shell";
import { StudyProvider } from "@/components/study-provider";
export const metadata: Metadata = {
  title: { default: "TOEIC Path", template: "%s · TOEIC Path" },
  description:
    "TOEIC practice for your next opportunity. Original questions, listening, spaced review and a personal study plan.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#174f46",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <StudyProvider>
          <AppShell>{children}</AppShell>
        </StudyProvider>
      </body>
    </html>
  );
}
