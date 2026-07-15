-- Idempotent fixes for workspace membership (safe to re-run on hosted Supabase)

-- Allow users to join the default workspace themselves
do $$
begin
  create policy "Users can insert own membership"
    on public.workspace_members for insert to authenticated
    with check (profile_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

-- Security-definer RPC used by the app when available
create or replace function public.ensure_default_workspace_membership()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.workspace_members (workspace_id, profile_id, role)
  values ('00000000-0000-0000-0000-000000000001', auth.uid(), 'member')
  on conflict do nothing;
end;
$$;

revoke all on function public.ensure_default_workspace_membership() from public;
grant execute on function public.ensure_default_workspace_membership() to authenticated;
