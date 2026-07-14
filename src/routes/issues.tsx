import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import {
  JiraBtn,
  JiraLinkBtn,
  JiraPage,
  JiraPageHeader,
} from "@/components/jira/ui";
import {
  TicketListView,
  WorkTypeIcon,
  type TicketListItem,
} from "@/components/ticket/ticket-ui";
import { useWorkspace } from "@/lib/workspace-store";
import { getMember, getProjectById, isTopLevelWorkItem, type IssueType } from "@/lib/data";

export const Route = createFileRoute("/issues")({
  head: () => ({
    meta: [{ title: "Issues — Treats24" }],
  }),
  component: IssuesPage,
});

function IssuesPage() {
  const matchRoute = useMatchRoute();
  const isIssueDetail = matchRoute({ to: "/issues/$issueId" });
  const { issues, projects, updateIssue } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const types: IssueType[] = ["Bug", "Feature", "Improvement", "Hotfix", "Documentation"];

  const listItems = useMemo<TicketListItem[]>(
    () =>
      issues.filter(isTopLevelWorkItem).map((i) => {
        const assignee = getMember(i.assigneeId);
        const reporter = getMember(i.reporterId);
        const proj = getProjectById(projects, i.projectId);
        return {
          id: i.id,
          entityKind: "issue" as const,
          workType: i.type,
          summary: i.title,
          status: i.status,
          priority: i.severity,
          projectName: proj.name,
          assigneeInitials: assignee.avatar,
          reporterInitials: reporter.avatar,
          createdAt: i.createdAt,
          to: "/issues/$issueId",
          params: { issueId: i.id },
        };
      }),
    [issues, projects],
  );

  if (isIssueDetail) {
    return <Outlet />;
  }

  return (
    <JiraPage>
      <JiraPageHeader
        title="Issues"
        subtitle={`${issues.length} work items across all projects`}
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Issues" }]}
        actions={
          <>
            <JiraLinkBtn to="/queries">Filters</JiraLinkBtn>
            <JiraBtn variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create
            </JiraBtn>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((type) => {
          const n = issues.filter((i) => i.type === type).length;
          return (
            <div
              key={type}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs shadow-soft"
            >
              <WorkTypeIcon type={type} className="h-3.5 w-3.5" />
              <span className="text-muted-foreground">{type}</span>
              <span className="font-semibold tabular-nums text-foreground">{n}</span>
            </div>
          );
        })}
      </div>

      <TicketListView
        items={listItems}
        showProject
        showReporter
        showTypeBadge
        emptyMessage="No issues yet. Use Create above to add one."
        onStatusChange={(id, _kind, status) => updateIssue(id, { status })}
      />

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} defaultKind="Bug" />
    </JiraPage>
  );
}
