import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { isAuthRoute, isOnboardingRoute, isProfileRoute, useAuth } from "@/lib/auth";
import { needsOnboarding } from "@/lib/onboarding";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useWorkspace } from "@/lib/workspace-store";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading, isConfigured } = useAuth();
  const { currentMember, currentUserId, isLoading: workspaceLoading } = useWorkspace();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const authPage = isAuthRoute(pathname);
  const onboardingPage = isOnboardingRoute(pathname);
  const profilePage = isProfileRoute(pathname);

  const userNeedsOnboarding =
    isConfigured && Boolean(user) && needsOnboarding(currentMember, currentUserId);

  useEffect(() => {
    if (!isConfigured || authPage) return;
    if (onboardingPage && authLoading) return;
    if (!authLoading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, authLoading, isConfigured, authPage, onboardingPage, navigate]);

  useEffect(() => {
    if (!isConfigured || authPage || authLoading || workspaceLoading || !user) return;

    if (userNeedsOnboarding && !onboardingPage && !profilePage) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    if (!userNeedsOnboarding && onboardingPage) {
      navigate({ to: "/", replace: true });
    }
  }, [
    isConfigured,
    authPage,
    authLoading,
    workspaceLoading,
    user,
    userNeedsOnboarding,
    onboardingPage,
    profilePage,
    navigate,
  ]);

  if (!isSupabaseConfigured || authPage) {
    return children;
  }

  if (authLoading || !user || (user && workspaceLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return children;
}
