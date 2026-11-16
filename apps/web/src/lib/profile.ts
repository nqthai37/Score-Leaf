export type LearnerProfile = {
  display_name: string;
  timezone: string;
  today: string;
  streak: number;
  celebrated_today: boolean;
};
export type FlameClaim = LearnerProfile & { celebrate: boolean };
export function calendarDay(date: Date, timezone = "Asia/Ho_Chi_Minh") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function planDay(start: string, weeks: number, today: string) {
  const startTime = Date.parse(start.slice(0, 10) + "T00:00:00Z");
  const currentTime = Date.parse(today + "T00:00:00Z");
  const total = weeks * 7;
  const elapsed =
    Number.isFinite(startTime) && Number.isFinite(currentTime)
      ? Math.max(0, Math.floor((currentTime - startTime) / 86400000) + 1)
      : 0;
  return {
    elapsed,
    total,
    percent: Math.min(100, Math.round((elapsed / total) * 100)),
  };
}
export function profileInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((word) => [...word][0])
      .join("")
      .toLocaleUpperCase("vi") || "T"
  );
}
