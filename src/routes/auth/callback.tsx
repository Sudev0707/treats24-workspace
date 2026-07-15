import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getSupabaseClient } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Signing in — Treats24" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatus("error");
      toast.error("Supabase is not configured");
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        setStatus("error");
        toast.error("Sign in failed", {
          description: error?.message ?? "No session found. Please try again.",
        });
        return;
      }

      toast.success("Signed in successfully");
      navigate({ to: "/" });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5eefd] px-4">
      {status === "loading" ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completing sign in…</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="text-sm text-primary hover:underline"
          >
            Back to sign in
          </button>
        </>
      )}
    </div>
  );
}
