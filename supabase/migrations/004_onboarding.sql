-- Add onboarding completion flag to profiles
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Existing users skip onboarding
update public.profiles set onboarding_completed = true;

-- New sign-ups start with onboarding incomplete
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

  insert into public.profiles (id, name, email, avatar, role, onboarding_completed)
  values (
    new.id,
    display_name,
    coalesce(new.email, ''),
    initials,
    'Developer',
    false
  )
  on conflict (id) do nothing;

  insert into public.workspace_members (workspace_id, profile_id, role)
  values ('00000000-0000-0000-0000-000000000001', new.id, 'member')
  on conflict do nothing;

  return new;
end;
$$;
