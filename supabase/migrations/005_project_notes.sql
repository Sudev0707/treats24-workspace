-- Project notes: multiple notes per project

create table if not exists public.project_notes (
  id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null,
  body text not null default '',
  author_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_notes_project on public.project_notes (project_id);
create index if not exists idx_project_notes_workspace on public.project_notes (workspace_id);

alter table public.project_notes enable row level security;

create policy "Project notes: members can read"
  on public.project_notes for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Project notes: members can insert"
  on public.project_notes for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Project notes: members can update"
  on public.project_notes for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "Project notes: members can delete"
  on public.project_notes for delete to authenticated
  using (public.is_workspace_member(workspace_id));
