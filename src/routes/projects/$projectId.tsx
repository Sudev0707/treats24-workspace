import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bug,
  CheckSquare,
  Search,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { CreateQueryDialog } from "@/components/create-query-dialog";
import {
  ProjectHeaderBar,
  ProjectSidebar,
  type ProjectView,
} from "@/components/project/project-sidebar";
import {
  AssigneeAvatar,
  JiraBtn,
  JiraEmpty,
  JiraKanbanBoard,
  JiraKanbanCard,
  JiraKanbanColumn,
  JiraPage,
  JiraPanel,
  StatusLozenge,
  statusDot,
} from "@/components/jira/ui";
import {
  PriorityLozenge,
  TicketKeyLink,
  TicketListView,
  type TicketListItem,
  WorkTypeIcon,
} from "@/components/ticket/ticket-ui";
import { useWorkspace } from "@/lib/workspace-store";
import {
  BACKLOG_STATUSES,
  getMember,
  isDoneStatus,
  isTopLevelWorkItem,
  taskStatuses,
  type Issue,
  type Project,
  type Task,
  type TaskStatus,
} from "@/lib/data";
import { applyIssueFilters, applyTaskFilters, describeFilters } from "@/lib/query-utils";

type WorkKind = "task" | Issue["type"];
type BoardItem = { kind: "task"; item: Task } | { kind: "issue"; item: Issue };

type ProjectSearch = { view?: ProjectView };

const projectViews: ProjectView[] = ["summary", "list", "board", "backlog", "issues", "filters"];

function defaultViewForProject(_project: Project): ProjectView {
  return "list";
}

export const Route = createFileRoute("/projects/$projectId")({
  validateSearch: (search: Record<string, unknown>): ProjectSearch => ({
    view: projectViews.includes(search.view as ProjectView) ? (search.view as ProjectView) : undefined,
  }),
  component: ProjectDetailPage,
});

function createDefaultsForView(view: ProjectView): { defaultStatus?: TaskStatus; defaultKind?: WorkKind } {
  switch (view) {
    case "issues":
      return { defaultKind: "Bug" };
    case "backlog":
      return { defaultStatus: "Backlog" };
    default:
      return {};
  }
}

