import { formatDistanceToNow } from "date-fns";
import type {
  ActivityItem,
  Doc,
  Issue,
  Member,
  Notification,
  Project,
  QueryFilters,
  Release,
  SavedQuery,
  Task,
  TicketAttachment,
  ProjectNote,
} from "@/lib/data";
import { UNASSIGNED_ID } from "@/lib/data";
import { markOnboardingCompleteLocally } from "@/lib/onboarding";
import { getSupabaseClient } from "@/lib/supabase";

export const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const PROFILE_COLUMNS = "id, name, email, role, avatar";

export async function fetchProfileById(id: string): Promise<Member | null> {
  const supabase = requireClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

function isResolvableMemberId(id: string): boolean {
  if (!id || id === UNASSIGNED_ID) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function collectReferencedMemberIds(data: {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  queries: SavedQuery[];
  activity: ActivityItem[];
  projectNotes: ProjectNote[];
}): string[] {
  const ids = new Set<string>();

  for (const project of data.projects) {
    if (isResolvableMemberId(project.leadId)) ids.add(project.leadId);
    for (const memberId of project.memberIds) {
      if (isResolvableMemberId(memberId)) ids.add(memberId);
    }
  }
  for (const task of data.tasks) {
    if (isResolvableMemberId(task.assigneeId)) ids.add(task.assigneeId);
    if (isResolvableMemberId(task.reporterId)) ids.add(task.reporterId);
  }
  for (const issue of data.issues) {
    if (isResolvableMemberId(issue.assigneeId)) ids.add(issue.assigneeId);
    if (isResolvableMemberId(issue.reporterId)) ids.add(issue.reporterId);
  }
  for (const query of data.queries) {
    if (isResolvableMemberId(query.createdBy)) ids.add(query.createdBy);
  }
  for (const item of data.activity) {
    if (isResolvableMemberId(item.userId)) ids.add(item.userId);
  }
  for (const note of data.projectNotes) {
    if (isResolvableMemberId(note.authorId)) ids.add(note.authorId);
  }

  return [...ids];
}

export async function fetchProfilesByIds(ids: string[]): Promise<Member[]> {
  const uniqueIds = [...new Set(ids.filter(isResolvableMemberId))];
  if (!uniqueIds.length) return [];

  const supabase = requireClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", uniqueIds);
  if (error) {
    console.warn("profiles batch fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapProfile);
}

export function generateEntityId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

type WorkspaceData = {
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
};

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

export function formatDbError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Please try again.";
}

function throwDbError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function mapProfile(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  onboarding_completed?: boolean;
}): Member {
  return {
    id: row.id,
    name: row.name ?? "",
    role: row.role ?? "",
    avatar: row.avatar ?? "?",
    email: row.email ?? "",
    onboardingCompleted: row.onboarding_completed,
  };
}

function mapProject(row: {
  id: string;
  key: string;
  name: string;
  description: string;
  template: string;
  progress: number;
  status: string;
  priority: string;
  due_date: string | null;
  tags: string[] | null;
  member_ids: string[] | null;
  lead_id: string;
  color: string;
}): Project {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    template: row.template as Project["template"],
    progress: row.progress,
    status: row.status as Project["status"],
    priority: row.priority as Project["priority"],
    dueDate: row.due_date ?? "",
    tags: row.tags ?? [],
    memberIds: row.member_ids ?? [],
    leadId: row.lead_id,
    color: row.color,
  };
}

function mapTask(row: {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string;
  reporter_id: string;
  project_id: string;
  due_date: string | null;
  labels: string[] | null;
  comments_count: number;
  attachments_count: number;
  created_at: string;
  parent_id: string | null;
  linked_item_ids: string[] | null;
}): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    assigneeId: row.assignee_id,
    reporterId: row.reporter_id,
    projectId: row.project_id,
    dueDate: row.due_date ?? "",
    labels: row.labels ?? [],
    comments: row.comments_count,
    attachments: row.attachments_count,
    createdAt: row.created_at,
    ...(row.parent_id ? { parentId: row.parent_id } : {}),
    ...(row.linked_item_ids?.length ? { linkedItemIds: row.linked_item_ids } : {}),
  };
}

