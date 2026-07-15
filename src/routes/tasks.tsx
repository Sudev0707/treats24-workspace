import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import {
  JiraBtn,
  JiraKanbanBoard,
  JiraKanbanCard,
  JiraKanbanColumn,
  JiraLinkBtn,
  JiraPage,
  JiraPageHeader,
  JiraPanel,
  statusDot,
} from "@/components/jira/ui";
import {
  TicketListView,
  TicketViewToggle,
  WorkTypeIcon,
  type TicketListItem,
} from "@/components/ticket/ticket-ui";
import { useWorkspace } from "@/lib/workspace-store";
import { taskStatuses, getMember, getProjectById, isTopLevelWorkItem, type Issue, type Task, type TaskStatus } from "@/lib/data";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Work items — Treats24" },
      { name: "description", content: "List and board for work items across all projects." },
    ],
  }),
  component: TasksPage,
});

const columnDot = statusDot;

function TasksPage() {
  const matchRoute = useMatchRoute();
  const isTaskDetail = matchRoute({ to: "/tasks/$taskId" });
  const { tasks, issues, projects, updateTask, updateIssue } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");

  const workItems = useMemo<TicketListItem[]>(() => {
    const taskItems: TicketListItem[] = tasks.filter(isTopLevelWorkItem).map((t) => {
      const assignee = getMember(t.assigneeId);
      const reporter = getMember(t.reporterId);
      const project = getProjectById(projects, t.projectId);
      return {
        id: t.id,
        entityKind: "task" as const,
        workType: "task",
        summary: t.title,
        status: t.status,
        priority: t.priority,
        projectName: project.name,
        assigneeInitials: assignee.avatar,
        reporterInitials: reporter.avatar,
        createdAt: t.createdAt,
        to: "/tasks/$taskId",
        params: { taskId: t.id },
      };
    });
    const issueItems: TicketListItem[] = issues.filter(isTopLevelWorkItem).map((i) => {
      const assignee = getMember(i.assigneeId);
      const reporter = getMember(i.reporterId);
      const project = getProjectById(projects, i.projectId);
      return {
        id: i.id,
        entityKind: "issue" as const,
        workType: i.type,
        summary: i.title,
        status: i.status,
        priority: i.severity,
        projectName: project.name,
        assigneeInitials: assignee.avatar,
        reporterInitials: reporter.avatar,
        createdAt: i.createdAt,
        to: "/issues/$issueId",
        params: { issueId: i.id },
      };
    });
    return [...taskItems, ...issueItems];
  }, [tasks, issues, projects]);

  const boardItems = useMemo(
    () => [
      ...tasks.filter(isTopLevelWorkItem).map((item) => ({ kind: "task" as const, item })),
      ...issues.filter(isTopLevelWorkItem).map((item) => ({ kind: "issue" as const, item })),
    ],
    [tasks, issues],
  );

  if (isTaskDetail) {
    return <Outlet />;
  }

  return (
    <JiraPage>
      <JiraPageHeader
        title="Work items"
        subtitle={`${workItems.length} tickets across all projects`}
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Work items" }]}
        actions={
          <>
            <JiraLinkBtn to="/queries">Filters</JiraLinkBtn>
            <JiraBtn variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create
            </JiraBtn>
          </>
        }
      />

      <TicketViewToggle view={view} onViewChange={setView} />

      {view === "list" ? (
        <TicketListView
          items={workItems}
          showProject
          showReporter
          showTypeBadge
          groupByStatus
          emptyMessage="No work items yet. Use Create above to add one."
          onStatusChange={(id, kind, status) => {
            if (kind === "task") updateTask(id, { status });
            else updateIssue(id, { status });
          }}
          onPriorityChange={(id, kind, priority) => {
            if (kind === "task") updateTask(id, { priority });
            else updateIssue(id, { severity: priority });
          }}
        />
      ) : (
        <JiraKanbanBoard>
          {taskStatuses.map((status) => {
            const colItems = boardItems.filter(({ item }) => item.status === status);
            return (
              <JiraKanbanColumn
                key={status}
                title={status}
                count={colItems.length}
                dotColor={columnDot[status]}
              >
                {colItems.map(({ kind, item }) => {
                  const a = getMember(item.assigneeId);
                  const p = getProjectById(projects, item.projectId);
                  const isTask = kind === "task";
                  const workType = isTask ? "task" : (item as Issue).type;
                  return (
                    <div key={item.id} className="group">
                      <JiraKanbanCard
                        id={item.id}
                        title={item.title}
                        projectName={p.name}
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

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </JiraPage>
  );
}
