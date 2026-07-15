-- Idempotent workspace membership for the default workspace (uses auth.uid())
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