function mapIssue(row: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  severity: string;
  status: string;
  project_id: string;
  assignee_id: string;
  reporter_id: string;
  created_at: string;
  steps_to_reproduce: string | null;
  expected: string | null;
  actual: string | null;
  parent_id: string | null;
  linked_item_ids: string[] | null;
}): Issue {
  return {
    id: row.id,
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    type: row.type as Issue["type"],
    severity: row.severity as Issue["severity"],
    status: row.status as Issue["status"],
    projectId: row.project_id,
    assigneeId: row.assignee_id,
    reporterId: row.reporter_id,
    createdAt: row.created_at,
    stepsToReproduce: row.steps_to_reproduce ?? undefined,
    expected: row.expected ?? undefined,
    actual: row.actual ?? undefined,
    ...(row.parent_id ? { parentId: row.parent_id } : {}),
    ...(row.linked_item_ids?.length ? { linkedItemIds: row.linked_item_ids } : {}),
  };
}

function mapQuery(row: {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  filters: QueryFilters;
  created_at: string;
  created_by: string;
}): SavedQuery {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    projectId: row.project_id ?? undefined,
    filters: row.filters,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function mapActivity(row: {
  id: string;
  user_id: string;
  action: string;
  target: string;
  created_at: string;
}): ActivityItem {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    target: row.target,
    time: formatDistanceToNow(new Date(row.created_at), { addSuffix: true }),
  };
}

function mapRelease(row: {
  id: string;
  version: string;
  name: string;
  status: string;
  release_date: string | null;
  features: string[] | null;
  fixes: string[] | null;
  notes: string;
  project_id: string | null;
}): Release {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    status: row.status as Release["status"],
    date: row.release_date ?? new Date().toISOString().slice(0, 10),
    features: row.features ?? [],
    fixes: row.fixes ?? [],
    notes: row.notes,
    projectId: row.project_id ?? "",
  };
}

function mapDocument(row: {
  id: string;
  title: string;
  icon: string;
  excerpt: string;
  category: string;
  author: string;
  updated_at: string;
}): Doc {
  return {
    id: row.id,
    title: row.title,
    icon: row.icon,
    excerpt: row.excerpt,
    category: row.category as Doc["category"],
    author: row.author,
    updatedAt: row.updated_at,
  };
}

function mapProjectNote(row: {
  id: string;
  project_id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}): ProjectNote {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotification(row: {
  id: string;
  title: string;
  message: string;
  type: string;
  unread: boolean;
  created_at: string;
}): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type as Notification["type"],
    unread: row.unread,
    time: formatDistanceToNow(new Date(row.created_at), { addSuffix: true }),
  };
}

function mapAttachment(row: {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  url: string;
  created_at: string;
}): TicketAttachment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileType: row.file_type,
    url: row.url,
    createdAt: row.created_at,
  };
}

