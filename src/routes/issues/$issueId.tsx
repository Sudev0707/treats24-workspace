import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { useWorkspace } from "@/lib/workspace-store";
import {
  findWorkItem,
  getChildWorkItems,
  getMember,
  getProjectById,
  getSiblingTicketNav,
} from "@/lib/data";
import {
  NestedTicketsPanel,
  PriorityLozenge,
  TicketDetailView,
  TicketSidebarField,
  WorkTypeBadge,
  type NestedTicketItem,
} from "@/components/ticket/ticket-ui";

export const Route = createFileRoute("/issues/$issueId")({
  component: IssueDetailPage,
});

function IssueDetailPage() {
  const { issueId } = Route.useParams();
  const { issues, tasks, projects, updateIssue, updateTask } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) throw notFound();

  const assignee = getMember(issue.assigneeId);
  const reporter = getMember(issue.reporterId);
  const project = getProjectById(projects, issue.projectId);
  const parent = issue.parentId ? findWorkItem(issue.parentId, tasks, issues) : undefined;

  const childItems = useMemo<NestedTicketItem[]>(
    () =>
      getChildWorkItems(issue.id, tasks, issues).map(({ kind, item }) => {
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
    [issue.id, tasks, issues],
  );

  const bugDetails =
    issue.type === "Bug" && (issue.stepsToReproduce || issue.expected || issue.actual);

  const siblingNav = useMemo(
    () => getSiblingTicketNav(issue.id, issue.projectId, tasks, issues),
    [issue.id, issue.projectId, tasks, issues],
  );

  const backTo = {
    to: "/projects/$projectId" as const,
    params: { projectId: project.id },
  };

  return (
    <>
      <TicketDetailView
        ticketKey={issue.id}
        title={issue.title}
        onTitleChange={(title) => updateIssue(issue.id, { title })}
        description={issue.description ?? ""}
        onDescriptionChange={(description) =>
          updateIssue(issue.id, { description: description || undefined })
        }
        descriptionExtra={
          bugDetails ? (
            <div className="space-y-4 text-foreground">
              {issue.stepsToReproduce && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Steps to reproduce
                  </p>
                  <p className="whitespace-pre-wrap">{issue.stepsToReproduce}</p>
                </div>
              )}
              {issue.expected && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Expected result
                  </p>
                  <p>{issue.expected}</p>
                </div>
              )}
              {issue.actual && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Actual result
                  </p>
                  <p>{issue.actual}</p>
                </div>
              )}
            </div>
          ) : undefined
        }
        workType={issue.type}
        status={issue.status}
        onStatusChange={(status) => updateIssue(issue.id, { status })}
        backTo={backTo}
        prevTicket={siblingNav.prev}
        nextTicket={siblingNav.next}
        createdAt={issue.createdAt}
        updatedAt={issue.createdAt}
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
        sidebar={
          <>
            <TicketSidebarField label="Issue type">
              <WorkTypeBadge type={issue.type} size="sm" />
            </TicketSidebarField>
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
              <PriorityLozenge priority={issue.severity} />
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
          </>
        }
      />
      <CreateTicketDialog
        key={issue.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultProjectId={issue.projectId}
        defaultParentId={issue.id}
        navigateOnCreate={false}
      />
    </>
  );
}
