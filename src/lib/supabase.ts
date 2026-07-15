import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (typeof window === "undefined") return null;

  if (!client) {
    client = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
      isSingleton: true,
    });
  }
  return client;
}

export function getAuthRedirectUrl(path = "/auth/callback"): string {
  const appUrl = import.meta.env.VITE_APP_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}${path}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}