export async function fetchWorkspaceData(workspaceId = DEFAULT_WORKSPACE_ID): Promise<WorkspaceData> {
  const supabase = requireClient();

  const [
    profilesRes,
    projectsRes,
    tasksRes,
    issuesRes,
    queriesRes,
    activityRes,
    releasesRes,
    documentsRes,
    projectNotesRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).order("name"),
    supabase.from("projects").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("issues").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("saved_queries").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("activities").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("releases").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    supabase.from("project_notes").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
  ]);

  if (profilesRes.error) {
    console.warn("profiles unavailable:", profilesRes.error.message);
  }
  if (projectsRes.error) {
    console.warn("projects unavailable:", projectsRes.error.message);
  }
  if (tasksRes.error) {
    console.warn("tasks unavailable:", tasksRes.error.message);
  }
  if (issuesRes.error) {
    console.warn("issues unavailable:", issuesRes.error.message);
  }
  if (queriesRes.error) {
    console.warn("saved queries unavailable:", queriesRes.error.message);
  }
  if (activityRes.error) {
    console.warn("activities unavailable:", activityRes.error.message);
  }
  if (releasesRes.error) {
    console.warn("releases unavailable:", releasesRes.error.message);
  }
  if (documentsRes.error) {
    console.warn("documents unavailable:", documentsRes.error.message);
  }

  const projectNotes = projectNotesRes.error
    ? []
    : (projectNotesRes.data ?? []).map(mapProjectNote);
  if (projectNotesRes.error) {
    console.warn("project_notes unavailable:", projectNotesRes.error.message);
  }

  const notifications = notificationsRes.error
    ? []
    : (notificationsRes.data ?? []).map(mapNotification);
  if (notificationsRes.error) {
    console.warn("notifications unavailable:", notificationsRes.error.message);
  }

  const members = profilesRes.error ? [] : (profilesRes.data ?? []).map(mapProfile);

  const projects = projectsRes.error ? [] : (projectsRes.data ?? []).map(mapProject);
  const tasks = tasksRes.error ? [] : (tasksRes.data ?? []).map(mapTask);
  const issues = issuesRes.error ? [] : (issuesRes.data ?? []).map(mapIssue);
  const queries = queriesRes.error ? [] : (queriesRes.data ?? []).map(mapQuery);
  const activity = activityRes.error ? [] : (activityRes.data ?? []).map(mapActivity);
  const releases = releasesRes.error ? [] : (releasesRes.data ?? []).map(mapRelease);
  const documents = documentsRes.error ? [] : (documentsRes.data ?? []).map(mapDocument);

  const memberIds = new Set(members.map((member) => member.id));
  const missingMemberIds = collectReferencedMemberIds({
    projects,
    tasks,
    issues,
    queries,
    activity,
    projectNotes,
  }).filter((id) => !memberIds.has(id));
  const referencedMembers = missingMemberIds.length ? await fetchProfilesByIds(missingMemberIds) : [];

  return {
    members: [...members, ...referencedMembers],
    projects,
    tasks,
    issues,
    queries,
    activity,
    releases,
    documents,
    projectNotes,
    notifications,
  };
}

export async function ensureWorkspaceMembership(): Promise<void> {
  const supabase = requireClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc("ensure_default_workspace_membership");
  if (!error) return;

  const isMissingRpc =
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message.includes("ensure_default_workspace_membership");
  if (!isMissingRpc) {
    console.warn("ensure_default_workspace_membership failed:", error.message);
  }

  const { error: insertError } = await supabase.from("workspace_members").insert({
    workspace_id: DEFAULT_WORKSPACE_ID,
    profile_id: user.id,
    role: "member",
  });

  if (!insertError) return;
  if (insertError.code === "23505") return;

  const isRlsBlocked =
    insertError.code === "42501" || insertError.message.includes("row-level security");
  if (isRlsBlocked) {
    console.warn(
      "Workspace membership insert blocked by RLS. Apply supabase/migrations/006_ensure_workspace_membership.sql in Supabase.",
    );
    return;
  }

  console.warn("Could not ensure workspace membership:", insertError.message);
}

export async function ensureProjectInDb(
  project: Project,
  workspaceId = DEFAULT_WORKSPACE_ID,
): Promise<void> {
  const supabase = requireClient();
  const { data, error } = await supabase.from("projects").select("id").eq("id", project.id).maybeSingle();
  throwDbError(error);
  if (data) return;
  await saveProject(project, workspaceId);
}

export async function saveProject(project: Project, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("projects").insert({
    id: project.id,
    workspace_id: workspaceId,
    key: project.key,
    name: project.name,
    description: project.description,
    template: project.template,
    progress: project.progress,
    status: project.status,
    priority: project.priority,
    due_date: project.dueDate || null,
    tags: project.tags,
    member_ids: project.memberIds,
    lead_id: project.leadId,
    color: project.color,
  });
  throwDbError(error);
}

export async function saveTask(task: Task, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("tasks").insert({
    id: task.id,
    workspace_id: workspaceId,
    project_id: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assigneeId,
    reporter_id: task.reporterId,
    due_date: task.dueDate || null,
    labels: task.labels,
    comments_count: task.comments,
    attachments_count: task.attachments,
    parent_id: task.parentId ?? null,
    created_at: task.createdAt,
  });
  throwDbError(error);
}

