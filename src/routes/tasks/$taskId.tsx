import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { useWorkspace } from "@/lib/workspace-store";
import {
  findWorkItem,
  getChildWorkItems,
  getLinkableWorkItems,
  getLinkedWorkItems,
  getMember,
  getProjectById,
  getSiblingTicketNav,
} from "@/lib/data";
import {
  NestedTicketsPanel,
  PriorityLozenge,
  TicketDetailView,
  TicketSidebarField,
  type NestedTicketItem,
} from "@/components/ticket/ticket-ui";

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const { tasks, issues, projects, updateTask, updateIssue, linkWorkItem, unlinkWorkItem } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw notFound();

  const assignee = getMember(task.assigneeId);
  const reporter = getMember(task.reporterId);
  const project = getProjectById(projects, task.projectId);
  const parent = task.parentId ? findWorkItem(task.parentId, tasks, issues) : undefined;

  const childItems = useMemo<NestedTicketItem[]>(
    () =>
      getChildWorkItems(task.id, tasks, issues).map(({ kind, item }) => {
        const a = getMember(item.assigneeId);
        const isTask = kind === "task";
        return {
          id: item.id,
          entityKind: kind,
          workType: isTask ? (item.parentId ? "subtask" : "task") : item.type,
          summary: item.title,
          status: item.status,
          assigneeInitials: a.avatar,
          createdAt: item.createdAt,
          to: isTask ? "/tasks/$taskId" : "/issues/$issueId",
          params: isTask ? { taskId: item.id } : { issueId: item.id },
        };
      }),
    [task.id, tasks, issues],
  );

  const siblingNav = useMemo(
    () => getSiblingTicketNav(task.id, task.projectId, tasks, issues),
    [task.id, task.projectId, tasks, issues],
  );

  const linkedItems = useMemo<NestedTicketItem[]>(
    () =>
      getLinkedWorkItems(task.id, tasks, issues).map(({ kind, item }) => {
        const a = getMember(item.assigneeId);
        const isTask = kind === "task";
        return {
          id: item.id,
          entityKind: kind,
          workType: isTask ? (item.parentId ? "subtask" : "task") : item.type,
          summary: item.title,
          status: item.status,
          assigneeInitials: a.avatar,
          createdAt: item.createdAt,
          to: isTask ? "/tasks/$taskId" : "/issues/$issueId",
          params: isTask ? { taskId: item.id } : { issueId: item.id },
        };
      }),
    [task.id, tasks, issues],
  );

  const linkCandidates = useMemo(
    () => getLinkableWorkItems(task.id, tasks, issues),
    [task.id, tasks, issues],
  );

  const backTo = {
    to: "/projects/$projectId" as const,
    params: { projectId: project.id },
  };

  return (
    <>
      <TicketDetailView
        ticketKey={task.id}
        title={task.title}
        onTitleChange={(title) => updateTask(task.id, { title })}
        description={task.description}
        onDescriptionChange={(description) => updateTask(task.id, { description })}
        workType={task.parentId ? "subtask" : "task"}
        status={task.status}
        onStatusChange={(status) => updateTask(task.id, { status })}
        backTo={backTo}
        prevTicket={siblingNav.prev}
        nextTicket={siblingNav.next}
        createdAt={task.createdAt}
        updatedAt={task.createdAt}
        extraPanels={
          <NestedTicketsPanel
            items={childItems}
            onCreate={() => setCreateOpen(true)}
            onStatusChange={(id, kind, status) => {
              if (kind === "task") updateTask(id, { status });
              else updateIssue(id, { status });
            }}
          />
        }
        linkedWorkItems={linkedItems}
        linkCandidates={linkCandidates}
        onLinkWorkItem={(targetId) => linkWorkItem(task.id, targetId)}
        onUnlinkWorkItem={(targetId) => unlinkWorkItem(task.id, targetId)}
        comments={task.comments}
        attachments={task.attachments}
        sidebar={
          <>
            <TicketSidebarField label="Assignee">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
                  {assignee.avatar}
                </span>
                <span>{assignee.name}</span>
              </div>
            </TicketSidebarField>
            <TicketSidebarField label="Reporter">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
                  {reporter.avatar}
                </span>
                <span>{reporter.name}</span>
              </div>
            </TicketSidebarField>
            <TicketSidebarField label="Priority">
              <PriorityLozenge priority={task.priority} />
            </TicketSidebarField>
            <TicketSidebarField label="Project">
              <Link
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="text-primary hover:underline"
              >
                {project.name}
              </Link>
            </TicketSidebarField>
            {parent && (
              <TicketSidebarField label="Parent">
                <Link
                  to={parent.kind === "task" ? "/tasks/$taskId" : "/issues/$issueId"}
                  params={
                    parent.kind === "task"
                      ? { taskId: parent.item.id }
                      : { issueId: parent.item.id }
                  }
                  className="font-mono text-primary hover:underline"
                >
                  {parent.item.id}
                </Link>
              </TicketSidebarField>
            )}
            {task.labels.length > 0 && (
              <TicketSidebarField label="Labels">
                <div className="flex flex-wrap gap-1">
                  {task.labels.map((l) => (
                    <span key={l} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {l}
                    </span>
                  ))}
                </div>
              </TicketSidebarField>
            )}
            <TicketSidebarField label="Due date">
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "None"}
            </TicketSidebarField>
          </>
        }
      />
      <CreateTicketDialog
        key={task.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultProjectId={task.projectId}
        defaultParentId={task.id}
        navigateOnCreate={false}
      />
    </>
  );
}
