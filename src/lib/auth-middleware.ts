import { createMiddleware } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/lib/supabase-server";

/** Refresh Supabase session cookies when a session already exists. */
export const authMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.getUser();
    }
  } catch {
    // Unauthenticated requests are expected.
  }

  return next();
});
