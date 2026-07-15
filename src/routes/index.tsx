import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bug, CheckSquare, ChevronRight, CircleDot, Clock, LayoutGrid, Plus, Star } from "lucide-react";
import {
  AssigneeAvatar,
  JiraBtn,
  JiraLinkBtn,
  JiraPage,
  JiraPageHeader,
  JiraPanel,
  JiraTab,
  JiraTabsList,
  StatusLozenge,
} from "@/components/jira/ui";
import { PriorityLozenge, TicketKeyLink } from "@/components/ticket/ticket-ui";
import { BACKLOG_STATUSES, getMember, getProjectById, isDoneStatus, type Issue, type Task, type Project } from "@/lib/data";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "For you — Treats24" }],
  }),
  component: Dashboard,
});

type WorkItem = { kind: "task"; item: Task } | { kind: "issue"; item: Issue };

function WorkRow({ work, projects }: { work: WorkItem; projects: Project[] }) {
  const project = getProjectById(projects, work.item.projectId);
  const assignee = getMember(work.item.assigneeId);
  const isTask = work.kind === "task";
  const item = work.item;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-jira-border px-4 py-2.5 last:border-0 hover:bg-jira-hover sm:grid-cols-[28px_90px_1fr_120px_110px_80px_32px]">
      {isTask ? (
        <CheckSquare className="hidden h-4 w-4 text-jira-link sm:block" />
      ) : (
        <Bug className="hidden h-4 w-4 text-jira-danger sm:block" />
      )}
      <TicketKeyLink
        ticketKey={item.id}
        to={isTask ? "/tasks/$taskId" : "/issues/$issueId"}
        params={isTask ? { taskId: item.id } : { issueId: item.id }}
        className="hidden sm:block"
      />
      <Link
        to={isTask ? "/tasks/$taskId" : "/issues/$issueId"}
        params={isTask ? { taskId: item.id } : { issueId: item.id }}
        className="min-w-0 sm:col-span-1 hover:underline"
      >
        <p className="truncate text-sm text-jira-text">{item.title}</p>
        <p className="truncate text-xs text-jira-muted sm:hidden">{item.id} · {project.name}</p>
      </Link>
      <span className="hidden truncate text-xs text-jira-subtle sm:block">{project.name}</span>
      <StatusLozenge status={item.status} />
      <div className="hidden sm:block">
        <PriorityLozenge priority={isTask ? (item as Task).priority : (item as Issue).severity} />
      </div>
      <AssigneeAvatar initials={assignee.avatar} size="sm" />
    </div>
  );
}

