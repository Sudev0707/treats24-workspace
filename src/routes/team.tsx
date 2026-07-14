import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AssigneeAvatar, JiraBtn, JiraEmpty, JiraPage, JiraPageHeader, JiraPanel } from "@/components/jira/ui";
import { members, isDoneStatus } from "@/lib/data";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "People — Treats24" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { tasks } = useWorkspace();

  return (
    <JiraPage>
      <JiraPageHeader
        title="People"
        subtitle={`${members.length} team members`}
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "People" }]}
        actions={<JiraBtn variant="primary"><Plus className="h-4 w-4" /> Invite people</JiraBtn>}
      />
      <JiraPanel noPadding>
        <div className="grid grid-cols-[1fr_140px_100px_100px_80px] gap-3 border-b border-jira-border bg-jira-bg px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-jira-muted">
          <span>User</span>
          <span>Role</span>
          <span>Assigned</span>
          <span>Done</span>
          <span className="text-right">Rate</span>
        </div>
        {members.length === 0 ? (
          <JiraEmpty message="No team members yet." />
        ) : (
          members.map((m) => {
            const assigned = tasks.filter((t) => t.assigneeId === m.id);
            const completed = assigned.filter((t) => isDoneStatus(t.status)).length;
            const rate = assigned.length ? Math.round((completed / assigned.length) * 100) : 0;
            return (
              <div key={m.id} className="grid grid-cols-[1fr_140px_100px_100px_80px] items-center gap-3 border-b border-jira-border px-4 py-3 last:border-0 hover:bg-jira-hover">
                <div className="flex items-center gap-3">
                  <AssigneeAvatar initials={m.avatar} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-jira-text">{m.name}</p>
                    <p className="truncate text-xs text-jira-muted">{m.email}</p>
                  </div>
                </div>
                <span className="text-xs text-jira-subtle">{m.role}</span>
                <span className="text-sm tabular-nums text-jira-text">{assigned.length}</span>
                <span className="text-sm tabular-nums text-jira-success">{completed}</span>
                <span className="text-right text-sm tabular-nums text-jira-text">{rate}%</span>
              </div>
            );
          })
        )}
      </JiraPanel>
    </JiraPage>
  );
}
