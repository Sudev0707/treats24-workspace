import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckSquare, LayoutGrid, Users } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Treats24 Workspace" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, isLoading, isConfigured } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: "/" });
    }
  }, [user, isLoading, navigate]);

  if (isLoading && isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5eefd]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#9333ea] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-[#ff7a45]/30 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-lg font-bold text-white backdrop-blur-sm">
            T
          </div>
          <span className="text-lg font-semibold text-white">Treats24 Workspace</span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-semibold leading-tight text-white">
              Ship faster with one focused workspace
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
              Plan projects, track tasks and issues, and keep your team aligned — all in one place built for Treats24.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              { icon: LayoutGrid, label: "Unified project & issue tracking" },
              { icon: CheckSquare, label: "Kanban boards and delivery workflows" },
              { icon: Users, label: "Team visibility and workload insights" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Treats24. Internal use only.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f5eefd] px-6 py-12">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            T
          </div>
          <span className="text-base font-semibold text-foreground">Treats24 Workspace</span>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-8 shadow-card">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
