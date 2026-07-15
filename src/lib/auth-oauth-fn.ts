import { createServerFn } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/lib/supabase-server";

export const signOutOnServer = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true as const };
});
