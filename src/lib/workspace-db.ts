import { formatDistanceToNow } from "date-fns";
import type {
  ActivityItem,
  Issue,
  Member,
  Project,
  QueryFilters,
  SavedQuery,
  Task,
} from "@/lib/data";
import { getSupabaseClient } from "@/lib/supabase";

export const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

type WorkspaceData = {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  queries: SavedQuery[];
  activity: ActivityItem[];
  members: Member[];
};

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

function mapProfile(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}): Member {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    email: row.email,
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

export async function fetchWorkspaceData(workspaceId = DEFAULT_WORKSPACE_ID): Promise<WorkspaceData> {
  const supabase = requireClient();

  const [profilesRes, projectsRes, tasksRes, issuesRes, queriesRes, activityRes] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("profile:profiles(id, name, email, role, avatar)")
      .eq("workspace_id", workspaceId),
    supabase.from("projects").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("issues").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("saved_queries").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("activities").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (issuesRes.error) throw issuesRes.error;
  if (queriesRes.error) throw queriesRes.error;
  if (activityRes.error) throw activityRes.error;

  const members = (profilesRes.data ?? [])
    .map((row) => row.profile)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => mapProfile(p));

  return {
    members,
    projects: (projectsRes.data ?? []).map(mapProject),
    tasks: (tasksRes.data ?? []).map(mapTask),
    issues: (issuesRes.data ?? []).map(mapIssue),
    queries: (queriesRes.data ?? []).map(mapQuery),
    activity: (activityRes.data ?? []).map(mapActivity),
  };
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
  if (error) throw error;
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
    linked_item_ids: task.linkedItemIds ?? [],
    created_at: task.createdAt,
  });
  if (error) throw error;
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
    linked_item_ids: issue.linkedItemIds ?? [],
    created_at: issue.createdAt,
  });
  if (error) throw error;
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
    .select("id, name, email, role, avatar")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return mapProfile(existing);

  const member: Member = {
    id: user.id,
    name,
    email: user.email ?? "",
    role: "Developer",
    avatar: name.slice(0, 2).toUpperCase(),
  };

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    avatar: member.avatar,
  });
  if (profileError) throw profileError;

  const { error: memberError } = await supabase.from("workspace_members").upsert({
    workspace_id: DEFAULT_WORKSPACE_ID,
    profile_id: member.id,
    role: "member",
  });
  if (memberError) throw memberError;

  return member;
}
