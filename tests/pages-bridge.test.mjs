import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const html = await readFile(
  new URL("../.pages/index.html", import.meta.url),
  "utf8",
);
test("former origin exports progress without auth storage or cross-origin transmission", () => {
  assert.ok(
    html.includes("https://scoreleaf.vercel.app/"),
  );
  const listeners = {},
    options = [],
    downloads = [];
  const state = {
    weeks: 8,
    target: 750,
    minutes: 45,
    start: "2026-11-16",
    history: [],
    mistakes: [],
    known: [],
    vocabDays: [],
    secret: "never exported",
  };
  const storage = {
    "toeic-path-v1": JSON.stringify(state),
    "toeic-path-auth-v1": JSON.stringify({ access_token: "never read" }),
  };
  const select = {
      options,
      append: (option) => options.push(option),
      value: "toeic-path-v1",
    },
    status = {},
    button = { addEventListener: (event, fn) => (listeners[event] = fn) };
  let exported;
  const context = vm.createContext({
    localStorage: {
      ...storage,
      getItem: (key) => {
        assert.notEqual(key, "toeic-path-auth-v1");
        return storage[key];
      },
    },
    history: { replaceState() {} },
    location: { pathname: "/toeic-path/" },
    document: {
      getElementById: (id) => ({ cache: select, status, export: button })[id],
      createElement: (tag) =>
        tag === "a" ? { click: () => downloads.push(true) } : {},
    },
    Blob: class {
      constructor(parts) {
        exported = JSON.parse(parts[0]);
      }
    },
    URL: { createObjectURL: () => "", revokeObjectURL() {} },
    setTimeout: (fn) => fn(),
  });
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  assert.equal(options.length, 1);
  listeners.click();
  assert.equal(exported.app, "toeic-path");
  assert.equal(exported.state.secret, undefined);
  assert.deepEqual(exported.state.history, []);
  assert.equal(downloads.length, 1);
  assert.ok(!html.includes("fetch("));
});
