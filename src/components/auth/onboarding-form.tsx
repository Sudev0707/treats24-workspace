import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/lib/workspace-store";

export function OnboardingForm() {
  const { members, currentUserId, completeOnboarding } = useWorkspace();
  const currentUser = members.find((m) => m.id === currentUserId);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [role, setRole] = useState(currentUser?.role === "Developer" ? "" : (currentUser?.role ?? ""));
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedRole = role.trim();

    if (!trimmedName) {
      toast.error("Username is required");
      return;
    }

    if (!trimmedRole) {
      toast.error("Job title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding({ name: trimmedName, role: trimmedRole });
    } catch (error) {
      toast.error("Could not save your profile", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set up your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us how you&apos;d like to appear in the workspace.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="onboarding-name">Username</Label>
          <Input
            id="onboarding-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sudev"
            autoComplete="nickname"
            className="h-11 rounded-xl"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-role">Job title</Label>
          <Input
            id="onboarding-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Product Manager"
            autoComplete="organization-title"
            className="h-11 rounded-xl"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="mt-6 h-11 w-full rounded-xl text-sm font-medium"
        disabled={isSubmitting}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to workspace"}
      </Button>
    </form>
  );
}
