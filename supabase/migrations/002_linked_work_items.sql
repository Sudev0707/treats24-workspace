-- Bidirectional work item links (Jira-style "relates to")
alter table public.tasks
  add column if not exists linked_item_ids text[] not null default '{}';

alter table public.issues
  add column if not exists linked_item_ids text[] not null default '{}';
