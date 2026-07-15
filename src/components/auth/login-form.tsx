import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";

export function LoginForm() {
  const { signInWithGoogle, isConfigured } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    if (!isConfigured) {
      toast.error("Supabase is not configured", {
        description: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
      });
      return;
    }

    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error("Google sign-in failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to Treats24</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your Google account to access your workspace.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl border-border bg-card text-sm font-medium shadow-soft hover:bg-secondary"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-5 w-5" />
        )}
        Continue with Google
      </Button>

      {!isConfigured && (
        <p className="mt-4 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-center text-xs text-muted-foreground">
          Auth UI is ready. Configure Supabase env vars to enable Google login.
        </p>
      )}
    </div>
  );
}
