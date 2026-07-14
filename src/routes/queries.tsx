import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { CreateQueryDialog } from "@/components/create-query-dialog";
import {
  JiraBtn,
  JiraEmpty,
  JiraPage,
  JiraPageHeader,
  JiraPanel,
  StatusLozenge,
} from "@/components/jira/ui";
import { TicketKeyLink } from "@/components/ticket/ticket-ui";
import { useWorkspace } from "@/lib/workspace-store";
import { getMember, getProjectById } from "@/lib/data";
import { applyIssueFilters, applyTaskFilters, describeFilters } from "@/lib/query-utils";

type QueriesSearch = { q?: string };

export const Route = createFileRoute("/queries")({
  validateSearch: (search: Record<string, unknown>): QueriesSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [{ title: "Filters — Treats24" }],
  }),
  component: QueriesPage,
});

function QueriesPage() {
  const { q: selectedQueryId } = Route.useSearch();
  const { queries, tasks, issues, projects, deleteQuery } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(selectedQueryId);

  const activeQuery = queries.find((q) => q.id === (activeId ?? selectedQueryId)) ?? queries[0];

  const results = useMemo(() => {
    if (!activeQuery) return { tasks: [], issues: [] };
    if (activeQuery.filters.entityType === "tasks") {
      return { tasks: applyTaskFilters(tasks, activeQuery.filters), issues: [] as typeof issues };
    }
    return { tasks: [] as typeof tasks, issues: applyIssueFilters(issues, activeQuery.filters) };
  }, [activeQuery, tasks, issues]);

  const resultCount = results.tasks.length + results.issues.length;

  return (
    <JiraPage>
      <JiraPageHeader
        title="Filters"
        subtitle="Saved JQL-style filters for tasks and issues"
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Filters" }]}
        actions={
          <JiraBtn variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create filter
          </JiraBtn>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <JiraPanel title="My filters" noPadding>
          <div className="p-1">
            {queries.map((query) => (
              <button
                key={query.id}
                type="button"
                onClick={() => setActiveId(query.id)}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
                  activeQuery?.id === query.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-jira-subtle hover:bg-jira-hover"
                }`}
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{query.name}</span>
              </button>
            ))}
          </div>
        </JiraPanel>

        <div className="space-y-4">
          {activeQuery ? (
            <>
              <JiraPanel>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <h2 className="text-lg font-semibold text-jira-text">{activeQuery.name}</h2>
                    {activeQuery.description && (
                      <p className="mt-1 text-sm text-jira-subtle">{activeQuery.description}</p>
                    )}
                    <p className="mt-2 font-mono text-xs text-jira-muted">{describeFilters(activeQuery.filters)}</p>
                    {activeQuery.projectId && (
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: activeQuery.projectId }}
                        className="mt-1 inline-block text-xs text-jira-link hover:underline"
                      >
                        {getProjectById(projects, activeQuery.projectId).name}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-jira-hover px-2 py-1 text-xs font-medium text-jira-subtle">
                      {resultCount} issues
                    </span>
                    <JiraBtn variant="danger" size="icon" onClick={() => deleteQuery(activeQuery.id)}>
                      <Trash2 className="h-4 w-4" />
                    </JiraBtn>
                  </div>
                </div>
                <p className="border-t border-jira-border px-4 py-2 text-xs text-jira-muted">
                  Owned by {getMember(activeQuery.createdBy).name} · Updated {activeQuery.createdAt}
                </p>
              </JiraPanel>

              <JiraPanel noPadding>
                {resultCount === 0 ? (
                  <JiraEmpty message="No issues match this filter." />
                ) : (
                  <>
                    <div className="grid grid-cols-[90px_1fr_120px_110px] gap-3 border-b border-jira-border bg-jira-bg px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-jira-muted">
                      <span>Key</span>
                      <span>Summary</span>
                      <span>Project</span>
                      <span>Status</span>
                    </div>
                    {results.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="grid grid-cols-[90px_1fr_120px_110px] items-center gap-3 border-b border-jira-border px-4 py-2.5 last:border-0 hover:bg-jira-hover"
                      >
                        <TicketKeyLink ticketKey={t.id} to="/tasks/$taskId" params={{ taskId: t.id }} />
                        <Link to="/tasks/$taskId" params={{ taskId: t.id }} className="truncate text-sm text-jira-text hover:underline">
                          {t.title}
                        </Link>
                        <span className="truncate text-xs text-jira-subtle">{getProjectById(projects, t.projectId).name}</span>
                        <StatusLozenge status={t.status} />
                      </div>
                    ))}
                    {results.issues.map((i) => (
                      <div
                        key={i.id}
                        className="grid grid-cols-[90px_1fr_120px_110px] items-center gap-3 border-b border-jira-border px-4 py-2.5 last:border-0 hover:bg-jira-hover"
                      >
                        <TicketKeyLink ticketKey={i.id} to="/issues/$issueId" params={{ issueId: i.id }} />
                        <Link to="/issues/$issueId" params={{ issueId: i.id }} className="truncate text-sm text-jira-text hover:underline">
                          {i.title}
                        </Link>
                        <span className="truncate text-xs text-jira-subtle">{getProjectById(projects, i.projectId).name}</span>
                        <StatusLozenge status={i.status} />
                      </div>
                    ))}
                  </>
                )}
              </JiraPanel>
            </>
          ) : (
            <JiraPanel>
              <JiraEmpty message="Create your first filter using Create above." />
            </JiraPanel>
          )}
        </div>
      </div>

      <CreateQueryDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => setActiveId(id)} />
    </JiraPage>
  );
}
