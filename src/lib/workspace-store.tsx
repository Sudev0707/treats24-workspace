import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  CURRENT_USER_ID,
  members as fallbackMembers,
  setActiveMembers,
  type Member,
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
  findWorkItem,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  deleteQueryInDb,
  ensureProfileForUser,
  fetchWorkspaceData,
  saveActivity,
  saveIssue,
  saveProject,
  saveQuery,
  saveTask,
  updateIssueInDb,
  updateTaskInDb,
} from "@/lib/workspace-db";

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
  members: Member[];
  currentUserId: string;
  isLoading: boolean;
  isPersisted: boolean;
  createTask: (input: CreateTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  createIssue: (input: CreateIssueInput) => Issue;
  updateIssue: (id: string, patch: Partial<Issue>) => void;
  createProject: (input: CreateProjectInput) => Project;
  createQuery: (input: CreateQueryInput) => SavedQuery;
  deleteQuery: (id: string) => void;
  linkWorkItem: (sourceId: string, targetId: string) => void;
  unlinkWorkItem: (sourceId: string, targetId: string) => void;
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
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [members, setMembers] = useState<Member[]>(fallbackMembers);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isPersisted, setIsPersisted] = useState(false);

  const currentUserId = user?.id ?? CURRENT_USER_ID;
  const canPersist = isSupabaseConfigured && Boolean(user);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setIsPersisted(false);
      return;
    }

    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      setIsPersisted(false);
      setMembers(fallbackMembers);
      setActiveMembers(fallbackMembers);
      return;
    }

    let cancelled = false;

    async function hydrate() {
      setIsLoading(true);
      try {
        await ensureProfileForUser(user!);
        const data = await fetchWorkspaceData();
        if (cancelled) return;

        setProjects(data.projects);
        setTasks(data.tasks);
        setIssues(data.issues);
        setQueries(data.queries);
        setActivity(data.activity);
        const loadedMembers = data.members.length ? data.members : fallbackMembers;
        setMembers(loadedMembers);
        setActiveMembers(loadedMembers);
        setIsPersisted(true);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast.error("Failed to load workspace data", {
            description: error instanceof Error ? error.message : "Check your Supabase setup.",
          });
          setIsPersisted(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const persist = useCallback(
    async (operation: () => Promise<void>) => {
      if (!canPersist) return;
      try {
        await operation();
      } catch (error) {
        console.error(error);
        toast.error("Failed to save changes", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
    [canPersist],
  );

  const addActivity = useCallback(
    (action: string, target: string) => {
      const item: ActivityItem = {
        id: `a${Date.now()}`,
        userId: currentUserId,
        action,
        target,
        time: "just now",
      };
      setActivity((prev) => [item, ...prev.slice(0, 19)]);
      void persist(() => saveActivity(item));
    },
    [currentUserId, persist],
  );

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
        reporterId: input.reporterId ?? currentUserId,
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
      void persist(() => saveTask(task));
      return task;
    },
    [projects, tasks, issues, addActivity, currentUserId, persist],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (patch.status) addActivity("moved", `${id} to ${patch.status}`);
      void persist(() => updateTaskInDb(id, patch));
    },
    [addActivity, persist],
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
        reporterId: input.reporterId ?? currentUserId,
        createdAt: new Date().toISOString().slice(0, 10),
        ...(input.parentId ? { parentId: input.parentId } : {}),
        stepsToReproduce: input.stepsToReproduce,
        expected: input.expected,
        actual: input.actual,
      };
      setIssues((prev) => [issue, ...prev]);
      addActivity("opened", input.parentId ? `${issue.id} under ${input.parentId}` : issue.id);
      toast.success(`${issue.id} created`);
      void persist(() => saveIssue(issue));
      return issue;
    },
    [projects, tasks, issues, addActivity, currentUserId, persist],
  );

  const updateIssue = useCallback(
    (id: string, patch: Partial<Issue>) => {
      setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      if (patch.status) addActivity("updated", `${id} → ${patch.status}`);
      void persist(() => updateIssueInDb(id, patch));
    },
    [addActivity, persist],
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
      void persist(() => saveProject(project));
      return project;
    },
    [projects, addActivity, persist],
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
        createdBy: currentUserId,
      };
      setQueries((prev) => [query, ...prev]);
      addActivity("saved query", query.name);
      toast.success(`Query "${query.name}" saved`);
      void persist(() => saveQuery(query));
      return query;
    },
    [queries, addActivity, currentUserId, persist],
  );

  const deleteQuery = useCallback(
    (id: string) => {
      setQueries((prev) => prev.filter((q) => q.id !== id));
      toast.success("Query deleted");
      void persist(() => deleteQueryInDb(id));
    },
    [persist],
  );

  const linkWorkItem = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;

      const sourceRef = findWorkItem(sourceId, tasks, issues);
      const targetRef = findWorkItem(targetId, tasks, issues);
      if (!sourceRef || !targetRef) return;

      const sourceLinked = sourceRef.item.linkedItemIds ?? [];
      const targetLinked = targetRef.item.linkedItemIds ?? [];
      if (sourceLinked.includes(targetId)) return;

      const newSourceLinked = [...sourceLinked, targetId];
      const newTargetLinked = [...targetLinked, sourceId];

      if (sourceRef.kind === "task") {
        setTasks((prev) =>
          prev.map((t) => (t.id === sourceId ? { ...t, linkedItemIds: newSourceLinked } : t)),
        );
        void persist(() => updateTaskInDb(sourceId, { linkedItemIds: newSourceLinked }));
      } else {
        setIssues((prev) =>
          prev.map((i) => (i.id === sourceId ? { ...i, linkedItemIds: newSourceLinked } : i)),
        );
        void persist(() => updateIssueInDb(sourceId, { linkedItemIds: newSourceLinked }));
      }

      if (targetRef.kind === "task") {
        setTasks((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, linkedItemIds: newTargetLinked } : t)),
        );
        void persist(() => updateTaskInDb(targetId, { linkedItemIds: newTargetLinked }));
      } else {
        setIssues((prev) =>
          prev.map((i) => (i.id === targetId ? { ...i, linkedItemIds: newTargetLinked } : i)),
        );
        void persist(() => updateIssueInDb(targetId, { linkedItemIds: newTargetLinked }));
      }

      addActivity("linked", `${sourceId} ↔ ${targetId}`);
      toast.success(`Linked ${sourceId} to ${targetId}`);
    },
    [tasks, issues, addActivity, persist],
  );

  const unlinkWorkItem = useCallback(
    (sourceId: string, targetId: string) => {
      const sourceRef = findWorkItem(sourceId, tasks, issues);
      const targetRef = findWorkItem(targetId, tasks, issues);
      if (!sourceRef || !targetRef) return;

      const newSourceLinked = (sourceRef.item.linkedItemIds ?? []).filter((id) => id !== targetId);
      const newTargetLinked = (targetRef.item.linkedItemIds ?? []).filter((id) => id !== sourceId);

      if (sourceRef.kind === "task") {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === sourceId ? { ...t, linkedItemIds: newSourceLinked.length ? newSourceLinked : undefined } : t,
          ),
        );
        void persist(() => updateTaskInDb(sourceId, { linkedItemIds: newSourceLinked }));
      } else {
        setIssues((prev) =>
          prev.map((i) =>
            i.id === sourceId ? { ...i, linkedItemIds: newSourceLinked.length ? newSourceLinked : undefined } : i,
          ),
        );
        void persist(() => updateIssueInDb(sourceId, { linkedItemIds: newSourceLinked }));
      }

      if (targetRef.kind === "task") {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === targetId ? { ...t, linkedItemIds: newTargetLinked.length ? newTargetLinked : undefined } : t,
          ),
        );
        void persist(() => updateTaskInDb(targetId, { linkedItemIds: newTargetLinked }));
      } else {
        setIssues((prev) =>
          prev.map((i) =>
            i.id === targetId ? { ...i, linkedItemIds: newTargetLinked.length ? newTargetLinked : undefined } : i,
          ),
        );
        void persist(() => updateIssueInDb(targetId, { linkedItemIds: newTargetLinked }));
      }

      addActivity("unlinked", `${sourceId} ↔ ${targetId}`);
      toast.success(`Removed link between ${sourceId} and ${targetId}`);
    },
    [tasks, issues, addActivity, persist],
  );

  const value = useMemo(
    () => ({
      projects,
      tasks,
      issues,
      queries,
      activity,
      members,
      currentUserId,
      isLoading,
      isPersisted,
      createTask,
      updateTask,
      createIssue,
      updateIssue,
      createProject,
      createQuery,
      deleteQuery,
      linkWorkItem,
      unlinkWorkItem,
      addActivity,
    }),
    [
      projects,
      tasks,
      issues,
      queries,
      activity,
      members,
      currentUserId,
      isLoading,
      isPersisted,
      createTask,
      updateTask,
      createIssue,
      updateIssue,
      createProject,
      createQuery,
      deleteQuery,
      linkWorkItem,
      unlinkWorkItem,
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
