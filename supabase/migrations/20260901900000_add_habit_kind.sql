alter table public.habits
add column habit_kind text not null default 'daily_commitment'
check (habit_kind in ('daily_commitment', 'extra_win'));

create index habits_user_id_kind_active_idx
on public.habits (user_id, habit_kind)
where archived_at is null;
