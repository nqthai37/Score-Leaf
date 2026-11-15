export const CURRENT_SITE = "https://nqthai37.github.io/toeic-path/";
export const navigation = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/plan", label: "My study plan", icon: "plan" },
  { href: "/practice", label: "Practice by part", icon: "practice" },
  { href: "/tests", label: "Practice tests", icon: "tests" },
  { href: "/vocabulary", label: "Vocabulary", icon: "vocabulary" },
  { href: "/review", label: "Mistake notebook", icon: "review" },
  { href: "/progress", label: "My progress", icon: "progress" },
] as const;
export function pageLabel(pathname: string): string {
  if (pathname.startsWith("/practice/")) return "Practice session";
  return navigation.find(item => item.href === pathname)?.label ?? (pathname === "/settings" ? "Study preferences" : "Your study space");
}
