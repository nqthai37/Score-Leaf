import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const cwd = fileURLToPath(new URL("../", import.meta.url));
const reserve = createServer();
await new Promise((resolve) => reserve.listen(0, "127.0.0.1", resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = process.env.PREVIEW_BASE_URL || `http://127.0.0.1:${port}`;
let server,
  logs = "";
try {
  if (!process.env.PREVIEW_BASE_URL) {
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { cwd, stdio: ["ignore", "pipe", "pipe"] },
    );
    for (const stream of [server.stdout, server.stderr])
      stream.on("data", (chunk) => {
        logs = (logs + chunk.toString()).slice(-6000);
      });
  }
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const result = await fetch(origin + "/dashboard");
      if (result.ok) {
        ready = true;
        break;
      }
    } catch {}
    if (server?.exitCode !== null && server?.exitCode !== undefined) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, "Production server did not become ready: " + logs);
  const pages = [
    "/dashboard",
    "/plan",
    "/practice",
    "/practice/session?ids=23&kind=part&mode=learning",
    "/practice/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    "/practice/invalid-attempt",
    "/tests",
    "/review",
    "/vocabulary",
    "/progress",
    "/settings",
  ];
  const results = await Promise.allSettled(
    pages.map(async (path) => {
      for (const headers of [{}, { RSC: "1", "Next-Router-Prefetch": "1" }]) {
        const response = await fetch(origin + path, {
          redirect: "manual",
          headers,
        });
        assert.equal(
          response.status,
          307,
          path + " must reject anonymous page and client-navigation requests",
        );
        const location = new URL(response.headers.get("location"), origin);
        assert.equal(location.origin, new URL(origin).origin);
        assert.equal(location.pathname, "/login");
        assert.equal(location.searchParams.get("next"), path);
        assert.match(
          response.headers.get("cache-control"),
          /private.*no-store/,
        );
        assert.doesNotMatch(
          await response.text(),
          /quiz-card|id="sidebar"/,
          "Protected content must not reach anonymous visitors",
        );
      }
    }),
  );
  for (const result of results)
    if (result.status === "rejected") throw result.reason;
  const forged = await fetch(origin + "/progress", {
    redirect: "manual",
    headers: {
      cookie:
        "sb-znklwghqiielgzbgfqtv-auth-token=base64-e30; toeic-path-auth-v1=true",
    },
  });
  assert.equal(
    forged.status,
    307,
    "A forged or incomplete session cannot authorize a private page",
  );
  const head = await fetch(origin + "/dashboard", {
    method: "HEAD",
    redirect: "manual",
  });
  assert.equal(head.status, 307, "HEAD requests require authentication too");
  assert.equal((await fetch(origin + "/login")).status, 200);
  const root = await fetch(origin + "/", { redirect: "manual" });
  assert.equal(root.status, 200);
  const landing = await root.text();
  assert.match(landing, /auth-intro/);
  assert.match(landing, /auth-form-side/);
  assert.ok(!landing.includes('id="sidebar"'));
  assert.match(landing, /auth-email/);
  assert.match(landing, /<html[^>]*lang="en"/);
  assert.match(landing, /Welcome back\./);
  assert.doesNotMatch(
    landing,
    /class="auth-guest"|href="\/dashboard"/,
    "The sign-in page must not offer guest practice",
  );
  assert.equal((await fetch(origin + "/missing-page")).status, 404);
  const callback = await fetch(
    origin + "/auth/callback?next=https://example.com",
    { redirect: "manual" },
  );
  assert.equal(callback.status, 303);
  assert.equal(
    new URL(callback.headers.get("location"), origin).pathname,
    "/login",
  );
  assert.equal(
    new URL(callback.headers.get("location"), origin).search,
    "?signin=error",
  );
  assert.match(callback.headers.get("cache-control"), /no-store/);
  assert.equal(callback.headers.get("referrer-policy"), "no-referrer");
  assert.match(
    await (await fetch(origin + "/robots.txt")).text(),
    /Disallow: \//,
  );
  const illustration = await fetch(origin + "/illustrations/study-books.svg");
  assert.equal(illustration.status, 200);
  assert.match(
    await illustration.text(),
    /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,
  );
  console.log(
    "PASS: private page/HEAD/RSC redirects, forged-session rejection, return paths, public login, callback hygiene, 404 and assets.",
  );
} finally {
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await exited;
  }
}
