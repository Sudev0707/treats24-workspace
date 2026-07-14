import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  FolderKanban,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  AssigneeAvatar,
  JiraEmpty,
  JiraPage,
  JiraPageHeader,
  JiraPanel,
  JiraTab,
  JiraTabsList,
  StatusLozenge,
} from "@/components/jira/ui";
import { PriorityLozenge } from "@/components/ticket/ticket-ui";
import { useWorkspace } from "@/lib/workspace-store";
import {
  DONE_STATUSES,
  isDoneStatus,
  members,
  priorities,
  taskStatuses,
  type Priority,
  type TaskStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [{ title: "Insights — Treats24" }, { name: "description", content: "Delivery metrics and team insights." }],
  }),
  component: ReportsPage,
});

type TimeRange = "7d" | "30d" | "all";
type InsightTab = "overview" | "delivery" | "team";

function getDateRange(range: TimeRange): { start: Date | null; days: string[]; labels: string[] } {
  if (range === "all") {
    return { start: null, days: [], labels: [] };
  }
  const count = range === "7d" ? 7 : 30;
  const days: string[] = [];
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
    labels.push(
      range === "7d"
        ? d.toLocaleDateString(undefined, { weekday: "short" })
        : i % Math.ceil(count / 7) === 0
          ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : "",
    );
  }
  const start = new Date(days[0]!);
  start.setHours(0, 0, 0, 0);
  return { start, days, labels: labels.length ? labels : days.map(() => "") };
}

