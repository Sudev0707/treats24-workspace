import type { Issue, QueryFilters, Task } from "@/lib/data";

export function applyTaskFilters(tasks: Task[], filters: QueryFilters): Task[] {
  return tasks.filter((t) => {
    if (filters.projectId && t.projectId !== filters.projectId) return false;
    if (filters.status?.length && !filters.status.includes(t.status)) return false;
    if (filters.priority?.length && !filters.priority.includes(t.priority)) return false;
    if (filters.assigneeId && t.assigneeId !== filters.assigneeId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${t.id} ${t.title} ${t.description} ${t.labels.join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function applyIssueFilters(issues: Issue[], filters: QueryFilters): Issue[] {
  return issues.filter((i) => {
    if (filters.projectId && i.projectId !== filters.projectId) return false;
    if (filters.status?.length && !filters.status.includes(i.status)) return false;
    if (filters.priority?.length && !filters.priority.includes(i.severity)) return false;
    if (filters.assigneeId && i.assigneeId !== filters.assigneeId) return false;
    if (filters.issueType?.length && !filters.issueType.includes(i.type)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${i.id} ${i.title}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function describeFilters(filters: QueryFilters): string {
  const parts: string[] = [filters.entityType === "tasks" ? "Tasks" : "Issues"];
  if (filters.projectId) parts.push("in project");
  if (filters.status?.length) parts.push(`status: ${filters.status.join(", ")}`);
  if (filters.priority?.length) parts.push(`priority: ${filters.priority.join(", ")}`);
  if (filters.issueType?.length) parts.push(`type: ${filters.issueType.join(", ")}`);
  if (filters.assigneeId) parts.push("assigned to me");
  if (filters.search) parts.push(`search: "${filters.search}"`);
  return parts.join(" · ");
}
