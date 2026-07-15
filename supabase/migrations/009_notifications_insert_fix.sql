-- Fix notification creation: allow workspace members to notify other members

drop policy if exists "Notifications: members can insert" on public.notifications;

create policy "Notifications: members can insert"
  on public.notifications for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.profile_id::text = user_id
    )
  );

create or replace function public.create_workspace_notification(
  p_id text,
  p_workspace_id uuid,
  p_user_id text,
  p_title text,
  p_message text default '',
  p_type text default 'status',
  p_unread boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a workspace member';
  end if;

  if not exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.profile_id::text = p_user_id
  ) then
    return;
  end if;

  insert into public.notifications (id, workspace_id, user_id, title, message, type, unread)
  values (p_id, p_workspace_id, p_user_id, p_title, p_message, p_type, p_unread)
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.create_workspace_notification from public;
grant execute on function public.create_workspace_notification to authenticated;
