import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

function getProjectRef(): string | null {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

/** Clear stale PKCE / session keys so a fresh OAuth flow can start cleanly. */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;

  const projectRef = getProjectRef();
  if (projectRef) {
    const prefix = `sb-${projectRef}-auth-token`;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  // Legacy auth-js storage keys
  for (const key of Object.keys(localStorage)) {
    if (key.includes("code-verifier") || key.includes("auth-token")) {
      localStorage.removeItem(key);
    }
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (typeof window === "undefined") return null;

  if (!client) {
    client = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
      isSingleton: true,
      auth: {
        flowType: "pkce",
        // Callback route handles the code exchange manually — avoid double exchange.
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
}

export function getAuthRedirectUrl(path = "/auth/callback"): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const appUrl =
    import.meta.env.VITE_APP_URL_PRODUCTION ?? import.meta.env.VITE_APP_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}${path}`;
  }
  return path;
}
