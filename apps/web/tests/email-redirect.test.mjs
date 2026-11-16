import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const { outputFiles } = await build({
  entryPoints: [
    fileURLToPath(new URL("../src/lib/site-url.ts", import.meta.url)),
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const {
  APP_ORIGIN,
  authOrigin,
  authCallbackUrl,
  authOriginRedirect,
  formerHostRedirect,
} = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
test("new production email links always target ScoreLeaf, including from former domains", () => {
  for (const origin of [
    APP_ORIGIN,
    "https://toeic-path-next-preview.vercel.app",
    "https://toeic-path-next-preview-nqthai37s-projects.vercel.app",
    "https://scoreleaf-preview.vercel.app",
    "https://evil.example",
  ]) {
    const callback = new URL(authCallbackUrl(origin, "/review"));
    assert.equal(callback.origin, APP_ORIGIN);
    assert.equal(callback.pathname, "/auth/callback");
    assert.equal(callback.searchParams.get("next"), "/review");
  }
  assert.equal(
    new URL(
      authCallbackUrl(APP_ORIGIN, "https://evil.example"),
    ).searchParams.get("next"),
    "/dashboard",
  );
});
test("the browser moves before requesting a link, to keep its PKCE verifier on the callback origin", () => {
  assert.equal(authOriginRedirect(APP_ORIGIN), null);
  assert.equal(authOriginRedirect("http://localhost:3000"), null);
  assert.equal(authOriginRedirect("http://127.0.0.1:3000"), null);
  const redirect = new URL(
    authOriginRedirect(
      "https://toeic-path-next-preview.vercel.app",
      "/settings",
    ),
  );
  assert.equal(redirect.origin, APP_ORIGIN);
  assert.equal(redirect.pathname, "/login");
  assert.equal(redirect.searchParams.get("next"), "/settings");
  assert.equal(authOrigin("http://localhost.evil.example"), APP_ORIGIN);
});
test("old entry URLs move to ScoreLeaf while issued callbacks and authenticated routes stay compatible", () => {
  assert.equal(
    formerHostRedirect("https://toeic-path-next-preview.vercel.app/"),
    APP_ORIGIN + "/",
  );
  assert.equal(
    formerHostRedirect(
      "https://toeic-path-next-preview.vercel.app/login?next=%2Freview",
    ),
    APP_ORIGIN + "/login?next=%2Freview",
  );
  for (const path of [
    "/auth/callback?code=existing-code",
    "/?code=existing-code",
    "/progress",
  ])
    assert.equal(
      formerHostRedirect("https://toeic-path-next-preview.vercel.app" + path),
      null,
    );
  assert.equal(formerHostRedirect(APP_ORIGIN + "/login"), null);
  assert.equal(
    formerHostRedirect(
      "https://toeic-path-next-preview.vercel.app//evil.example",
    ),
    null,
  );
});