export async function updateTaskInDb(id: string, patch: Partial<Task>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId;
  if (patch.reporterId !== undefined) row.reporter_id = patch.reporterId;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate || null;
  if (patch.labels !== undefined) row.labels = patch.labels;
  if (patch.comments !== undefined) row.comments_count = patch.comments;
  if (patch.attachments !== undefined) row.attachments_count = patch.attachments;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId ?? null;
  if (patch.linkedItemIds !== undefined) row.linked_item_ids = patch.linkedItemIds;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("tasks").update(row).eq("id", id);
  if (error) throw error;
}

export async function saveIssue(issue: Issue, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("issues").insert({
    id: issue.id,
    workspace_id: workspaceId,
    project_id: issue.projectId,
    title: issue.title,
    description: issue.description ?? null,
    type: issue.type,
    severity: issue.severity,
    status: issue.status,
    assignee_id: issue.assigneeId,
    reporter_id: issue.reporterId,
    steps_to_reproduce: issue.stepsToReproduce ?? null,
    expected: issue.expected ?? null,
    actual: issue.actual ?? null,
    parent_id: issue.parentId ?? null,
    created_at: issue.createdAt,
  });
  throwDbError(error);
}

export async function updateIssueInDb(id: string, patch: Partial<Issue>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description ?? null;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.severity !== undefined) row.severity = patch.severity;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId;
  if (patch.reporterId !== undefined) row.reporter_id = patch.reporterId;
  if (patch.stepsToReproduce !== undefined) row.steps_to_reproduce = patch.stepsToReproduce ?? null;
  if (patch.expected !== undefined) row.expected = patch.expected ?? null;
  if (patch.actual !== undefined) row.actual = patch.actual ?? null;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId ?? null;
  if (patch.linkedItemIds !== undefined) row.linked_item_ids = patch.linkedItemIds;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("issues").update(row).eq("id", id);
  if (error) throw error;
}

export async function saveQuery(query: SavedQuery, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("saved_queries").insert({
    id: query.id,
    workspace_id: workspaceId,
    name: query.name,
    description: query.description ?? null,
    project_id: query.projectId ?? null,
    filters: query.filters,
    created_at: query.createdAt,
    created_by: query.createdBy,
  });
  if (error) throw error;
}

export async function deleteQueryInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("saved_queries").delete().eq("id", id);
  if (error) throw error;
}

export async function saveActivity(item: ActivityItem, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("activities").insert({
    id: item.id,
    workspace_id: workspaceId,
    user_id: item.userId,
    action: item.action,
    target: item.target,
  });
  if (error) throw error;
}

export async function updateProjectInDb(id: string, patch: Partial<Project>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.key !== undefined) row.key = patch.key;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.template !== undefined) row.template = patch.template;
  if (patch.progress !== undefined) row.progress = patch.progress;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate || null;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.memberIds !== undefined) row.member_ids = patch.memberIds;
  if (patch.leadId !== undefined) row.lead_id = patch.leadId;
  if (patch.color !== undefined) row.color = patch.color;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("projects").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteProjectInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteTaskInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteIssueInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) throw error;
}

export async function updateQueryInDb(id: string, patch: Partial<SavedQuery>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description ?? null;
  if (patch.projectId !== undefined) row.project_id = patch.projectId ?? null;
  if (patch.filters !== undefined) row.filters = patch.filters;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("saved_queries").update(row).eq("id", id);
  if (error) throw error;
}

export async function saveRelease(release: Release, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("releases").insert({
    id: release.id,
    workspace_id: workspaceId,
    project_id: release.projectId || null,
    version: release.version,
    name: release.name,
    status: release.status,
    release_date: release.date || null,
    features: release.features,
    fixes: release.fixes,
    notes: release.notes,
  });
  if (error) throw error;
}

export async function updateReleaseInDb(id: string, patch: Partial<Release>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.version !== undefined) row.version = patch.version;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.date !== undefined) row.release_date = patch.date || null;
  if (patch.features !== undefined) row.features = patch.features;
  if (patch.fixes !== undefined) row.fixes = patch.fixes;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.projectId !== undefined) row.project_id = patch.projectId || null;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("releases").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteReleaseInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("releases").delete().eq("id", id);
  if (error) throw error;
}

