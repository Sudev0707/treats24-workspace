-- Additional RLS policies for full CRUD access

-- Profiles: fallback insert when auth trigger did not run
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- Workspace members: allow self-join to default workspace
create policy "Users can insert own membership"
  on public.workspace_members for insert to authenticated
  with check (profile_id = auth.uid());

-- Saved queries: update
create policy "Saved queries: members can update"
  on public.saved_queries for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Releases: full CRUD
create policy "Releases: members can insert"
  on public.releases for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Releases: members can update"
  on public.releases for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "Releases: members can delete"
  on public.releases for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- Documents: full CRUD
create policy "Documents: members can insert"
  on public.documents for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Documents: members can update"
  on public.documents for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "Documents: members can delete"
  on public.documents for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- Notifications: insert + update + delete own
create policy "Notifications: members can insert"
  on public.notifications for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Notifications: users can update own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy "Notifications: users can delete own"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid()::text);
