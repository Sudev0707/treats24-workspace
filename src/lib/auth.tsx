import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { signOutOnServer } from "@/lib/auth-oauth-fn";
import {
  clearSupabaseAuthStorage,
  getAuthRedirectUrl,
  getSupabaseClient,
  isSupabaseConfigured,
  resetSupabaseClient,
} from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    const supabaseClient: SupabaseClient = client;

    async function loadAuthState() {
      const {
        data: { session: currentSession },
      } = await supabaseClient.auth.getSession();
      setSession(currentSession);
      setIsLoading(false);
    }

    void loadAuthState();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    clearSupabaseAuthStorage();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    await signOutOnServer();
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearSupabaseAuthStorage();
    resetSupabaseClient();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signInWithGoogle,
      signOut,
    }),
    [session, isLoading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

export function isOnboardingRoute(pathname: string) {
  return pathname === "/onboarding";
}

export function isProfileRoute(pathname: string) {
  return pathname === "/profile";
}

export function isBareRoute(pathname: string) {
  return isAuthRoute(pathname) || isOnboardingRoute(pathname);
}
