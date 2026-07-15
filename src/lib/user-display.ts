import type { User } from "@supabase/supabase-js";
import type { Member } from "@/lib/data";

export type UserDisplayInfo = {
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  role?: string;
};

export function getUserDisplayInfo(user: User | null): UserDisplayInfo {
  if (!user) return { name: "User", email: "", initials: "?" };

  const metadata = user.user_metadata ?? {};
  const name =
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";
  const email = user.email ?? "";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || email.slice(0, 2).toUpperCase();
  const avatarUrl =
    (metadata.avatar_url as string | undefined) ??
    (metadata.picture as string | undefined);

  return { name, email, initials, avatarUrl };
}

export function memberToDisplayInfo(member: Member): UserDisplayInfo {
  return {
    name: member.name,
    email: member.email,
    initials: member.avatar,
    role: member.role,
  };
}
