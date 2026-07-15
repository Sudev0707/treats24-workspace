import { useAuth } from "@/lib/auth";
import { getUserDisplayInfo, memberToDisplayInfo, type UserDisplayInfo } from "@/lib/user-display";
import { useWorkspace } from "@/lib/workspace-store";

export function useCurrentUserDisplay(): UserDisplayInfo {
  const { user } = useAuth();
  const { currentMember } = useWorkspace();
  if (currentMember.name?.trim()) return memberToDisplayInfo(currentMember);
  return getUserDisplayInfo(user);
}
