export type Priority = "Critical" | "High" | "Medium" | "Low";
export type TaskStatus =
  | "Backlog"
  | "To Do"
  | "Selected for Development"
  | "In Progress"
  | "Blocked"
  | "In Review"
  | "Changes Requested"
  | "Ready for QA"
  | "QA Testing"
  | "Failed QA"
  | "Ready for Release"
  | "Released"
  | "Done";
export type IssueType = "Bug" | "Feature" | "Improvement" | "Hotfix" | "Documentation";
export type ReleaseStatus = "Planned" | "In Development" | "Testing" | "Released";

export type Member = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  onboardingCompleted?: boolean;
};

export const members: Member[] = [
  { id: "u1", name: "Sudev", role: "Owner", avatar: "SD", email: "sudev@treats24.com" },
];

let activeMembers: Member[] = members;

export function setActiveMembers(list: Member[]) {
  activeMembers = list.length ? list : members;
}

export type ProjectTemplate = "scrum" | "kanban" | "bug-tracking" | "documentation";

export type Project = {
  id: string;
  key: string;
  name: string;
  description: string;
  template: ProjectTemplate;
  progress: number;
  status: "Active" | "Planning" | "On Hold" | "Completed";
  priority: Priority;
  dueDate: string;
  tags: string[];
  memberIds: string[];
  leadId: string;
  color: string;
};

export const projects: Project[] = [];

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string;
  reporterId: string;
  projectId: string;
  dueDate: string;
  labels: string[];
  comments: number;
  attachments: number;
  createdAt: string;
  parentId?: string;
  linkedItemIds?: string[];
};

export const tasks: Task[] = [];

export type Issue = {
  id: string;
  title: string;
  description?: string;
  type: IssueType;
  severity: Priority;
  status: TaskStatus;
  projectId: string;
  assigneeId: string;
  reporterId: string;
  createdAt: string;
  stepsToReproduce?: string;
  expected?: string;
  actual?: string;
  parentId?: string;
  linkedItemIds?: string[];
};

export const issues: Issue[] = [];

export type Release = {
  id: string;
  version: string;
  name: string;
  status: ReleaseStatus;
  date: string;
  features: string[];
  fixes: string[];
  notes: string;
  projectId: string;
};

export const releases: Release[] = [];

export type Doc = {
  id: string;
  title: string;
  icon: string;
  updatedAt: string;
  author: string;
  excerpt: string;
  category: "Requirements" | "Meeting Notes" | "Design" | "Engineering";
};

export const docs: Doc[] = [];

export type ActivityItem = {
  id: string;
  userId: string;
  action: string;
  target: string;
  time: string;
};

export const recentActivity: ActivityItem[] = [];

export type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "assigned" | "comment" | "status" | "release" | "due";
  unread: boolean;
};

export const notifications: Notification[] = [];

export type QueryFilters = {
  entityType: "tasks" | "issues";
  projectId?: string;
  status?: TaskStatus[];
  priority?: Priority[];
  assigneeId?: string;
  issueType?: IssueType[];
  search?: string;
};

export type SavedQuery = {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  filters: QueryFilters;
  createdAt: string;
  createdBy: string;
};

export const savedQueries: SavedQuery[] = [];

export type TicketAttachment = {
  id: string;
  ticketId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  url: string;
  createdAt: string;
};

export const CURRENT_USER_ID = "u1";
export const UNASSIGNED_ID = "unassigned";

export function getMember(id: string): Member {
  if (!id || id === UNASSIGNED_ID) {
    return {
      id: UNASSIGNED_ID,
      name: "Unassigned",
      role: "",
      avatar: "?",
      email: "",
    };
  }
  return (
    activeMembers.find((m) => m.id === id) ?? {
      id,
      name: "Unknown",
      role: "",
      avatar: "?",
      email: "",
    }
  );
}

