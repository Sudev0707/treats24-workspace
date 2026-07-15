import { useAuth } from "@/lib/auth";
import { getUserDisplayInfo, memberToDisplayInfo, type UserDisplayInfo } from "@/lib/user-display";
import { useWorkspace } from "@/lib/workspace-store";

export function useCurrentUserDisplay(): UserDisplayInfo {
  const { user } = useAuth();
  const { members, currentUserId } = useWorkspace();
  const member = members.find((m) => m.id === currentUserId);
  if (member) return memberToDisplayInfo(member);
  return getUserDisplayInfo(user);
}
