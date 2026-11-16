import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
// Request-scoped verification; never trust a browser cache or a parsed cookie.
export const requireUser = cache(async () => {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  return data.user;
});