export async function saveDocument(doc: Doc, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("documents").insert({
    id: doc.id,
    workspace_id: workspaceId,
    title: doc.title,
    icon: doc.icon,
    excerpt: doc.excerpt,
    category: doc.category,
    author: doc.author,
    updated_at: doc.updatedAt,
  });
  if (error) throw error;
}

export async function updateDocumentInDb(id: string, patch: Partial<Doc>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.excerpt !== undefined) row.excerpt = patch.excerpt;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.author !== undefined) row.author = patch.author;
  if (patch.updatedAt !== undefined) row.updated_at = patch.updatedAt;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("documents").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteDocumentInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function saveProjectNote(note: ProjectNote, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("project_notes").insert({
    id: note.id,
    workspace_id: workspaceId,
    project_id: note.projectId,
    title: note.title,
    body: note.body,
    author_id: note.authorId,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  });
  if (error) throw error;
}

export async function updateProjectNoteInDb(id: string, patch: Partial<ProjectNote>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  if (patch.authorId !== undefined) row.author_id = patch.authorId;
  if (patch.updatedAt !== undefined) row.updated_at = patch.updatedAt;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("project_notes").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteProjectNoteInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("project_notes").delete().eq("id", id);
  if (error) throw error;
}

export async function saveNotification(notification: Notification, userId: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase.from("notifications").insert({
    id: notification.id,
    workspace_id: workspaceId,
    user_id: userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    unread: notification.unread,
  });
  if (error) throw error;
}

export async function updateNotificationInDb(id: string, patch: Partial<Pick<Notification, "unread">>) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.unread !== undefined) row.unread = patch.unread;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("notifications").update(row).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsReadInDb(userId: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  const supabase = requireClient();
  const { error } = await supabase
    .from("notifications")
    .update({ unread: false })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("unread", true);
  if (error) throw error;
}

export async function deleteNotificationInDb(id: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function updateProfileInDb(
  id: string,
  patch: Partial<
    Pick<Member, "name" | "role" | "avatar" | "email" | "onboardingCompleted"> & { avatarUrl?: string }
  >,
) {
  const supabase = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.avatar !== undefined) row.avatar = patch.avatar;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.onboardingCompleted !== undefined) row.onboarding_completed = patch.onboardingCompleted;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("profiles").update(row).eq("id", id);
  if (error) throw error;
}

export async function completeOnboardingInDb(
  id: string,
  input: { name: string; role: string },
): Promise<Member> {
  const supabase = requireClient();
  const avatar = input.name.slice(0, 2).toUpperCase();
  const patch = {
    name: input.name.trim(),
    role: input.role.trim(),
    avatar,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;

  // Optional column — ignore if migration not applied yet
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", id);

  markOnboardingCompleteLocally(id);
  return { ...mapProfile(data), onboardingCompleted: true };
}

export async function fetchTicketAttachments(ticketId: string): Promise<TicketAttachment[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAttachment);
}

export async function deleteTicketAttachmentInDb(id: string, filePath: string) {
  const supabase = requireClient();
  const { error: storageError } = await supabase.storage.from("attachments").remove([filePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("task_attachments").delete().eq("id", id);
  if (error) throw error;
}

export async function ensureProfileForUser(user: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}): Promise<Member> {
  const supabase = requireClient();
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";

  const { data: existing } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    const authEmail = user.email?.trim() ?? "";
    const profileEmail = existing.email?.trim() ?? "";

    if (!profileEmail && authEmail) {
      const { error } = await supabase.from("profiles").update({ email: authEmail }).eq("id", user.id);
      if (error) throw error;
      await ensureWorkspaceMembership();
      return mapProfile({ ...existing, email: authEmail });
    }

    await ensureWorkspaceMembership();
    return mapProfile(existing);
  }

  const member: Member = {
    id: user.id,
    name,
    email: user.email ?? "",
    role: "Developer",
    avatar: name.slice(0, 2).toUpperCase(),
    onboardingCompleted: false,
  };

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    avatar: member.avatar,
  });
  if (profileError) throw profileError;

  await ensureWorkspaceMembership();
  return member;
}
