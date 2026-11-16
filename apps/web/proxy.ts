import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseKey } from "./src/lib/supabase/config";
import { isProtectedPath, signInPath } from "./src/lib/auth-navigation";
import { formerHostRedirect } from "./src/lib/site-url";
export async function proxy(request: NextRequest) {
  const canonical = formerHostRedirect(request.url);
  if (canonical) return NextResponse.redirect(canonical, 308);
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (isProtectedPath(request.nextUrl.pathname) && (error || !data.user)) {
    const destination = new URL(
      signInPath(request.nextUrl.pathname + request.nextUrl.search),
      request.url,
    );
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/",
    "/login",
    "/auth/:path*",
    "/dashboard/:path*",
    "/plan/:path*",
    "/practice/:path*",
    "/tests/:path*",
    "/review/:path*",
    "/vocabulary/:path*",
    "/progress/:path*",
    "/settings/:path*",
  ],
};
