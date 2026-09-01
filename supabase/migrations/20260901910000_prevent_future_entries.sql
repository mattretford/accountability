alter table public.habit_entries
add constraint habit_entries_not_future
check (entry_date <= (now() at time zone 'Europe/London')::date);
