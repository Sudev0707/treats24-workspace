import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  CURRENT_USER_ID,
  UNASSIGNED_ID,
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
  type Release,
  type ReleaseStatus,
  type Doc,
  type Notification,
  type ProjectNote,
  findWorkItem,
} from "@/lib/data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  deleteDocumentInDb,
  deleteIssueInDb,
  deleteNotificationInDb,
  deleteProjectInDb,
  deleteProjectNoteInDb,
  deleteQueryInDb,
  deleteReleaseInDb,
  deleteTaskInDb,
  completeOnboardingInDb,
  ensureProfileForUser,
  ensureProjectInDb,
  collectReferencedMemberIds,
  fetchProfileById,
  fetchProfilesByIds,
  fetchWorkspaceData,
  formatDbError,
  generateEntityId,
  mapNotification,
  markAllNotificationsReadInDb,
  saveNotification,
  saveActivity,
  saveDocument,
  saveIssue,
  saveProject,
  saveProjectNote,
  saveQuery,
  saveRelease,
  saveTask,
  updateDocumentInDb,
  updateIssueInDb,
  updateNotificationInDb,
  updateProfileInDb,
  updateProjectInDb,
  updateProjectNoteInDb,
  updateQueryInDb,
  updateReleaseInDb,
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

type CreateReleaseInput = {
  version: string;
  name: string;
  projectId: string;
  status?: ReleaseStatus;
  date?: string;
  features?: string[];
  fixes?: string[];
  notes?: string;
};

type CreateDocumentInput = {
  title: string;
  icon?: string;
  excerpt?: string;
  category?: Doc["category"];
  author?: string;
};

type CreateProjectNoteInput = {
  projectId: string;
  title?: string;
  body?: string;
};

type UpdateProfileInput = Partial<Pick<Member, "name" | "role" | "avatar" | "email">>;

