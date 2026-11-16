import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseKey } from "./config";
export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
