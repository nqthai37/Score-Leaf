import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { build } from "esbuild";
test("cached private screens disappear immediately on sign-out and cannot return through client navigation", async () => {
  const window = new Window({
      url: "http://localhost:3000/practice/session?ids=23",
    }),
    previous = new Map();
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
  ]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: key === "window" ? window : window[key],
    });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const redirects = [];
  globalThis.authShellMocks = {
    path: "/practice/session",
    study: { ready: false, user: null },
    router: { replace: (path) => redirects.push(path) },
  };
  const { outputFiles } = await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/components/app-shell.tsx", import.meta.url),
      ),
    ],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    external: ["react", "react/*"],
    plugins: [
      {
        name: "auth-shell-boundaries",
        setup(builder) {
          builder.onResolve(
            {
              filter:
                /^(next\/navigation|\.\/navigation|\.\/user-profile|\.\/study-provider)$/,
            },
            (args) => ({ path: args.path, namespace: "auth-shell-test" }),
          );
          builder.onLoad(
            { filter: /.*/, namespace: "auth-shell-test" },
            (args) => ({
              loader: "js",
              contents:
                args.path === "next/navigation"
                  ? "export const usePathname=()=>globalThis.authShellMocks.path;export const useRouter=()=>globalThis.authShellMocks.router"
                  : args.path === "./study-provider"
                    ? "export const useStudy=()=>globalThis.authShellMocks.study"
                    : args.path === "./user-profile"
                      ? "export const UserProfile=()=>null"
                      : 'import React from "react";export const Breadcrumb=()=>null;export const Navigation=()=>React.createElement("aside",null,"Private navigation")',
            }),
          );
        },
      },
    ],
  });
  const require = createRequire(import.meta.url),
    module = { exports: {} };
  new Function("require", "module", "exports", outputFiles[0].text)(
    require,
    module,
    module.exports,
  );
  const React = require("react"),
    { act } = React,
    { createRoot } = require("react-dom/client");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = () =>
    act(async () =>
      root.render(
        React.createElement(
          module.exports.AppShell,
          null,
          React.createElement("article", null, "Private learning content"),
        ),
      ),
    );
  try {
    await render();
    assert.ok(!host.textContent.includes("Private learning content"));
    assert.ok(!host.querySelector("aside"));
    globalThis.authShellMocks.study = { ready: true, user: null };
    await render();
    assert.ok(!host.textContent.includes("Private learning content"));
    assert.equal(
      redirects.at(-1),
      "/login?next=%2Fpractice%2Fsession%3Fids%3D23",
    );
    globalThis.authShellMocks.study = {
      ready: true,
      user: { id: "learner-a" },
    };
    await render();
    assert.ok(host.textContent.includes("Private learning content"));
    assert.ok(host.querySelector("aside"));
    globalThis.authShellMocks.study = { ready: true, user: null };
    await render();
    assert.ok(
      !host.textContent.includes("Private learning content"),
      "Signing out must remove an already rendered private route",
    );
    assert.ok(!host.querySelector("aside"));
    globalThis.authShellMocks.path = "/progress";
    await render();
    assert.ok(
      !host.textContent.includes("Private learning content"),
      "A cached route cannot bypass the client fence",
    );
    globalThis.authShellMocks.path = "/login";
    await render();
    assert.ok(
      host.textContent.includes("Private learning content"),
      "Public auth pages can render their own children without a session",
    );
    assert.ok(!host.querySelector("aside"));
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
    delete globalThis.authShellMocks;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
