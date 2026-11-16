import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { build } from "esbuild";

test("profile ignites on a fast first response, but never on immediate reopen or reload", async () => {
  const window = new Window({ url: "http://localhost:3000/dashboard" });
  const previous = new Map();
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
  let claimed = false,
    claims = 0;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  globalThis.profileMocks = {
    study: {
      user: {
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        email: "learner@example.com",
        user_metadata: {},
      },
      ready: true,
      progress: { start: "2026-11-16", weeks: 8, minutes: 45 },
      signout: async () => {},
    },
    client: {
      rpc: async (name) => {
        const profile = {
          display_name: "Học viên",
          today,
          timezone: "Asia/Ho_Chi_Minh",
          streak: 1,
          celebrated_today: claimed,
        };
        if (name === "claim_profile_flame") {
          claims++;
          const celebrate = !claimed;
          claimed = true;
          return {
            data: { ...profile, celebrated_today: true, celebrate },
            error: null,
          };
        }
        return { data: profile, error: null };
      },
    },
  };
  const require = createRequire(import.meta.url);
  const { outputFiles } = await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/components/user-profile.tsx", import.meta.url),
      ),
    ],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    external: ["react", "react/*"],
    plugins: [
      {
        name: "isolated-profile-dependencies",
        setup(builder) {
          builder.onResolve(
            {
              filter:
                /^(\.\/study-provider|@\/lib\/supabase\/client|next\/link)$/,
            },
            (args) => ({ path: args.path, namespace: "profile-test" }),
          );
          builder.onLoad(
            { filter: /.*/, namespace: "profile-test" },
            (args) => ({
              contents:
                args.path === "./study-provider"
                  ? "export const useStudy=()=>globalThis.profileMocks.study"
                  : args.path === "next/link"
                    ? 'import React from "react";export default function Link({children,...props}){return React.createElement("a",props,children)}'
                    : "export const createClient=()=>globalThis.profileMocks.client",
              loader: "js",
            }),
          );
        },
      },
    ],
  });
  const module = { exports: {} };
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
  let root = createRoot(host);
  const mount = async () => {
    await act(async () => {
      root.render(React.createElement(module.exports.UserProfile));
    });
  };
  const click = async (selector) => {
    const element = host.querySelector(selector);
    assert.ok(element, selector);
    await act(async () => {
      element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
  };
  try {
    await mount();
    await click(".profile-trigger");
    assert.ok(
      host.querySelector(".flame-celebrating"),
      "The first click must ignite even if the RPC resolves before React commits the open state",
    );
    assert.equal(claims, 1);
    await click(".profile-close");
    await click(".profile-trigger");
    assert.equal(
      host.querySelector(".flame-celebrating"),
      null,
      "Closing/reopening within 2.4 seconds cannot restart the CSS animation",
    );
    assert.equal(claims, 1);
    await act(async () => {
      document.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    assert.equal(host.querySelector('[role="dialog"]'), null);
    await act(async () => root.unmount());
    root = createRoot(host);
    await mount();
    await click(".profile-trigger");
    assert.equal(host.querySelector(".flame-celebrating"), null);
    assert.equal(
      claims,
      1,
      "An already claimed server day does not replay after remount",
    );
    await act(async () => root.unmount());
    globalThis.profileMocks.study = {
      ...globalThis.profileMocks.study,
      user: null,
    };
    root = createRoot(host);
    await mount();
    await click(".profile-trigger");
    assert.ok(host.textContent.includes("Sign in to start your streak."));
    assert.equal(claims, 1, "Guest practice cannot claim an account login day");
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
    delete globalThis.profileMocks;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
