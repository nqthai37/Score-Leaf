import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth-navigation";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let path = "/login?signin=error";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) path = safeReturnPath(request.nextUrl.searchParams.get("next"));
  }
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
