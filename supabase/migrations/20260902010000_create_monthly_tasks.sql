create table public.monthly_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_month date not null check (extract(day from task_month) = 1),
  title text not null check (char_length(trim(title)) between 1 and 200),
  completed boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index monthly_tasks_user_month_active_idx
on public.monthly_tasks (user_id, task_month)
where archived_at is null;

create trigger monthly_tasks_set_updated_at
before update on public.monthly_tasks
for each row execute function public.set_updated_at();

alter table public.monthly_tasks enable row level security;

create policy "Users can read their monthly tasks"
on public.monthly_tasks for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their monthly tasks"
on public.monthly_tasks for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their monthly tasks"
on public.monthly_tasks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their monthly tasks"
on public.monthly_tasks for delete
to authenticated
using ((select auth.uid()) = user_id);
