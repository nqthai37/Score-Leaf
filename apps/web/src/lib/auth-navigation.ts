const protectedRoots = [
  "/dashboard",
  "/plan",
  "/practice",
  "/tests",
  "/review",
  "/vocabulary",
  "/progress",
  "/settings",
];
export function isProtectedPath(path: string) {
  return protectedRoots.some(
    (root) => path === root || path.startsWith(root + "/"),
  );
}
// Only known, same-origin learning routes are valid after sign-in.
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return "/dashboard";
  try {
    const url = new URL(value, "https://toeic-path.invalid");
    if (
      url.origin !== "https://toeic-path.invalid" ||
      !isProtectedPath(url.pathname)
    )
      return "/dashboard";
    if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(url.pathname))
      return "/dashboard";
    url.searchParams.delete("_rsc");
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}
export function signInPath(returnTo: string) {
  return "/login?" + new URLSearchParams({ next: safeReturnPath(returnTo) });
}
