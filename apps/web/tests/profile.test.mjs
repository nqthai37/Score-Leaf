import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const { outputFiles } = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/lib/profile.ts", import.meta.url)),
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { calendarDay, planDay, profileInitials } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
test("plan day uses inclusive calendar dates and the configured preparation length", () => {
  assert.deepEqual(planDay("2026-11-16T05:00:00Z", 8, "2026-11-16"), {
    elapsed: 1,
    total: 56,
    percent: 2,
  });
  assert.equal(planDay("2026-11-01", 4, "2026-11-16").elapsed, 16);
  assert.equal(planDay("2026-11-20", 12, "2026-11-16").elapsed, 0);
  assert.equal(planDay("2026-01-01", 4, "2026-11-16").percent, 100);
  assert.equal(planDay("2024-02-28", 4, "2024-03-01").elapsed, 3);
});
test("midnight is derived from the profile timezone, independently from UTC", () => {
  assert.equal(
    calendarDay(new Date("2026-11-15T17:01:00Z"), "Asia/Ho_Chi_Minh"),
    "2026-11-16",
  );
  assert.equal(
    calendarDay(new Date("2026-11-15T16:59:00Z"), "Asia/Ho_Chi_Minh"),
    "2026-11-15",
  );
});
test("avatar initials support Vietnamese names and blank display names", () => {
  assert.equal(profileInitials("Nguyễn Quốc Thái"), "QT");
  assert.equal(profileInitials("  Thái  "), "T");
  assert.equal(profileInitials(""), "T");
});
