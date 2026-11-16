import { safeReturnPath } from "./auth-navigation";

export const APP_ORIGIN = "https://scoreleaf.vercel.app";
const formerHosts = new Set([
  "toeic-path-next-preview.vercel.app",
  "toeic-path-next-preview-nqthai37s-projects.vercel.app",
  "scoreleaf-nqthai37s-projects.vercel.app",
]);

export function authOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      return url.origin;
  } catch {
    /* Unknown origins always use production. */
  }
  return APP_ORIGIN;
}

export function authCallbackUrl(origin: string, next?: string) {
  const url = new URL("/auth/callback", authOrigin(origin));
  if (next !== undefined) url.searchParams.set("next", safeReturnPath(next));
  return url.href;
}

// A PKCE verifier belongs to its browser origin. Move first, before asking
// Supabase to create a link, rather than creating it on an obsolete hostname.
export function authOriginRedirect(origin: string, next = "/dashboard") {
  try {
    if (new URL(origin).origin === authOrigin(origin)) return null;
  } catch {
    /* Use the canonical sign-in page. */
  }
  const url = new URL("/login", APP_ORIGIN);
  url.searchParams.set("next", safeReturnPath(next));
  return url.href;
}

export function formerHostRedirect(requestUrl: string) {
  const request = new URL(requestUrl);
  if (!formerHosts.has(request.hostname)) return null;
  // Keep existing callbacks and signed-in sessions working on their original
  // origin. Only fresh sign-in entry points move before creating a verifier.
  if (
    !["/", "/login"].includes(request.pathname) ||
    request.searchParams.has("code") ||
    request.searchParams.has("token_hash")
  )
    return null;
  const target = new URL(APP_ORIGIN);
  target.pathname = request.pathname;
  target.search = request.search;
  return target.href;
}