function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const { view: urlView } = Route.useSearch();
  const { projects, tasks, issues, queries, updateTask, updateIssue, activity } = useWorkspace();
  const project = projects.find((p) => p.id === projectId);

  const allProjectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId],
  );
  const projectTasks = useMemo(
    () => allProjectTasks.filter(isTopLevelWorkItem),
    [allProjectTasks],
  );
  const allProjectIssues = useMemo(
    () => issues.filter((i) => i.projectId === projectId),
    [issues, projectId],
  );
  const projectIssues = useMemo(
    () => allProjectIssues.filter(isTopLevelWorkItem),
    [allProjectIssues],
  );
  const projectQueries = useMemo(
    () => queries.filter((q) => !q.projectId || q.projectId === projectId),
    [queries, projectId],
  );
  const boardItems = useMemo<BoardItem[]>(
    () => [
      ...projectTasks.map((item) => ({ kind: "task" as const, item })),
      ...projectIssues.map((item) => ({ kind: "issue" as const, item })),
    ],
    [projectTasks, projectIssues],
  );

  const [view, setView] = useState<ProjectView>(urlView ?? "summary");
  const [ticketOpen, setTicketOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [ticketDefaults, setTicketDefaults] = useState<{
    defaultStatus?: TaskStatus;
    defaultKind?: WorkKind;
  }>({});

  useEffect(() => {
    if (!project) return;
    setView(urlView ?? defaultViewForProject(project));
  }, [urlView, project]);

  const setProjectView = (next: ProjectView) => {
    setView(next);
    navigate({
      to: "/projects/$projectId",
      params: { projectId },
      search: { view: next },
      replace: true,
    });
  };

  const recentWork = useMemo(() => {
    const items: ({ kind: "task"; item: Task } | { kind: "issue"; item: Issue })[] = [
      ...tasks.filter((t) => t.projectId === projectId).map((item) => ({ kind: "task" as const, item })),
      ...issues.filter((i) => i.projectId === projectId).map((item) => ({ kind: "issue" as const, item })),
    ];
    return items.slice(0, 8);
  }, [tasks, issues, projectId]);

  const statusBreakdown = useMemo(
    () =>
      taskStatuses.map((status) => ({
        status,
        count: projectTasks.filter((t) => t.status === status).length,
      })),
    [projectTasks],
  );

  const ticketListItems = useMemo<TicketListItem[]>(
    () =>
      boardItems.map(({ kind, item }) => {
        const isTask = kind === "task";
        const assignee = getMember(item.assigneeId);
        const reporter = getMember(item.reporterId);
        return {
          id: item.id,
          entityKind: isTask ? ("task" as const) : ("issue" as const),
          workType: isTask ? "task" : (item as Issue).type,
          summary: item.title,
          status: item.status,
          priority: isTask ? (item as Task).priority : (item as Issue).severity,
          assigneeInitials: assignee.avatar,
          reporterInitials: reporter.avatar,
          createdAt: item.createdAt,
          to: isTask ? "/tasks/$taskId" : "/issues/$issueId",
          params: isTask ? { taskId: item.id } : { issueId: item.id },
        };
      }),
    [boardItems],
  );

  if (!project) throw notFound();

  const doneCount = allProjectTasks.filter((t) => isDoneStatus(t.status)).length;
  const progress = allProjectTasks.length ? Math.round((doneCount / allProjectTasks.length) * 100) : project.progress;

  const projectActivity = activity.slice(0, 5);

  const openCreateTicket = (opts?: { status?: TaskStatus; kind?: WorkKind }) => {
    setTicketDefaults(opts ?? createDefaultsForView(view));
    setTicketOpen(true);
  };

  return (
    <JiraPage>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <ProjectSidebar
          project={project}
          activeView={view}
          onViewChange={setProjectView}
          issueCount={projectIssues.length}
          taskCount={projectTasks.length}
        />

        <div className="min-w-0 flex-1">
          <ProjectHeaderBar project={project} onCreateTicket={() => openCreateTicket()} />

          {view === "summary" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold text-primary">{project.key}</p>
                    <h2 className="font-display text-lg font-semibold text-foreground">{project.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
                    {project.template.replace("-", " ")}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex -space-x-1">
                    {project.memberIds.map((id) => (
                      <AssigneeAvatar key={id} initials={getMember(id).avatar} size="sm" />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{project.memberIds.length} members</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold tabular-nums text-primary">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Tasks", value: projectTasks.length, icon: CheckSquare, color: "text-primary" },
                  { label: "Issues", value: projectIssues.length, icon: Bug, color: "text-destructive" },
                  { label: "Done", value: doneCount, icon: TrendingUp, color: "text-cta" },
                  { label: "Members", value: project.memberIds.length, icon: Users, color: "text-muted-foreground" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-xl border border-border/60 bg-card p-4 shadow-soft">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                      </div>
                      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <JiraPanel>
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold">Status overview</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {statusBreakdown.map(({ status, count }) => (
                      <div key={status} className="flex items-center justify-between px-4 py-2.5">
                        <StatusLozenge status={status} />
                        <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </JiraPanel>

                <JiraPanel noPadding>
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold">Recent work</h3>
                    <button
                      type="button"
                      onClick={() => setProjectView("list")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View list
                    </button>
                  </div>
                  {recentWork.length === 0 ? (
                    <JiraEmpty message="No work items yet. Use Create above to add one." />
                  ) : (
                    recentWork.map(({ kind, item }) => {
                      const assignee = getMember(item.assigneeId);
                      const isTask = kind === "task";
                      const to = isTask ? "/tasks/$taskId" : "/issues/$issueId";
                      const params = isTask ? { taskId: item.id } : { issueId: item.id };
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 hover:bg-secondary/50"
                        >
                          {isTask ? (
                            <WorkTypeIcon type="task" />
                          ) : (
                            <WorkTypeIcon type={(item as Issue).type} />
                          )}
                          <TicketKeyLink ticketKey={item.id} to={to} params={params} />
                          <Link to={to} params={params} className="min-w-0 flex-1 truncate text-sm hover:underline">
                            {item.title}
                          </Link>
                          <StatusLozenge status={item.status} />
                          <AssigneeAvatar initials={assignee.avatar} size="sm" />
                        </div>
                      );
                    })
                  )}
                </JiraPanel>
              </div>

              {projectActivity.length > 0 && (
                <JiraPanel>
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Recent activity
                    </h3>
                  </div>
                  <ul className="divide-y divide-border">
                    {projectActivity.map((a) => (
                      <li key={a.id} className="px-4 py-2.5 text-sm">
                        <span className="font-medium">{getMember(a.userId).name}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>{" "}
                        <span className="text-primary">{a.target}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{a.time}</span>
                      </li>
                    ))}
                  </ul>
                </JiraPanel>
              )}
            </div>
          )}

          {view === "list" && (
            <>
              <div className="mb-3">
                <h2 className="font-display text-base font-semibold">List</h2>
                <p className="text-xs text-muted-foreground">{boardItems.length} work items · grouped by status</p>
              </div>
              <TicketListView
                items={ticketListItems}
                showTypeBadge
                groupByStatus
                emptyMessage="No work items in this project yet. Use Create above to add one."
                onStatusChange={(id, kind, status) => {
                  if (kind === "task") updateTask(id, { status });
                  else updateIssue(id, { status });
                }}
              />
            </>
          )}

          {view === "board" && (
            <>
              <div className="mb-3">
                <h2 className="font-display text-base font-semibold">Board</h2>
                <p className="text-xs text-muted-foreground">{boardItems.length} work items · drag status from card menu</p>
              </div>
              {boardItems.length === 0 ? (
                <JiraPanel>
                  <JiraEmpty message="No work on the board yet. Use Create above to add one." />
                </JiraPanel>
              ) : (
              <JiraKanbanBoard>
                {taskStatuses.map((status) => {
                  const colItems = boardItems.filter(({ item }) => item.status === status);
                  return (
                    <JiraKanbanColumn
                      key={status}
                      title={status}
                      count={colItems.length}
                      dotColor={statusDot[status as TaskStatus]}
                    >
                      {colItems.map(({ kind, item }) => {
                        const a = getMember(item.assigneeId);
                        const isTask = kind === "task";
                        const workType = isTask ? "task" : (item as Issue).type;
                        return (
                          <div key={item.id} className="group">
                            <JiraKanbanCard
                              id={item.id}
                              title={item.title}
                              priority={isTask ? (item as Task).priority : (item as Issue).severity}
                              assignee={a.avatar}
                              workType={workType}
                              typeIcon={<WorkTypeIcon type={workType} className="h-3.5 w-3.5" />}
                              to={isTask ? "/tasks/$taskId" : "/issues/$issueId"}
                              params={isTask ? { taskId: item.id } : { issueId: item.id }}
                            />
                            <select
                              className="mt-1 w-full rounded border border-border bg-card px-1.5 py-0.5 text-[10px] opacity-0 group-hover:opacity-100"
                              value={item.status}
                              onChange={(e) => {
                                const next = e.target.value as TaskStatus;
                                if (isTask) updateTask(item.id, { status: next });
                                else updateIssue(item.id, { status: next });
                              }}
                            >
                              {taskStatuses.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </JiraKanbanColumn>
                  );
                })}
              </JiraKanbanBoard>
              )}
            </>
          )}

          {view === "issues" && (
            <>
              <div className="mb-3">
                <h2 className="font-display text-base font-semibold">Issues</h2>
              </div>
              <TicketListView
                items={projectIssues.map((i) => {
                  const assignee = getMember(i.assigneeId);
                  const reporter = getMember(i.reporterId);
                  return {
                    id: i.id,
                    entityKind: "issue" as const,
                    workType: i.type,
                    summary: i.title,
                    status: i.status,
                    priority: i.severity,
                    assigneeInitials: assignee.avatar,
                    reporterInitials: reporter.avatar,
                    createdAt: i.createdAt,
                    to: "/issues/$issueId",
                    params: { issueId: i.id },
                  };
                })}
                showTypeBadge
                emptyMessage="No issues in this project. Use Create above to add one."
                onStatusChange={(_id, _kind, status) => updateIssue(_id, { status })}
              />
            </>
          )}

          {view === "backlog" && (
            <>
              <div className="mb-3">
                <h2 className="font-display text-base font-semibold">Backlog</h2>
              </div>
              <JiraPanel noPadding>
                {boardItems.filter(({ item }) => BACKLOG_STATUSES.includes(item.status)).length === 0 ? (
                  <JiraEmpty message="Backlog is empty. Use Create above to add one." />
                ) : (
                  boardItems
                    .filter(({ item }) => BACKLOG_STATUSES.includes(item.status))
                    .map(({ kind, item }) => {
                      const isTask = kind === "task";
                      const workType = isTask ? "task" : (item as Issue).type;
                      const priority = isTask ? (item as Task).priority : (item as Issue).severity;
                      const to = isTask ? "/tasks/$taskId" : "/issues/$issueId";
                      const params = isTask ? { taskId: item.id } : { issueId: item.id };
                      return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 hover:bg-secondary/50"
                      >
                        <WorkTypeIcon type={workType} />
                        <TicketKeyLink ticketKey={item.id} to={to} params={params} />
                        <Link to={to} params={params} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline">
                          {item.title}
                        </Link>
                        <PriorityLozenge priority={priority} />
                        <StatusLozenge status={item.status} />
                        <AssigneeAvatar initials={getMember(item.assigneeId).avatar} size="sm" />
                      </div>
                      );
                    })
                )}
              </JiraPanel>
            </>
          )}

          {view === "filters" && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">Filters</h2>
                <JiraBtn variant="default" onClick={() => setQueryOpen(true)}>
                  <Search className="h-4 w-4" /> New filter
                </JiraBtn>
              </div>
              <div className="space-y-2">
                {projectQueries.length === 0 ? (
                  <JiraPanel>
                    <JiraEmpty message="No saved filters for this project." />
                  </JiraPanel>
                ) : (
                  projectQueries.map((q) => {
                    const results =
                      q.filters.entityType === "tasks"
                        ? applyTaskFilters(tasks, { ...q.filters, projectId: q.filters.projectId ?? projectId })
                        : applyIssueFilters(issues, { ...q.filters, projectId: q.filters.projectId ?? projectId });
                    return (
                      <JiraPanel key={q.id}>
                        <div className="flex items-start justify-between gap-3 p-4">
                          <div>
                            <Link to="/queries" search={{ q: q.id }} className="text-sm font-medium text-primary hover:underline">
                              {q.name}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">{describeFilters(q.filters)}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{results.length} results</span>
                        </div>
                      </JiraPanel>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <CreateTicketDialog
        open={ticketOpen}
        onOpenChange={setTicketOpen}
        defaultProjectId={projectId}
        defaultStatus={ticketDefaults.defaultStatus ?? "To Do"}
        defaultKind={ticketDefaults.defaultKind ?? "task"}
        navigateOnCreate={false}
      />
      <CreateQueryDialog open={queryOpen} onOpenChange={setQueryOpen} defaultProjectId={projectId} />
    </JiraPage>
  );
}
