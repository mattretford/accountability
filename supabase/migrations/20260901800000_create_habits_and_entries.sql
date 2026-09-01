create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  color text,
  schedule jsonb not null default '{"frequency":"daily"}'::jsonb,
  metric_kind text not null default 'boolean' check (metric_kind in ('boolean', 'number')),
  metric_unit text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  entry_date date not null,
  completed boolean not null default false,
  numeric_value numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, entry_date)
);

create index habits_user_id_idx on public.habits (user_id);
create index habit_entries_habit_id_entry_date_idx
  on public.habit_entries (habit_id, entry_date desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger habit_entries_set_updated_at
before update on public.habit_entries
for each row execute function public.set_updated_at();

alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;

create policy "Users can read their habits"
on public.habits for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their habits"
on public.habits for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their habits"
on public.habits for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their habits"
on public.habits for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read entries for their habits"
on public.habit_entries for select
to authenticated
using (
  exists (
    select 1 from public.habits
    where habits.id = habit_entries.habit_id
      and habits.user_id = (select auth.uid())
  )
);

create policy "Users can create entries for their habits"
on public.habit_entries for insert
to authenticated
with check (
  exists (
    select 1 from public.habits
    where habits.id = habit_entries.habit_id
      and habits.user_id = (select auth.uid())
  )
);

create policy "Users can update entries for their habits"
on public.habit_entries for update
to authenticated
using (
  exists (
    select 1 from public.habits
    where habits.id = habit_entries.habit_id
      and habits.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.habits
    where habits.id = habit_entries.habit_id
      and habits.user_id = (select auth.uid())
  )
);

create policy "Users can delete entries for their habits"
on public.habit_entries for delete
to authenticated
using (
  exists (
    select 1 from public.habits
    where habits.id = habit_entries.habit_id
      and habits.user_id = (select auth.uid())
  )
);
