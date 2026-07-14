import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Camera, Mail, MapPin, Settings, Shield } from "lucide-react";
import {
  JiraBtn,
  JiraLinkBtn,
  JiraPage,
  JiraPageHeader,
  JiraPanel,
  StatusLozenge,
} from "@/components/jira/ui";
import { TicketKeyLink } from "@/components/ticket/ticket-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getMember, getProjectById, isDoneStatus } from "@/lib/data";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Treats24" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { tasks, issues, projects, activity, currentUserId } = useWorkspace();
  const user = getMember(currentUserId);

  const stats = useMemo(() => {
    const assigned = tasks.filter((t) => t.assigneeId === currentUserId);
    const completed = assigned.filter((t) => isDoneStatus(t.status));
    const reported = issues.filter((i) => i.reporterId === currentUserId);
    const myProjects = projects.filter((p) => p.memberIds.includes(currentUserId));
    return {
      assigned: assigned.length,
      completed: completed.length,
      reported: reported.length,
      projects: myProjects.length,
      completionRate: assigned.length ? Math.round((completed.length / assigned.length) * 100) : 0,
    };
  }, [tasks, issues, projects, currentUserId]);

  const recentTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === currentUserId).slice(0, 5),
    [tasks, currentUserId],
  );

  const recentActivity = useMemo(
    () => activity.filter((a) => a.userId === currentUserId).slice(0, 5),
    [activity, currentUserId],
  );

  return (
    <JiraPage className="max-w-4xl">
      <JiraPageHeader
        title="Profile"
        subtitle={`${user.role} · ${user.email}`}
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Profile" }]}
        actions={
          <JiraLinkBtn to="/settings">
            <Settings className="h-3.5 w-3.5" /> Settings
          </JiraLinkBtn>
        }
      />

      <div className="mb-5 overflow-hidden rounded-md border border-border bg-card shadow-soft">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-cta/10" />
        <div className="relative px-4 pb-4 sm:px-6">
          <div className="flex flex-wrap items-end gap-4 -mt-10">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-card">
                <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                  {user.avatar}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-secondary text-muted-foreground">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="font-display text-xl font-semibold text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.role}</p>
            </div>
            <JiraBtn variant="default" size="sm">
              Edit photo
            </JiraBtn>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              India (IST)
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assigned", value: stats.assigned },
          { label: "Completed", value: stats.completed },
          { label: "Reported issues", value: stats.reported },
          { label: "Projects", value: stats.projects },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-card px-4 py-3 shadow-soft">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <JiraPanel title="Personal information">
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input defaultValue={user.name} className="h-8 rounded border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input defaultValue={user.email} type="email" className="h-8 rounded border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Job title</Label>
                  <Input defaultValue="Product Owner" className="h-8 rounded border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Input defaultValue="Asia/Kolkata (IST)" className="h-8 rounded border-border" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea
                  defaultValue="Building Treats24 workspace — shipping projects, tracking issues, and keeping the team aligned."
                  className="min-h-[88px] resize-none rounded border-border"
                />
              </div>
              <div className="flex justify-end gap-2">
                <JiraBtn variant="default">Cancel</JiraBtn>
                <JiraBtn variant="primary">Save profile</JiraBtn>
              </div>
            </div>
          </JiraPanel>

          <JiraPanel title="Assigned work" noPadding>
            {recentTasks.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No assigned tasks yet.</div>
            ) : (
              recentTasks.map((task) => {
                const project = getProjectById(projects, task.projectId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-secondary/50"
                  >
                    <TicketKeyLink ticketKey={task.id} to="/tasks/$taskId" params={{ taskId: task.id }} />
                    <Link
                      to="/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline"
                    >
                      {task.title}
                    </Link>
                    <span className="hidden truncate text-xs text-muted-foreground sm:block">{project.name}</span>
                    <StatusLozenge status={task.status} size="sm" />
                  </div>
                );
              })
            )}
            {recentTasks.length > 0 && (
              <div className="border-t border-border px-4 py-2">
                <Link to="/tasks" className="text-xs text-primary hover:underline">
                  View all tasks
                </Link>
              </div>
            )}
          </JiraPanel>
        </div>

        <div className="space-y-4">
          <JiraPanel title="Completion rate">
            <div className="p-4">
              <p className="font-display text-3xl font-semibold tabular-nums text-foreground">{stats.completionRate}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.completed} of {stats.assigned} assigned tasks done
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
          </JiraPanel>

          <JiraPanel title="Account">
            <div className="divide-y divide-border p-4">
              <div className="flex items-start gap-3 pb-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Role</p>
                  <p className="text-xs text-muted-foreground">{user.role} · full workspace access</p>
                </div>
              </div>
              <div className="py-3">
                <p className="text-sm font-medium text-foreground">Member since</p>
                <p className="text-xs text-muted-foreground">January 2026</p>
              </div>
              <Separator className="my-3" />
              <Link to="/settings" className="text-xs text-primary hover:underline">
                Manage account settings →
              </Link>
            </div>
          </JiraPanel>

          <JiraPanel title="Recent activity" noPadding>
            <div className="max-h-64 overflow-y-auto px-4 py-2">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No recent activity</div>
              ) : (
                recentActivity.map((a) => (
                  <div key={a.id} className="border-b border-border py-2.5 last:border-0">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {a.action} <span className="font-medium text-foreground">{a.target}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{a.time}</p>
                  </div>
                ))
              )}
            </div>
          </JiraPanel>
        </div>
      </div>
    </JiraPage>
  );
}
