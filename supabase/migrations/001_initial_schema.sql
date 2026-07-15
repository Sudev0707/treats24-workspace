-- Treats24 Workspace — initial Supabase schema
-- Run in Supabase SQL Editor or via Supabase CLI

-- Extensions
create extension if not exists "pgcrypto";

-- Default workspace (single-workspace MVP)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', false, 52428800, null),
  ('documents', 'documents', false, 52428800, null),
  ('project-assets', 'project-assets', false, 52428800, null)
on conflict (id) do nothing;

-- Profiles (team members)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null default '',
  role text not null default 'Developer',
  avatar text not null default '?',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Treats24',
  slug text not null unique default 'treats24',
  created_at timestamptz not null default now()
);

-- Seed default workspace
insert into public.workspaces (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Treats24', 'treats24')
on conflict (slug) do nothing;

-- Workspace membership
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  primary key (workspace_id, profile_id)
);

-- Projects
create table if not exists public.projects (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  template text not null default 'kanban',
  progress integer not null default 0,
  status text not null default 'Planning',
  priority text not null default 'Medium',
  due_date date,
  tags text[] not null default '{}',
  member_ids text[] not null default '{}',
  lead_id text not null,
  color text not null default 'from-[#7c3aed] to-[#5b21b6]',
  created_at timestamptz not null default now(),
  unique (workspace_id, key)
);

-- Tasks
create table if not exists public.tasks (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'To Do',
  priority text not null default 'Medium',
  assignee_id text not null,
  reporter_id text not null,
  due_date date,
  labels text[] not null default '{}',
  comments_count integer not null default 0,
  attachments_count integer not null default 0,
  parent_id text,
  created_at date not null default current_date
);

-- Issues
create table if not exists public.issues (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'Bug',
  severity text not null default 'Medium',
  status text not null default 'To Do',
  assignee_id text not null,
  reporter_id text not null,
  steps_to_reproduce text,
  expected text,
  actual text,
  parent_id text,
  created_at date not null default current_date
);

-- Saved queries / filters
create table if not exists public.saved_queries (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  project_id text references public.projects (id) on delete set null,
  filters jsonb not null default '{}',
  created_at date not null default current_date,
  created_by text not null
);

-- Activity feed
create table if not exists public.activities (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id text not null,
  action text not null,
  target text not null,
  created_at timestamptz not null default now()
);

-- Task/issue attachments metadata
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  ticket_id text not null,
  file_name text not null,
  file_path text not null,
  file_size bigint not null default 0,
  file_type text not null default '',
  url text not null,
  created_at timestamptz not null default now()
);

-- Releases
create table if not exists public.releases (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id text references public.projects (id) on delete set null,
  version text not null,
  name text not null,
  status text not null default 'Planned',
  release_date date,
  features text[] not null default '{}',
  fixes text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Documents
create table if not exists public.documents (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  icon text not null default '📄',
  excerpt text not null default '',
  category text not null default 'Engineering',
  author text not null,
  updated_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists public.notifications (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id text not null,
  title text not null,
  message text not null default '',
  type text not null default 'assigned',
  unread boolean not null default true,
  created_at timestamptz not null default now()
);

-- Invitations (future use)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null default 'Developer',
  invited_by uuid references public.profiles (id) on delete set null,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_projects_workspace on public.projects (workspace_id);
create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_tasks_workspace on public.tasks (workspace_id);
create index if not exists idx_issues_project on public.issues (project_id);
create index if not exists idx_issues_workspace on public.issues (workspace_id);
create index if not exists idx_activities_workspace on public.activities (workspace_id, created_at desc);
create index if not exists idx_task_attachments_ticket on public.task_attachments (ticket_id);

-- Helper: check workspace membership
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and profile_id = auth.uid()
  );
$$;

-- Auto-create profile + workspace membership on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  initials text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'user'), '@', 1)
  );
  initials := upper(substr(display_name, 1, 2));

  insert into public.profiles (id, name, email, avatar, role)
  values (
    new.id,
    display_name,
    coalesce(new.email, ''),
    initials,
    'Developer'
  )
  on conflict (id) do nothing;

  insert into public.workspace_members (workspace_id, profile_id, role)
  values ('00000000-0000-0000-0000-000000000001', new.id, 'member')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.issues enable row level security;
alter table public.saved_queries enable row level security;
alter table public.activities enable row level security;
alter table public.task_attachments enable row level security;
alter table public.releases enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.invitations enable row level security;

-- Profiles policies
create policy "Profiles readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Workspaces policies
create policy "Workspaces readable by members"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

-- Workspace members policies
create policy "Members readable by workspace peers"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Shared workspace data policies (member access)
create policy "Projects: members can read"
  on public.projects for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Projects: members can insert"
  on public.projects for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Projects: members can update"
  on public.projects for update to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Projects: members can delete"
  on public.projects for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Tasks: members can read"
  on public.tasks for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Tasks: members can insert"
  on public.tasks for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Tasks: members can update"
  on public.tasks for update to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Tasks: members can delete"
  on public.tasks for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Issues: members can read"
  on public.issues for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Issues: members can insert"
  on public.issues for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Issues: members can update"
  on public.issues for update to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Issues: members can delete"
  on public.issues for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Saved queries: members can read"
  on public.saved_queries for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Saved queries: members can insert"
  on public.saved_queries for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Saved queries: members can delete"
  on public.saved_queries for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Activities: members can read"
  on public.activities for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Activities: members can insert"
  on public.activities for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Attachments: members can read"
  on public.task_attachments for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Attachments: members can insert"
  on public.task_attachments for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Attachments: members can delete"
  on public.task_attachments for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Releases: members can read"
  on public.releases for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Documents: members can read"
  on public.documents for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Notifications: users can read own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid()::text);

-- Storage policies
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own avatars"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Workspace members can upload attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_workspace_member('00000000-0000-0000-0000-000000000001')
  );

create policy "Workspace members can read attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_workspace_member('00000000-0000-0000-0000-000000000001')
  );

create policy "Workspace members can delete attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_workspace_member('00000000-0000-0000-0000-000000000001')
  );