function Dashboard() {
  const { projects, tasks, issues, activity, currentUserId } = useWorkspace();
  const [tab, setTab] = useState("assigned");

  const assignedTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === currentUserId && !isDoneStatus(t.status)),
    [tasks, currentUserId],
  );
  const reportedIssues = useMemo(() => issues.filter((i) => i.reporterId === currentUserId), [issues, currentUserId]);
  const openIssues = useMemo(() => issues.filter((i) => !isDoneStatus(i.status)), [issues]);
  const recentWork = useMemo((): WorkItem[] => {
    return [
      ...tasks.slice(0, 6).map((item) => ({ kind: "task" as const, item })),
      ...issues.slice(0, 4).map((item) => ({ kind: "issue" as const, item })),
    ].slice(0, 8);
  }, [tasks, issues]);

  const tabItems: Record<string, WorkItem[]> = {
    assigned: assignedTasks.map((item) => ({ kind: "task", item })),
    reported: reportedIssues.map((item) => ({ kind: "issue", item })),
    open: openIssues.map((item) => ({ kind: "issue", item })),
    recent: recentWork,
  };

  const statusSummary = [
    { label: "To do", count: tasks.filter((t) => BACKLOG_STATUSES.includes(t.status)).length, color: "bg-primary/40" },
    { label: "In progress", count: tasks.filter((t) => t.status === "In Progress").length, color: "bg-cta" },
    { label: "In review", count: tasks.filter((t) => t.status === "In Review").length, color: "bg-primary" },
    { label: "Done", count: tasks.filter((t) => isDoneStatus(t.status)).length, color: "bg-success" },
  ];

  const myProjects = projects.filter((p) => p.memberIds.includes(currentUserId)).slice(0, 5);
  const overdue = tasks.filter(
    (t) => t.assigneeId === currentUserId && new Date(t.dueDate) < new Date() && !isDoneStatus(t.status),
  );

  return (
    <JiraPage>
      <JiraPageHeader
        title="For you"
        subtitle={`${assignedTasks.length} assigned · ${openIssues.length} open issues · ${projects.length} projects`}
        actions={
          <>
            <JiraLinkBtn to="/projects"><LayoutGrid className="h-3.5 w-3.5" /> Projects</JiraLinkBtn>
            <JiraLinkBtn to="/tasks"><Plus className="h-4 w-4" /> Create</JiraLinkBtn>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {statusSummary.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded border border-jira-border bg-jira-surface px-3 py-1.5 text-xs text-jira-subtle">
            <span className={`h-2 w-2 rounded-full ${s.color}`} />
            <span className="font-semibold tabular-nums text-jira-text">{s.count}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-jira-text">{overdue.length} overdue items</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {overdue.slice(0, 3).map((t) => (
                    <Link key={t.id} to="/tasks/$taskId" params={{ taskId: t.id }} className="text-xs text-jira-link hover:underline">
                      {t.id}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          <JiraPanel title="Your work" action={<Link to="/tasks" className="text-xs text-jira-link hover:underline">View all</Link>} noPadding>
            <JiraTabsList>
              {[
                { id: "assigned", label: "Assigned to me", count: assignedTasks.length },
                { id: "reported", label: "Reported by me", count: reportedIssues.length },
                { id: "open", label: "Open issues", count: openIssues.length },
                { id: "recent", label: "Recent", count: recentWork.length },
              ].map((t) => (
                <JiraTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} count={t.count}>
                  {t.label}
                </JiraTab>
              ))}
            </JiraTabsList>
            <div className="hidden grid-cols-[28px_90px_1fr_120px_110px_80px_32px] gap-3 border-b border-jira-border bg-jira-bg px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-jira-muted sm:grid">
              <span /><span>Key</span><span>Summary</span><span>Project</span><span>Status</span><span>Priority</span><span />
            </div>
            {tabItems[tab]?.length ? (
              tabItems[tab].map((work) => <WorkRow key={`${work.kind}-${work.item.id}`} work={work} projects={projects} />)
            ) : (
              <div className="py-12 text-center">
                <CircleDot className="mx-auto h-8 w-8 text-jira-border" />
                <p className="mt-3 text-sm text-jira-subtle">No work items</p>
              </div>
            )}
          </JiraPanel>

          <JiraPanel title="Projects" action={<Link to="/projects" className="text-xs text-jira-link hover:underline">See all</Link>} noPadding>
            {projects.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-jira-subtle">No projects yet</p>
                <Link to="/projects" className="mt-2 inline-block text-xs text-jira-link hover:underline">Create your first project</Link>
              </div>
            ) : (
              projects.slice(0, 5).map((p) => {
              const lead = getMember(p.leadId);
              const taskCount = tasks.filter((t) => t.projectId === p.id).length;
              return (
                <Link
                  key={p.id}
                  to="/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="flex items-center gap-3 border-b border-jira-border px-4 py-3 last:border-0 hover:bg-jira-hover"
                >
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded bg-gradient-to-br ${p.color} text-xs font-bold text-white`}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-jira-link">{p.name}</p>
                    <p className="text-xs text-jira-muted">{taskCount} work items</p>
                  </div>
                  <AssigneeAvatar initials={lead.avatar} size="sm" />
                </Link>
              );
            })
            )}
          </JiraPanel>
        </div>

        <div className="space-y-5">
          <JiraPanel title="Starred" noPadding>
            {myProjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-jira-subtle">No starred projects</div>
            ) : (
              myProjects.map((p) => (
              <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="flex items-center gap-2 border-b border-jira-border px-4 py-2.5 last:border-0 hover:bg-jira-hover">
                <Star className="h-3.5 w-3.5 fill-[#FFAB00] text-[#FFAB00]" />
                <span className="min-w-0 flex-1 truncate text-sm text-jira-text">{p.name}</span>
                <ChevronRight className="h-4 w-4 text-jira-muted" />
              </Link>
              ))
            )}
          </JiraPanel>

          <JiraPanel title="Quick links" noPadding>
            <div className="p-1">
              {[
                { label: "Board", to: "/tasks" },
                { label: "Issues", to: "/issues" },
                { label: "Filters", to: "/queries" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block rounded px-3 py-2 text-sm text-jira-subtle hover:bg-jira-hover hover:text-jira-link">
                  {l.label}
                </Link>
              ))}
            </div>
          </JiraPanel>

          <JiraPanel title="Recent activity" noPadding>
            <div className="max-h-80 overflow-y-auto px-4 py-2">
              {activity.length === 0 ? (
                <div className="py-8 text-center text-sm text-jira-subtle">No recent activity</div>
              ) : (
                activity.slice(0, 8).map((a) => {
                const m = getMember(a.userId);
                return (
                  <div key={a.id} className="border-b border-jira-border py-2.5 last:border-0">
                    <p className="text-xs leading-relaxed text-jira-subtle">
                      <span className="font-medium text-jira-text">{m.name}</span> {a.action}{" "}
                      <span className="font-medium text-jira-text">{a.target}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-jira-muted">{a.time}</p>
                  </div>
                );
              })
              )}
            </div>
          </JiraPanel>
        </div>
      </div>
    </JiraPage>
  );
}
