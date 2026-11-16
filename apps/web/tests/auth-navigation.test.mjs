import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const { outputFiles } = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/lib/auth-navigation.ts", import.meta.url)),
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { safeReturnPath, isProtectedPath, signInPath } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
test("all learning pages and nested attempts are protected, public routes stay public", () => {
  for (const path of [
    "/dashboard",
    "/plan",
    "/practice",
    "/practice/session",
    "/practice/attempt",
    "/tests",
    "/review",
    "/vocabulary",
    "/progress",
    "/settings",
  ])
    assert.equal(isProtectedPath(path), true, path);
  for (const path of [
    "/",
    "/login",
    "/auth/callback",
    "/robots.txt",
    "/_next/static/a.js",
    "/practices",
  ])
    assert.equal(isProtectedPath(path), false, path);
});
test("return paths preserve practice configuration and discard prefetch internals", () => {
  assert.equal(
    safeReturnPath("/practice/session?ids=23%2C24&kind=part"),
    "/practice/session?ids=23%2C24&kind=part",
  );
  assert.equal(safeReturnPath("/review?_rsc=internal"), "/review");
  assert.equal(
    new URL(signInPath("/progress"), "https://example.com").searchParams.get(
      "next",
    ),
    "/progress",
  );
});
test("auth redirects cannot target external origins, malformed paths or auth loops", () => {
  for (const target of [
    undefined,
    null,
    ["/settings"],
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/login?next=/login",
    "/auth/callback",
    "/practice/%2f%2fevil.example",
    "/practice/%5cevil",
    "/practice/../../login",
    "/settings\nLocation: https://evil.example",
    "/unknown",
  ])
    assert.equal(safeReturnPath(target), "/dashboard", String(target));
});
