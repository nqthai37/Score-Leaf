import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import domain from "../src/generated/core.js";
import { createDailyPractice } from "../src/generated/daily-plan.js";
import { createAnswerQueue } from "../src/generated/answer-queue.js";
import { createActivityClock } from "../src/generated/activity.js";
const data = JSON.parse(
  await readFile(
    new URL("../src/generated/learning.json", import.meta.url),
    "utf8",
  ),
);
test("the React app preserves the original domain and ordered-write implementations", async () => {
  for (const [name, exports] of [
    ["core", "default ToeicDomain"],
    ["daily-plan", "{createDailyPractice}"],
    ["activity", "{createActivityClock,activityDay,splitActivityDays}"],
    ["answer-queue", "{createAnswerQueue}"],
  ]) {
    let original = await readFile(
      new URL("../../../src/domain/" + name + ".js", import.meta.url),
      "utf8",
    );
    original = original.replace(/^if\(typeof module[^\n]*$/m, "");
    if (name === "daily-plan")
      original =
        "import ToeicDomain from './core.js';\n" +
        original.replace(
          "typeof ToeicDomain!=='undefined'?ToeicDomain:require('./core.js')",
          "ToeicDomain",
        );
    const actual = await readFile(
      new URL("../src/generated/" + name + ".js", import.meta.url),
      "utf8",
    );
    assert.equal(actual, original + "\nexport " + exports + ";\n", name);
  }
});
const { outputFiles } = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/lib/learning.ts", import.meta.url)),
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { initialProgress, validCheckpoint } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
test("all published recordings retain their content hashes", async () => {
  for (const asset of data.metadata.audio) {
    const bytes = await readFile(
      new URL("../public/" + asset.src, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
      asset.id,
    );
  }
});
test("Next session plans and review selection keep shared question groups intact", () => {
  const plan = createDailyPractice({
    bank: data.bank,
    history: [],
    mistakes: [],
    minutes: 20,
    today: "2026-11-16",
    activeDays: {},
  });
  assert.ok(plan.questionIds.length >= 7);
  for (const q of data.bank.filter((q) => plan.questionIds.includes(q.id)))
    assert.ok(
      data.bank
        .filter((x) => x.group_id === q.group_id)
        .every((x) => plan.questionIds.includes(x.id)),
    );
  assert.ok(plan.estimated_seconds <= 1200);
  const done = createDailyPractice({
    bank: data.bank,
    history: [],
    mistakes: [],
    minutes: 20,
    today: "2026-11-16",
    activeDays: { "2026-11-16": 1200 },
  });
  assert.equal(done.status, "goal-complete");
});
test("legacy compatible imports recalculate answers and cannot forge cloud trust", () => {
  const q = data.bank[0],
    state = {
      ...initialProgress(),
      history: [
        {
          date: "2026-11-15T12:00:00Z",
          name: "Imported",
          seconds: 100,
          content_version: data.metadata.content_version,
          server_graded: true,
          source: "server_practice",
          answers: [{ id: q.id, chosen: q.answer, correct: false }],
        },
      ],
    };
  const imported = domain.validateBackup(
    { app: "toeic-path", version: 1, state },
    data.bank,
    24,
    data.metadata.content_version,
  );
  assert.equal(imported.history[0].server_graded, false);
  assert.equal(imported.history[0].answers[0].correct, true);
  assert.equal(imported.history[0].time_source, "legacy_estimate");
  assert.equal(domain.mergeBackup(imported, imported).added, 0);
});
test("checkpoints retain deadlines and reject invalid answer values and completed sessions", () => {
  const cp = {
    version: 1,
    contentVersion: data.metadata.content_version,
    id: "local-test",
    name: "Practice",
    questionIds: [1],
    index: 0,
    answers: { 1: 0 },
    checked: true,
    start: 1000,
    limit: 60,
    deadline: 61000,
    remote: null,
  };
  assert.equal(validCheckpoint(cp, []).deadline, 61000);
  assert.equal(validCheckpoint({ ...cp, deadline: 62000 }, []), null);
  assert.equal(validCheckpoint({ ...cp, answers: { 1: 100 } }, []), null);
  assert.equal(validCheckpoint(cp, [{ attemptId: "local-test" }]), null);
});
test("network answer retries keep pending choices and advance only on acknowledgement", async () => {
  let online = false;
  const writes = [];
  const queue = createAnswerQueue({
    save: async (id, choice, revision) => {
      if (!online) throw Error("offline");
      writes.push([id, choice, revision]);
      return revision + 1;
    },
  });
  queue.enqueue(1, 0);
  assert.equal(await queue.flush(), false);
  queue.enqueue(1, 2);
  online = true;
  assert.equal(await queue.flush(), true);
  assert.deepEqual(writes, [[1, 2, 0]]);
  assert.equal(queue.size, 0);
  assert.equal(queue.revision, 1);
});
test("activity excludes hidden time and suspended browser gaps", () => {
  let now = 0;
  const segments = [];
  const clock = createActivityClock({
    now: () => now,
    wallNow: () => Date.UTC(2026, 10, 16),
    id: () => String(segments.length),
    onSegment: (s) => segments.push(s),
  });
  now = 1000;
  clock.tick();
  clock.setVisible(false);
  now = 3000;
  clock.tick();
  clock.setVisible(true);
  now = 4000;
  clock.tick();
  now = 15000;
  clock.tick();
  clock.stop();
  assert.equal(
    segments.reduce((n, s) => n + s.milliseconds, 0),
    2000,
  );
});
