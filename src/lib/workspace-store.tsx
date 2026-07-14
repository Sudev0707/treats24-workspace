import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  CURRENT_USER_ID,
  type Project,
  type Task,
  type Issue,
  type SavedQuery,
  type QueryFilters,
  type ActivityItem,
  type Priority,
  type TaskStatus,
  type IssueType,
  type ProjectTemplate,
} from "@/lib/data";

type CreateTaskInput = {
  title: string;
  description: string;
  projectId: string;
  priority: Priority;
  status?: TaskStatus;
  assigneeId: string;
  reporterId?: string;
  dueDate: string;
  labels?: string[];
  parentId?: string;
};

type CreateIssueInput = {
  title: string;
  description?: string;
  type: IssueType;
  severity: Priority;
  projectId: string;
  status?: TaskStatus;
  assigneeId: string;
  reporterId?: string;
  stepsToReproduce?: string;
  expected?: string;
  actual?: string;
  parentId?: string;
};

type CreateProjectInput = {
  name: string;
  key: string;
  description: string;
  template: ProjectTemplate;
  priority: Priority;
  dueDate: string;
  tags?: string[];
  memberIds?: string[];
  leadId: string;
};

type CreateQueryInput = {
  name: string;
  description?: string;
  projectId?: string;
  filters: QueryFilters;
};

type WorkspaceContextValue = {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  queries: SavedQuery[];
  activity: ActivityItem[];
  currentUserId: string;
  createTask: (input: CreateTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  createIssue: (input: CreateIssueInput) => Issue;
  updateIssue: (id: string, patch: Partial<Issue>) => void;
  createProject: (input: CreateProjectInput) => Project;
  createQuery: (input: CreateQueryInput) => SavedQuery;
  deleteQuery: (id: string) => void;
  addActivity: (action: string, target: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function nextWorkItemId(
  projectKey: string,
  projectId: string,
  tasks: Task[],
  issues: Issue[],
): string {
  const ids = [
    ...tasks.filter((t) => t.projectId === projectId),
    ...issues.filter((i) => i.projectId === projectId),
  ].map((x) => x.id);
  const escaped = projectKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-(\\d+)$`);
  const nums = ids
    .map((id) => {
      const match = id.match(pattern);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${projectKey}-${next}`;
}

function requireProject(projects: Project[], projectId: string): Project {
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");
  return project;
}

const PROJECT_COLORS = [
  "from-[#7c3aed] to-[#5b21b6]",
  "from-[#6554c0] to-[#403294]",
  "from-[#00b8d9] to-[#008da6]",
  "from-[#36b37e] to-[#00875a]",
  "from-[#ffab00] to-[#ff991f]",
  "from-[#ff5630] to-[#de350b]",
];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const addActivity = useCallback((action: string, target: string) => {
    setActivity((prev) => [
      { id: `a${Date.now()}`, userId: CURRENT_USER_ID, action, target, time: "just now" },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const createTask = useCallback(
    (input: CreateTaskInput): Task => {
      const project = requireProject(projects, input.projectId);
      const task: Task = {
        id: nextWorkItemId(project.key, input.projectId, tasks, issues),
        title: input.title,
        description: input.description,
        status: input.status ?? "To Do",
        priority: input.priority,
        assigneeId: input.assigneeId,
        reporterId: input.reporterId ?? CURRENT_USER_ID,
        projectId: input.projectId,
        dueDate: input.dueDate,
        labels: input.labels ?? [],
        comments: 0,
        attachments: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        ...(input.parentId ? { parentId: input.parentId } : {}),
      };
      setTasks((prev) => [task, ...prev]);
      addActivity("created task", input.parentId ? `${task.id} under ${input.parentId}` : task.id);
      toast.success(`${task.id} created`);
      return task;
    },
    [projects, tasks, issues, addActivity],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (patch.status) addActivity("moved", `${id} to ${patch.status}`);
    },
    [addActivity],
  );

  const createIssue = useCallback(
    (input: CreateIssueInput): Issue => {
      const project = requireProject(projects, input.projectId);
      const issue: Issue = {
        id: nextWorkItemId(project.key, input.projectId, tasks, issues),
        title: input.title,
        ...(input.description ? { description: input.description } : {}),
        type: input.type,
        severity: input.severity,
        status: input.status ?? "To Do",
        projectId: input.projectId,
        assigneeId: input.assigneeId,
        reporterId: input.reporterId ?? CURRENT_USER_ID,
        createdAt: new Date().toISOString().slice(0, 10),
        ...(input.parentId ? { parentId: input.parentId } : {}),
        stepsToReproduce: input.stepsToReproduce,
        expected: input.expected,
        actual: input.actual,
      };
      setIssues((prev) => [issue, ...prev]);
      addActivity("opened", input.parentId ? `${issue.id} under ${input.parentId}` : issue.id);
      toast.success(`${issue.id} created`);
      return issue;
    },
    [projects, tasks, issues, addActivity],
  );

  const updateIssue = useCallback(
    (id: string, patch: Partial<Issue>) => {
      setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      if (patch.status) addActivity("updated", `${id} → ${patch.status}`);
    },
    [addActivity],
  );

  const createProject = useCallback(
    (input: CreateProjectInput): Project => {
      const memberIds = input.memberIds?.length
        ? [...new Set([input.leadId, ...input.memberIds])]
        : [input.leadId];
      const project: Project = {
        id: `p${projects.length + 1}`,
        key: input.key.toUpperCase(),
        name: input.name,
        description: input.description,
        template: input.template,
        progress: 0,
        status: "Planning",
        priority: input.priority,
        dueDate: input.dueDate,
        tags: input.tags ?? [],
        memberIds,
        leadId: input.leadId,
        color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      };
      setProjects((prev) => [project, ...prev]);
      addActivity("created project", project.name);
      toast.success(`Project ${project.key} created`);
      return project;
    },
    [projects, addActivity],
  );

  const createQuery = useCallback(
    (input: CreateQueryInput): SavedQuery => {
      const query: SavedQuery = {
        id: `Q-${queries.length + 1}`,
        name: input.name,
        description: input.description,
        projectId: input.projectId,
        filters: input.filters,
        createdAt: new Date().toISOString().slice(0, 10),
        createdBy: CURRENT_USER_ID,
      };
      setQueries((prev) => [query, ...prev]);
      addActivity("saved query", query.name);
      toast.success(`Query "${query.name}" saved`);
      return query;
    },
    [queries, addActivity],
  );

  const deleteQuery = useCallback((id: string) => {
    setQueries((prev) => prev.filter((q) => q.id !== id));
    toast.success("Query deleted");
  }, []);

  const value = useMemo(
    () => ({
      projects,
      tasks,
      issues,
      queries,
      activity,
      currentUserId: CURRENT_USER_ID,
      createTask,
      updateTask,
      createIssue,
      updateIssue,
      createProject,
      createQuery,
      deleteQuery,
      addActivity,
    }),
    [
      projects,
      tasks,
      issues,
      queries,
      activity,
      createTask,
      updateTask,
      createIssue,
      updateIssue,
      createProject,
      createQuery,
      deleteQuery,
      addActivity,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