function inRange(isoDate: string, start: Date | null): boolean {
  if (!start) return true;
  return new Date(isoDate) >= start;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "primary";
}) {
  const toneStyles = {
    default: "bg-card text-muted-foreground",
    success: "bg-[#e3fcef] text-[#216e4e]",
    warning: "bg-[#fff7d6] text-[#7f5f01]",
    primary: "bg-accent text-primary",
  };

  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", toneStyles[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { tasks, issues, projects } = useWorkspace();
  const [range, setRange] = useState<TimeRange>("7d");
  const [tab, setTab] = useState<InsightTab>("overview");

  const { start, days, labels } = useMemo(() => getDateRange(range), [range]);

  const scopedTasks = useMemo(
    () => tasks.filter((t) => inRange(t.createdAt, start)),
    [tasks, start],
  );
  const scopedIssues = useMemo(
    () => issues.filter((i) => inRange(i.createdAt, start)),
    [issues, start],
  );

  const allWork = useMemo(
    () => [...scopedTasks, ...scopedIssues],
    [scopedTasks, scopedIssues],
  );

  const completedCount = useMemo(
    () => allWork.filter((w) => isDoneStatus(w.status)).length,
    [allWork],
  );

  const inProgressCount = useMemo(
    () => allWork.filter((w) => w.status === "In Progress").length,
    [allWork],
  );

  const blockedCount = useMemo(
    () => allWork.filter((w) => w.status === "Blocked").length,
    [allWork],
  );

  const completionRate = allWork.length
    ? Math.round((completedCount / allWork.length) * 100)
    : 0;

  const activitySeries = useMemo(() => {
    if (range === "all" || days.length === 0) return [];
    return days.map((day) => ({
      day,
      count: tasks.filter((t) => t.createdAt === day).length + issues.filter((i) => i.createdAt === day).length,
    }));
  }, [range, days, tasks, issues]);

  const maxActivity = Math.max(...activitySeries.map((d) => d.count), 1);

  const statusCounts = useMemo(() => {
    const counts = new Map<TaskStatus, number>();
    for (const s of taskStatuses) counts.set(s, 0);
    for (const w of allWork) {
      counts.set(w.status, (counts.get(w.status) ?? 0) + 1);
    }
    return taskStatuses
      .map((status) => ({ status, n: counts.get(status) ?? 0 }))
      .filter((s) => s.n > 0);
  }, [allWork]);

  const priorityCounts = useMemo(() => {
    const counts: Record<Priority, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const t of scopedTasks) counts[t.priority] += 1;
    for (const i of scopedIssues) counts[i.severity] += 1;
    return priorities.map((p) => ({ priority: p, n: counts[p] }));
  }, [scopedTasks, scopedIssues]);

  const maxPriority = Math.max(...priorityCounts.map((p) => p.n), 1);

  const projectStats = useMemo(
    () =>
      projects.map((p) => {
        const pTasks = tasks.filter((t) => t.projectId === p.id);
        const pIssues = issues.filter((i) => i.projectId === p.id);
        const total = pTasks.length + pIssues.length;
        const done = [...pTasks, ...pIssues].filter((w) => isDoneStatus(w.status)).length;
        return {
          project: p,
          tasks: pTasks.length,
          issues: pIssues.length,
          total,
          done,
          progress: total ? Math.round((done / total) * 100) : 0,
        };
      }),
    [projects, tasks, issues],
  );

  const teamRows = useMemo(
    () =>
      members
        .map((m) => {
          const assigned = tasks.filter((t) => t.assigneeId === m.id);
          const completed = assigned.filter((t) => isDoneStatus(t.status)).length;
          const active = assigned.filter((t) => t.status === "In Progress").length;
          const openIssues = issues.filter((i) => i.assigneeId === m.id && !isDoneStatus(i.status)).length;
          return { member: m, assigned: assigned.length, completed, active, openIssues, score: completed * 2 + active };
        })
        .sort((a, b) => b.score - a.score),
    [tasks, issues],
  );

  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "All time";

  return (
    <JiraPage>
      <JiraPageHeader
        title="Insights"
        subtitle={`Delivery metrics · ${rangeLabel.toLowerCase()}`}
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Insights" }]}
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-0.5">
            {(
              [
                ["7d", "7 days"],
                ["30d", "30 days"],
                ["all", "All time"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  range === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <JiraTabsList className="mb-5">
        {(
          [
            ["overview", "Overview", BarChart3],
            ["delivery", "Delivery", TrendingUp],
            ["team", "Team", Users],
          ] as const
        ).map(([id, label, Icon]) => (
          <JiraTab key={id} active={tab === id} onClick={() => setTab(id)}>
            <span className="inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          </JiraTab>
        ))}
      </JiraTabsList>

      {(tab === "overview" || tab === "delivery") && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Work completed"
            value={completedCount}
            hint={`${completionRate}% completion rate`}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="In progress"
            value={inProgressCount}
            hint="Active work items"
            icon={Activity}
            tone="primary"
          />
          <StatCard
            label="Open issues"
            value={scopedIssues.filter((i) => !isDoneStatus(i.status)).length}
            hint={`${scopedTasks.length} tasks in scope`}
            icon={CircleDot}
          />
          <StatCard
            label="Blocked"
            value={blockedCount}
            hint={blockedCount > 0 ? "Needs attention" : "No blockers"}
            icon={AlertTriangle}
            tone={blockedCount > 0 ? "warning" : "default"}
          />
        </div>
      )}

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <JiraPanel title="Work created" className="lg:col-span-2">
            {range === "all" ? (
              <div className="p-6">
                <JiraEmpty message="Select 7 or 30 days to view the activity chart." />
              </div>
            ) : activitySeries.every((d) => d.count === 0) ? (
              <div className="p-6">
                <JiraEmpty message="No work items created in this period." />
              </div>
            ) : (
              <div className="flex h-52 items-end gap-1.5 p-4 pt-6 sm:gap-2">
                {activitySeries.map((point, i) => (
                  <div key={point.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                      {point.count > 0 ? point.count : ""}
                    </span>
                    <div
                      className="w-full max-w-[48px] rounded-t bg-primary transition-all"
                      style={{ height: `${Math.max(8, (point.count / maxActivity) * 100)}%`, minHeight: point.count ? 8 : 4 }}
                      title={`${point.count} items on ${point.day}`}
                    />
                    <span className="truncate text-[10px] text-muted-foreground">{labels[i] || "·"}</span>
                  </div>
                ))}
              </div>
            )}
          </JiraPanel>

          <JiraPanel title="By priority">
            <div className="space-y-3 p-4">
              {priorityCounts.every((p) => p.n === 0) ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No work items yet.</p>
              ) : (
                priorityCounts.map(({ priority, n }) => (
                  <div key={priority}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <PriorityLozenge priority={priority} />
                      <span className="text-xs tabular-nums text-muted-foreground">{n}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(n / maxPriority) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </JiraPanel>
        </div>
      )}

      {tab === "delivery" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <JiraPanel title="Status distribution">
            {statusCounts.length === 0 ? (
              <JiraEmpty message="No work items in this period." />
            ) : (
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {statusCounts.map(({ status, n }) => (
                  <div
                    key={status}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <StatusLozenge status={status} size="sm" showTooltip={false} />
                    <span className="text-sm font-semibold tabular-nums text-foreground">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </JiraPanel>

          <JiraPanel title="Done vs open">
            <div className="p-4">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold tabular-nums text-foreground">{completionRate}%</p>
                  <p className="text-sm text-muted-foreground">Completion rate</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>
                    <span className="font-semibold text-[#216e4e]">{completedCount}</span> done
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">{allWork.length - completedCount}</span> open
                  </p>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full">
                  <div className="bg-[#22a06b]" style={{ width: `${completionRate}%` }} />
                  <div className="bg-primary/40 flex-1" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {DONE_STATUSES.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-muted-foreground">
                    <StatusLozenge status={s} size="sm" showTooltip={false} />
                    <span className="tabular-nums">{allWork.filter((w) => w.status === s).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </JiraPanel>
        </div>
      )}

      {(tab === "overview" || tab === "delivery") && (
        <JiraPanel title="Projects" className="mt-4">
          {projectStats.length === 0 ? (
            <JiraEmpty message="No projects yet. Create a project to see delivery breakdown." />
          ) : (
            <div className="divide-y divide-border">
              {projectStats.map(({ project, tasks: tCount, issues: iCount, total, done, progress }) => (
                <Link
                  key={project.id}
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  search={{ view: "summary" }}
                  className="flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/60 sm:flex-nowrap"
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br ${project.color} text-xs font-bold text-white`}>
                    {project.key.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tCount} tasks · {iCount} issues · {done}/{total} done
                    </p>
                  </div>
                  <div className="w-full min-w-[120px] sm:w-40">
                    <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>Progress</span>
                      <span className="tabular-nums font-medium text-foreground">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                </Link>
              ))}
            </div>
          )}
        </JiraPanel>
      )}

      {tab === "team" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <JiraPanel title="Team workload" className="lg:col-span-2" noPadding>
            {teamRows.every((r) => r.assigned === 0 && r.openIssues === 0) ? (
              <JiraEmpty message="No assigned work yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5">Member</th>
                      <th className="px-4 py-2.5">Assigned</th>
                      <th className="px-4 py-2.5">In progress</th>
                      <th className="px-4 py-2.5">Completed</th>
                      <th className="px-4 py-2.5">Open issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRows.map(({ member, assigned, active, completed, openIssues }, idx) => (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
                              {idx + 1}
                            </span>
                            <AssigneeAvatar initials={member.avatar} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{member.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{assigned}</td>
                        <td className="px-4 py-3 tabular-nums text-primary">{active}</td>
                        <td className="px-4 py-3 tabular-nums font-medium text-[#216e4e]">{completed}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{openIssues}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </JiraPanel>

          <JiraPanel title="Quick stats">
            <div className="space-y-3 p-4">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FolderKanban className="h-4 w-4" />
                  <span className="text-xs font-medium">Projects</span>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{projects.length}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Avg. items / project</span>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {projects.length ? Math.round(allWork.length / projects.length) : 0}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Total work items</span>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{allWork.length}</p>
              </div>
            </div>
          </JiraPanel>
        </div>
      )}
    </JiraPage>
  );
}
