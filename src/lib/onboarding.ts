import type { Member } from "@/lib/data";

const COMPLETE_KEY = (userId: string) => `treats24:onboarding-complete:${userId}`;
const DEFAULT_ROLE = "Developer";

export function isOnboardingCompleteLocally(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COMPLETE_KEY(userId)) === "true";
}

export function markOnboardingCompleteLocally(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPLETE_KEY(userId), "true");
}

export function isProfileIncomplete(member: Member): boolean {
  const name = member.name?.trim() ?? "";
  const role = member.role?.trim() ?? "";
  if (!name || !role) return true;
  if (member.onboardingCompleted !== true && role === DEFAULT_ROLE) return true;
  return false;
}

export function needsOnboarding(member: Member | undefined, userId: string): boolean {
  if (!member || !userId) return false;
  if (isOnboardingCompleteLocally(userId)) return false;
  if (member.onboardingCompleted === true && !isProfileIncomplete(member)) return false;
  return isProfileIncomplete(member);
}

export function getPostAuthRedirect(member: Member | undefined, userId: string): "/" | "/onboarding" {
  return needsOnboarding(member, userId) ? "/onboarding" : "/";
}
