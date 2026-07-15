import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getPostAuthRedirect } from "@/lib/onboarding";
import { getSupabaseClient } from "@/lib/supabase";
import { ensureProfileForUser } from "@/lib/workspace-db";

type CallbackSearch = {
  code?: string;
  error?: string;
  error_description?: string;
};

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Signing in — Treats24" }],
  }),
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function completeSignIn() {
      const oauthError = search.error_description ?? search.error;
      if (oauthError) {
        setError(decodeURIComponent(oauthError.replace(/\+/g, " ")));
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }

      const code =
        search.code ?? new URLSearchParams(window.location.search).get("code") ?? undefined;

      if (!code) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          try {
            const member = await ensureProfileForUser(session.user);
            navigate({ to: getPostAuthRedirect(member, session.user.id), replace: true });
          } catch {
            navigate({ to: "/", replace: true });
          }
          return;
        }

        setError("No authorization code found. Please try again.");
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Signed in, but no user was returned. Please try again.");
        return;
      }

      try {
        const member = await ensureProfileForUser(user);
        navigate({ to: getPostAuthRedirect(member, user.id), replace: true });
      } catch (profileError) {
        console.error(profileError);
        navigate({ to: "/", replace: true });
      }
    }

    void completeSignIn();
  }, [navigate, search.code, search.error, search.error_description]);

  useEffect(() => {
    if (error) {
      toast.error("Sign in failed", { description: error });
    }
  }, [error]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5eefd] px-4">
        <p className="text-sm font-medium text-foreground">Something went wrong</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => navigate({ to: "/login" })}
          className="text-sm text-primary hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5eefd] px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Completing sign in…</p>
    </div>
  );
}