type WorkspaceContextValue = {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  queries: SavedQuery[];
  activity: ActivityItem[];
  members: Member[];
  releases: Release[];
  documents: Doc[];
  projectNotes: ProjectNote[];
  notifications: Notification[];
  currentUserId: string;
  isLoading: boolean;
  isPersisted: boolean;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  createIssue: (input: CreateIssueInput) => Promise<Issue>;
  updateIssue: (id: string, patch: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  createQuery: (input: CreateQueryInput) => SavedQuery;
  updateQuery: (id: string, patch: Partial<SavedQuery>) => void;
  deleteQuery: (id: string) => void;
  createRelease: (input: CreateReleaseInput) => Release;
  updateRelease: (id: string, patch: Partial<Release>) => void;
  deleteRelease: (id: string) => void;
  createDocument: (input: CreateDocumentInput) => Doc;
  updateDocument: (id: string, patch: Partial<Doc>) => void;
  deleteDocument: (id: string) => void;
  createProjectNote: (input: CreateProjectNoteInput) => ProjectNote;
  updateProjectNote: (id: string, patch: Partial<ProjectNote>) => void;
  deleteProjectNote: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  currentMember: Member;
  completeOnboarding: (input: { name: string; role: string }) => Promise<void>;
  linkWorkItem: (sourceId: string, targetId: string) => void;
  unlinkWorkItem: (sourceId: string, targetId: string) => void;
  addActivity: (action: string, target: string) => void;
  refreshWorkspace: () => Promise<void>;
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

type TicketChangeKind = "status" | "priority";

function memberDisplayName(members: Member[], id: string): string {
  return members.find((member) => member.id === id)?.name || "Someone";
}

function ticketStakeholderIds(assigneeId: string, reporterId: string, actorId: string): string[] {
  return [...new Set([assigneeId, reporterId])].filter(
    (id) => id && id !== UNASSIGNED_ID && id !== actorId,
  );
}

function buildTicketChangeNotification(
  ticketId: string,
  kind: TicketChangeKind,
  from: string,
  to: string,
  actorName: string,
): Pick<Notification, "title" | "message" | "type"> {
  if (kind === "status") {
    return {
      title: `${ticketId} status changed`,
      message: `${actorName} changed status from ${from} to ${to}`,
      type: "status",
    };
  }
  return {
    title: `${ticketId} priority changed`,
    message: `${actorName} changed priority from ${from} to ${to}`,
    type: "priority",
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isPersisted, setIsPersisted] = useState(false);

  const currentUserId = user?.id ?? CURRENT_USER_ID;
  const canPersist = isSupabaseConfigured && Boolean(user);

  const loadWorkspaceData = useCallback(async () => {
    try {
      await ensureProfileForUser(user!);
    } catch (error) {
      console.error("Profile setup failed:", error);
    }

    let loadedMembers: Member[] = [];
    try {
      const profile = await fetchProfileById(user!.id);
      if (profile) loadedMembers = [profile];
    } catch (error) {
      console.warn("Could not load current user profile:", error);
    }

    try {
      const data = await fetchWorkspaceData();
      setProjects(data.projects);
      setTasks(data.tasks);
      setIssues(data.issues);
      setQueries(data.queries);
      setActivity(data.activity);
      setReleases(data.releases);
      setDocuments(data.documents);
      setProjectNotes(data.projectNotes);
      setNotifications(data.notifications);
      loadedMembers = data.members.length ? data.members : loadedMembers;
    } catch (error) {
      console.error("Workspace data load failed:", error);
      toast.error("Failed to load workspace data", {
        description: formatDbError(error),
      });
    }

    setMembers(loadedMembers);
    setIsPersisted(true);
  }, [user]);

  const refreshWorkspace = useCallback(async () => {
    if (!canPersist) return;
    try {
      await loadWorkspaceData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh workspace data");
    }
  }, [canPersist, loadWorkspaceData]);

  const mergeMembers = useCallback((incoming: Member[]) => {
    if (!incoming.length) return;
    setMembers((prev) => {
      const next = [...prev];
      let changed = false;
      for (const profile of incoming) {
        if (!next.some((member) => member.id === profile.id)) {
          next.push(profile);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    setActiveMembers(members);
  }, [members]);

  const attemptedMemberIdsRef = useRef(new Set<string>());

  const ensureMembersCached = useCallback(
    async (ids: string[]) => {
      if (!canPersist) return;
      const missing = ids.filter(
        (id) =>
          id &&
          id !== UNASSIGNED_ID &&
          !members.some((member) => member.id === id) &&
          !attemptedMemberIdsRef.current.has(id),
      );
      if (!missing.length) return;

      for (const id of missing) attemptedMemberIdsRef.current.add(id);

      try {
        const fetched = await fetchProfilesByIds(missing);
        mergeMembers(fetched);
      } catch (error) {
        console.warn("Could not resolve member profiles:", error);
      }
    },
    [canPersist, members, mergeMembers],
  );

  useEffect(() => {
    if (!canPersist || isLoading) return;

    const referencedIds = collectReferencedMemberIds({
      projects,
      tasks,
      issues,
      queries,
      activity,
      projectNotes,
    });
    const missingIds = referencedIds.filter(
      (id) => !members.some((member) => member.id === id) && !attemptedMemberIdsRef.current.has(id),
    );
    if (!missingIds.length) return;

    for (const id of missingIds) attemptedMemberIdsRef.current.add(id);

    void fetchProfilesByIds(missingIds)
      .then((fetched) => mergeMembers(fetched))
      .catch((error) => {
        console.warn("Could not resolve member profiles:", error);
      });
  }, [
    canPersist,
    isLoading,
    projects,
    tasks,
    issues,
    queries,
    activity,
    projectNotes,
    members,
    mergeMembers,
  ]);

  useEffect(() => {
    attemptedMemberIdsRef.current.clear();
  }, [user?.id]);

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
      setMembers([]);
      return;
    }

    let cancelled = false;

    async function hydrate() {
      setIsLoading(true);
      try {
        await loadWorkspaceData();
        if (cancelled) return;
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast.error("Failed to load workspace data", {
            description: formatDbError(error),
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
  }, [user, authLoading, loadWorkspaceData]);

  useEffect(() => {
    if (!canPersist) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
            unread: boolean;
            created_at: string;
          };
          const notification = mapNotification(row);
          setNotifications((prev) => {
            if (prev.some((item) => item.id === notification.id)) return prev;
            return [notification, ...prev];
          });
          toast.info(notification.title, { description: notification.message });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canPersist, currentUserId]);

  const persist = useCallback(
    async (operation: () => Promise<void>) => {
      if (!canPersist) return;
      try {
        await operation();
      } catch (error) {
        console.error(error);
        toast.error("Failed to save changes", {
          description: formatDbError(error),
        });
      }
    },
    [canPersist],
  );

  const persistRequired = useCallback(
    async (operation: () => Promise<void>, message = "Failed to save changes") => {
      if (!canPersist) {
        const description = isSupabaseConfigured
          ? "Sign in to save your work."
          : "Database is not configured.";
        toast.error("Unable to save", { description });
        throw new Error(description);
      }
      try {
        await operation();
      } catch (error) {
        console.error(error);
        toast.error(message, {
          description: formatDbError(error),
        });
        throw error;
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

  const notifyTicketStakeholders = useCallback(
    (
      ticket: { id: string; assigneeId: string; reporterId: string },
      kind: TicketChangeKind,
      from: string,
      to: string,
    ) => {
      if (from === to) return;

      const actorName = memberDisplayName(members, currentUserId);
      const content = buildTicketChangeNotification(ticket.id, kind, from, to, actorName);
      const recipients = ticketStakeholderIds(ticket.assigneeId, ticket.reporterId, currentUserId);

      for (const userId of recipients) {
        const notification: Notification = {
          id: generateEntityId("n"),
          ...content,
          time: "just now",
          unread: true,
        };

        void persist(async () => {
          try {
            await saveNotification(notification, userId);
          } catch (error) {
            console.warn("Could not deliver ticket notification:", error);
          }
        });
      }
    },
    [members, currentUserId, persist],
  );

  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<Task> => {
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
      await persistRequired(async () => {
        await ensureProjectInDb(project);
        await saveTask(task);
      }, "Failed to create task");
      setTasks((prev) => [task, ...prev]);
      addActivity("created task", input.parentId ? `${task.id} under ${input.parentId}` : task.id);
      void ensureMembersCached([task.assigneeId, task.reporterId]);
      toast.success(`${task.id} created`);
      return task;
    },
    [projects, tasks, issues, addActivity, currentUserId, persistRequired, ensureMembersCached],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === id);
        if (task) {
          if (patch.status !== undefined && patch.status !== task.status) {
            notifyTicketStakeholders(task, "status", task.status, patch.status);
          }
          if (patch.priority !== undefined && patch.priority !== task.priority) {
            notifyTicketStakeholders(task, "priority", task.priority, patch.priority);
          }
        }
        return prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      });
      if (patch.status) addActivity("moved", `${id} to ${patch.status}`);
      void persist(() => updateTaskInDb(id, patch));
      void ensureMembersCached(
        [patch.assigneeId, patch.reporterId].filter((id): id is string => Boolean(id)),
      );
    },
    [addActivity, persist, ensureMembersCached, notifyTicketStakeholders],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      addActivity("deleted task", id);
      toast.success(`${id} deleted`);
      void persist(() => deleteTaskInDb(id));
    },
    [addActivity, persist],
  );

  const createIssue = useCallback(
    async (input: CreateIssueInput): Promise<Issue> => {
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
      await persistRequired(async () => {
        await ensureProjectInDb(project);
        await saveIssue(issue);
      }, "Failed to create issue");
      setIssues((prev) => [issue, ...prev]);
      addActivity("opened", input.parentId ? `${issue.id} under ${input.parentId}` : issue.id);
      void ensureMembersCached([issue.assigneeId, issue.reporterId]);
      toast.success(`${issue.id} created`);
      return issue;
    },
    [projects, tasks, issues, addActivity, currentUserId, persistRequired, ensureMembersCached],
  );

  const updateIssue = useCallback(
    (id: string, patch: Partial<Issue>) => {
      setIssues((prev) => {
        const issue = prev.find((i) => i.id === id);
        if (issue) {
          if (patch.status !== undefined && patch.status !== issue.status) {
            notifyTicketStakeholders(issue, "status", issue.status, patch.status);
          }
          if (patch.severity !== undefined && patch.severity !== issue.severity) {
            notifyTicketStakeholders(issue, "priority", issue.severity, patch.severity);
          }
        }
        return prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
      });
      if (patch.status) addActivity("updated", `${id} → ${patch.status}`);
      void persist(() => updateIssueInDb(id, patch));
      void ensureMembersCached(
        [patch.assigneeId, patch.reporterId].filter((id): id is string => Boolean(id)),
      );
    },
    [addActivity, persist, ensureMembersCached, notifyTicketStakeholders],
  );

  const deleteIssue = useCallback(
    (id: string) => {
      setIssues((prev) => prev.filter((i) => i.id !== id));
      addActivity("deleted issue", id);
      toast.success(`${id} deleted`);
      void persist(() => deleteIssueInDb(id));
    },
    [addActivity, persist],
  );

  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<Project> => {
      const memberIds = input.memberIds?.length
        ? [...new Set([input.leadId, ...input.memberIds])]
        : [input.leadId];
      const project: Project = {
        id: generateEntityId("p"),
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
      await persistRequired(() => saveProject(project), "Failed to create project");
      setProjects((prev) => [project, ...prev]);
      addActivity("created project", project.name);
      void ensureMembersCached([project.leadId, ...project.memberIds]);
      toast.success(`Project ${project.key} created`);
      return project;
    },
    [projects, addActivity, persistRequired, ensureMembersCached],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      if (patch.status || patch.name) addActivity("updated project", patch.name ?? id);
      void persist(() => updateProjectInDb(id, patch));
      void ensureMembersCached(
        [patch.leadId, ...(patch.memberIds ?? [])].filter((memberId): memberId is string => Boolean(memberId)),
      );
    },
    [addActivity, persist, ensureMembersCached],
  );

  const deleteProject = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) => prev.filter((t) => t.projectId !== id));
      setIssues((prev) => prev.filter((i) => i.projectId !== id));
      setProjectNotes((prev) => prev.filter((n) => n.projectId !== id));
      addActivity("deleted project", project?.name ?? id);
      toast.success("Project deleted");
      void persist(() => deleteProjectInDb(id));
    },
    [projects, addActivity, persist],
  );

  const createQuery = useCallback(
    (input: CreateQueryInput): SavedQuery => {
      const query: SavedQuery = {
        id: generateEntityId("Q"),
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

  const updateQuery = useCallback(
    (id: string, patch: Partial<SavedQuery>) => {
      setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
      toast.success("Query updated");
      void persist(() => updateQueryInDb(id, patch));
    },
    [persist],
  );

  const deleteQuery = useCallback(
    (id: string) => {
      setQueries((prev) => prev.filter((q) => q.id !== id));
      toast.success("Query deleted");
      void persist(() => deleteQueryInDb(id));
    },
    [persist],
  );

  const createRelease = useCallback(
    (input: CreateReleaseInput): Release => {
      const release: Release = {
        id: generateEntityId("rel"),
        version: input.version,
        name: input.name,
        status: input.status ?? "Planned",
        date: input.date ?? new Date().toISOString().slice(0, 10),
        features: input.features ?? [],
        fixes: input.fixes ?? [],
        notes: input.notes ?? "",
        projectId: input.projectId,
      };
      setReleases((prev) => [release, ...prev]);
      addActivity("created release", `v${release.version}`);
      toast.success(`Release v${release.version} created`);
      void persist(() => saveRelease(release));
      return release;
    },
    [addActivity, persist],
  );

  const updateRelease = useCallback(
    (id: string, patch: Partial<Release>) => {
      setReleases((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      void persist(() => updateReleaseInDb(id, patch));
    },
    [persist],
  );

  const deleteRelease = useCallback(
    (id: string) => {
      setReleases((prev) => prev.filter((r) => r.id !== id));
      toast.success("Release deleted");
      void persist(() => deleteReleaseInDb(id));
    },
    [persist],
  );

  const createDocument = useCallback(
    (input: CreateDocumentInput): Doc => {
      const author = input.author ?? members.find((m) => m.id === currentUserId)?.name ?? "User";
      const doc: Doc = {
        id: generateEntityId("doc"),
        title: input.title,
        icon: input.icon ?? "📄",
        excerpt: input.excerpt ?? "",
        category: input.category ?? "Engineering",
        author,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      setDocuments((prev) => [doc, ...prev]);
      addActivity("created document", doc.title);
      toast.success(`Document "${doc.title}" created`);
      void persist(() => saveDocument(doc));
      return doc;
    },
    [members, currentUserId, addActivity, persist],
  );

  const updateDocument = useCallback(
    (id: string, patch: Partial<Doc>) => {
      const withDate = { ...patch, updatedAt: new Date().toISOString().slice(0, 10) };
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...withDate } : d)));
      void persist(() => updateDocumentInDb(id, withDate));
    },
    [persist],
  );

  const deleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
      void persist(() => deleteDocumentInDb(id));
    },
    [persist],
  );

  const createProjectNote = useCallback(
    (input: CreateProjectNoteInput): ProjectNote => {
      const now = new Date().toISOString();
      const note: ProjectNote = {
        id: generateEntityId("note"),
        projectId: input.projectId,
        title: input.title ?? "Untitled note",
        body: input.body ?? "",
        authorId: currentUserId,
        createdAt: now,
        updatedAt: now,
      };
      setProjectNotes((prev) => [note, ...prev]);
      addActivity("added note", note.title);
      toast.success("Note created");
      void persist(() => saveProjectNote(note));
      return note;
    },
    [currentUserId, addActivity, persist],
  );

  const updateProjectNote = useCallback(
    (id: string, patch: Partial<ProjectNote>) => {
      const withDate = { ...patch, updatedAt: new Date().toISOString() };
      setProjectNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...withDate } : n)));
      void persist(() => updateProjectNoteInDb(id, withDate));
    },
    [persist],
  );

  const deleteProjectNote = useCallback(
    (id: string) => {
      setProjectNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
      void persist(() => deleteProjectNoteInDb(id));
    },
    [persist],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
      void persist(() => updateNotificationInDb(id, { unread: false }));
    },
    [persist],
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    void persist(() => markAllNotificationsReadInDb(currentUserId));
  }, [currentUserId, persist]);

  const deleteNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      void persist(() => deleteNotificationInDb(id));
    },
    [persist],
  );

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      setMembers((prev) => {
        const existing = prev.find((member) => member.id === currentUserId);
        const updated: Member = existing
          ? { ...existing, ...input }
          : {
              id: currentUserId,
              name: input.name ?? "",
              role: input.role ?? "",
              avatar: input.avatar ?? "?",
              email: input.email ?? user?.email ?? "",
            };
        const next = existing
          ? prev.map((member) => (member.id === currentUserId ? updated : member))
          : [...prev, updated];
        return next;
      });
      await persistRequired(() => updateProfileInDb(currentUserId, input));
    },
    [currentUserId, persistRequired, user?.email],
  );

  const currentMember = useMemo((): Member => {
    const found = members.find((member) => member.id === currentUserId);
    if (found) return found;
    return {
      id: currentUserId,
      name: "",
      role: "",
      avatar: "?",
      email: user?.email ?? "",
    };
  }, [members, currentUserId, user?.email]);

  const completeOnboarding = useCallback(
    async (input: { name: string; role: string }) => {
      if (!canPersist) return;
      const updated = await completeOnboardingInDb(currentUserId, input);
      setMembers((prev) => prev.map((member) => (member.id === currentUserId ? updated : member)));
    },
    [canPersist, currentUserId],
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
      releases,
      documents,
      projectNotes,
      notifications,
      currentUserId,
      currentMember,
      isLoading,
      isPersisted,
      createTask,
      updateTask,
      deleteTask,
      createIssue,
      updateIssue,
      deleteIssue,
      createProject,
      updateProject,
      deleteProject,
      createQuery,
      updateQuery,
      deleteQuery,
      createRelease,
      updateRelease,
      deleteRelease,
      createDocument,
      updateDocument,
      deleteDocument,
      createProjectNote,
      updateProjectNote,
      deleteProjectNote,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      updateProfile,
      completeOnboarding,
      linkWorkItem,
      unlinkWorkItem,
      addActivity,
      refreshWorkspace,
    }),
    [
      projects,
      tasks,
      issues,
      queries,
      activity,
      members,
      releases,
      documents,
      projectNotes,
      notifications,
      currentUserId,
      currentMember,
      isLoading,
      isPersisted,
      createTask,
      updateTask,
      deleteTask,
      createIssue,
      updateIssue,
      deleteIssue,
      createProject,
      updateProject,
      deleteProject,
      createQuery,
      updateQuery,
      deleteQuery,
      createRelease,
      updateRelease,
      deleteRelease,
      createDocument,
      updateDocument,
      deleteDocument,
      createProjectNote,
      updateProjectNote,
      deleteProjectNote,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      updateProfile,
      completeOnboarding,
      linkWorkItem,
      unlinkWorkItem,
      addActivity,
      refreshWorkspace,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
