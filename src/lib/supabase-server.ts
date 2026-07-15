import {
  getCookies,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          setResponseHeader(name, value);
        });
      },
    },
    realtime: {
      transport: ws as unknown as typeof WebSocket,
    },
  });
}