export function getProjectById(projects: Project[], id: string): Project {
  return (
    projects.find((p) => p.id === id) ?? {
      id,
      key: "—",
      name: "Unknown project",
      description: "",
      template: "kanban",
      progress: 0,
      status: "Planning",
      priority: "Medium",
      dueDate: "",
      tags: [],
      memberIds: [],
      leadId: CURRENT_USER_ID,
      color: "from-violet-500 to-purple-700",
    }
  );
}

export const projectTemplates: { id: ProjectTemplate; label: string; description: string }[] = [
  { id: "scrum", label: "Scrum", description: "Sprints, backlog, and agile boards" },
  { id: "kanban", label: "Kanban", description: "Continuous flow with a board" },
  { id: "bug-tracking", label: "Bug tracking", description: "Track and triage defects" },
  { id: "documentation", label: "Documentation", description: "Docs and knowledge base" },
];

export const projectCategories = ["Software", "Business", "Marketing", "Operations", "Internal"] as const;

export function generateProjectKey(name: string, existingKeys: string[]): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let key =
    words.length > 1
      ? words.map((w) => w[0] ?? "").join("")
      : (words[0] ?? "PRJ").slice(0, 4);
  key = key.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "PRJ";

  let candidate = key;
  let suffix = 1;
  while (existingKeys.includes(candidate)) {
    candidate = `${key.slice(0, Math.max(1, 4 - String(suffix).length))}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export const taskStatuses: TaskStatus[] = [
  "Backlog",
  "To Do",
  "Selected for Development",
  "In Progress",
  "Blocked",
  "In Review",
  "Changes Requested",
  "Ready for QA",
  "QA Testing",
  "Failed QA",
  "Ready for Release",
  "Released",
  "Done",
];

export const DONE_STATUSES: TaskStatus[] = ["Done", "Released"];
export const BACKLOG_STATUSES: TaskStatus[] = ["Backlog", "To Do"];

export function isDoneStatus(status: TaskStatus): boolean {
  return DONE_STATUSES.includes(status);
}

export const statusMeaning: Record<TaskStatus, string> = {
  Backlog: "Work has been created but not planned",
  "To Do": "Ready to start",
  "Selected for Development": "Chosen for the current sprint",
  "In Progress": "A developer is actively working on it",
  Blocked: "Work is paused due to a dependency or issue",
  "In Review": "Awaiting peer code review",
  "Changes Requested": "Review found issues that need fixing",
  "Ready for QA": "Development is complete and ready for testing",
  "QA Testing": "QA team is testing the feature",
  "Failed QA": "QA found defects; work returns to development",
  "Ready for Release": "Approved and waiting for deployment",
  Released: "Successfully deployed to production",
  Done: "Work is complete and no further action is needed",
};
export const priorities: Priority[] = ["Critical", "High", "Medium", "Low"];

export const priorityColor: Record<Priority, string> = {
  Critical: "bg-[#ffebe6] text-[#ae2a19] border-[#ffbdad]",
  High: "bg-[#fff7d6] text-[#7f5f01] border-[#f8e6a0]",
  Medium: "bg-[#f3e8ff] text-[#6e38b8] border-[#ddd6fe]",
  Low: "bg-[#f4f5f7] text-[#626f86] border-[#dfe1e6]",
};

export const statusColor: Record<TaskStatus, string> = {
  Backlog: "bg-[#dfe1e6] text-[#44546f]",
  "To Do": "bg-[#dfe1e6] text-[#44546f]",
  "Selected for Development": "bg-[#f3e8ff] text-[#6e38b8]",
  "In Progress": "bg-[#f3e8ff] text-[#6e38b8]",
  Blocked: "bg-[#ffebe6] text-[#ae2a19]",
  "In Review": "bg-[#ede9fe] text-[#7c3aed]",
  "Changes Requested": "bg-[#fff7d6] text-[#7f5f01]",
  "Ready for QA": "bg-[#e3fcef] text-[#216e4e]",
  "QA Testing": "bg-[#e3fcef] text-[#216e4e]",
  "Failed QA": "bg-[#ffebe6] text-[#ae2a19]",
  "Ready for Release": "bg-[#e3fcef] text-[#216e4e]",
  Released: "bg-[#dffcf0] text-[#216e4e]",
  Done: "bg-[#dffcf0] text-[#216e4e]",
};

/** Jira-style uppercase labels for status pills */
export const statusLabel: Record<TaskStatus, string> = {
  Backlog: "BACKLOG",
  "To Do": "TO DO",
  "Selected for Development": "SELECTED",
  "In Progress": "IN PROGRESS",
  Blocked: "BLOCKED",
  "In Review": "IN REVIEW",
  "Changes Requested": "CHANGES",
  "Ready for QA": "QA READY",
  "QA Testing": "QA TESTING",
  "Failed QA": "FAILED QA",
  "Ready for Release": "TO RELEASE",
  Released: "RELEASED",
  Done: "DONE",
};

export function formatWorkItemDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatWorkItemDate(isoDate);
}

export type TicketNavLink = { to: string; params: Record<string, string> };

export function getSiblingTicketNav(
  currentId: string,
  projectId: string,
  tasks: Task[],
  issues: Issue[],
): { prev?: TicketNavLink; next?: TicketNavLink } {
  const sorted = [
    ...tasks.filter((t) => t.projectId === projectId && isTopLevelWorkItem(t)),
    ...issues.filter((i) => i.projectId === projectId && isTopLevelWorkItem(i)),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const links: TicketNavLink[] = sorted.map((item): TicketNavLink =>
    "priority" in item
      ? { to: "/tasks/$taskId", params: { taskId: item.id } }
      : { to: "/issues/$issueId", params: { issueId: item.id } },
  );

  const idx = links.findIndex(
    (l) => l.params.taskId === currentId || l.params.issueId === currentId,
  );
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? links[idx - 1] : undefined,
    next: idx < links.length - 1 ? links[idx + 1] : undefined,
  };
}

export function isTopLevelWorkItem(item: { parentId?: string }): boolean {
  return !item.parentId;
}

export type WorkItemRef = { kind: "task"; item: Task } | { kind: "issue"; item: Issue };

export function findWorkItem(
  id: string,
  tasks: Task[],
  issues: Issue[],
): WorkItemRef | undefined {
  const task = tasks.find((t) => t.id === id);
  if (task) return { kind: "task", item: task };
  const issue = issues.find((i) => i.id === id);
  if (issue) return { kind: "issue", item: issue };
  return undefined;
}

export function getChildWorkItems(
  parentId: string,
  tasks: Task[],
  issues: Issue[],
): WorkItemRef[] {
  return [
    ...tasks.filter((t) => t.parentId === parentId).map((item) => ({ kind: "task" as const, item })),
    ...issues.filter((i) => i.parentId === parentId).map((item) => ({ kind: "issue" as const, item })),
  ];
}

export function getLinkedWorkItems(
  sourceId: string,
  tasks: Task[],
  issues: Issue[],
): WorkItemRef[] {
  const source = findWorkItem(sourceId, tasks, issues);
  if (!source) return [];
  const ids = source.item.linkedItemIds ?? [];
  return ids
    .map((id) => findWorkItem(id, tasks, issues))
    .filter((ref): ref is WorkItemRef => Boolean(ref));
}

export function getLinkableWorkItems(
  sourceId: string,
  tasks: Task[],
  issues: Issue[],
  search = "",
): WorkItemRef[] {
  const source = findWorkItem(sourceId, tasks, issues);
  if (!source) return [];

  const linked = new Set(source.item.linkedItemIds ?? []);
  const needle = search.trim().toLowerCase();

  const candidates: WorkItemRef[] = [
    ...tasks.map((item) => ({ kind: "task" as const, item })),
    ...issues.map((item) => ({ kind: "issue" as const, item })),
  ];

  return candidates.filter((ref) => {
    if (ref.item.id === sourceId) return false;
    if (linked.has(ref.item.id)) return false;
    if (!needle) return true;
    const haystack = `${ref.item.id} ${ref.item.title}`.toLowerCase();
    return haystack.includes(needle);
  });
}
