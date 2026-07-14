import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import {
  AssigneeAvatar,
  JiraBtn,
  JiraEmpty,
  JiraPage,
  JiraPageHeader,
  JiraPanel,
} from "@/components/jira/ui";
import { useWorkspace } from "@/lib/workspace-store";
import { getMember, isDoneStatus } from "@/lib/data";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [{ title: "Projects — Treats24" }],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const isProjectDetail = matchRoute({ to: "/projects/$projectId" });
  const { projects, tasks, issues } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  if (isProjectDetail) {
    return <Outlet />;
  }

  return (
    <JiraPage>
      <JiraPageHeader
        title="Projects"
        subtitle={`View all ${projects.length} projects in your workspace`}
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Projects" }]}
        actions={
          <JiraBtn variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create project
          </JiraBtn>
        }
      />

      <JiraPanel noPadding>
        <div className="hidden grid-cols-[72px_1fr_100px_100px_120px_80px] gap-3 border-b border-border bg-secondary/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Key</span>
          <span>Project</span>
          <span>Lead</span>
          <span>Category</span>
          <span>Work items</span>
          <span className="text-right">Progress</span>
        </div>
        {projects.length === 0 ? (
          <JiraEmpty
            message="No projects yet. Use Create above to add one."
          />
        ) : (
        projects.map((p) => {
          const lead = getMember(p.leadId);
          const taskCount = tasks.filter((t) => t.projectId === p.id).length;
          const issueCount = issues.filter((i) => i.projectId === p.id).length;
          const doneCount = tasks.filter(
            (t) => t.projectId === p.id && isDoneStatus(t.status),
          ).length;
          const pct = taskCount ? Math.round((doneCount / taskCount) * 100) : p.progress;
          return (
            <Link
              key={p.id}
              to="/projects/$projectId"
              params={{ projectId: p.id }}
              className="grid grid-cols-1 gap-2 border-b border-border px-4 py-3 last:border-0 hover:bg-secondary/50 sm:grid-cols-[72px_1fr_100px_100px_120px_80px] sm:items-center sm:gap-3 sm:py-3"
            >
              <span className="font-mono text-xs font-semibold text-primary">{p.key}</span>
              <div className="flex min-w-0 items-center gap-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded bg-gradient-to-br ${p.color} text-xs font-bold text-white`}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-primary hover:underline">{p.name}</p>
                    <Star className="h-3 w-3 shrink-0 fill-cta text-cta" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{p.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AssigneeAvatar initials={lead.avatar} size="sm" />
                <span className="hidden truncate text-xs text-muted-foreground lg:inline">{lead.name}</span>
              </div>
              <span className="text-xs capitalize text-muted-foreground">{p.tags[0] ?? "software"}</span>
              <span className="text-xs text-muted-foreground">{taskCount} tasks · {issueCount} issues</span>
              <span className="text-right text-xs font-medium tabular-nums">{pct}%</span>
            </Link>
          );
        })
        )}
      </JiraPanel>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => navigate({ to: "/projects/$projectId", params: { projectId: id } })}
      />
    </JiraPage>
  );
}
