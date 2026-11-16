import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const content = JSON.parse(
  await readFile(
    new URL("../src/generated/content-summary.json", import.meta.url),
    "utf8",
  ),
);
test("the preview inventory preserves all seven parts and the existing test library", () => {
  assert.equal(content.questions, 246);
  assert.equal(content.groups, 154);
  assert.equal(content.audio, 102);
  assert.equal(content.tests, 10);
  assert.equal(content.vocabulary, 24);
  assert.deepEqual(
    content.parts.map((p) => p.part),
    [1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(
    content.parts.reduce((n, p) => n + p.questions, 0),
    246,
  );
  assert.deepEqual(
    content.testLibrary.map((t) => t.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.ok(
    content.testLibrary.every((t) => t.questions === 20 && t.minutes === 20),
  );
});
