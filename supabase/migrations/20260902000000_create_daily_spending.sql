create table public.daily_spending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  spend_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, spend_date),
  constraint daily_spending_not_future
    check (spend_date <= (now() at time zone 'Europe/London')::date)
);

create index daily_spending_user_date_idx
on public.daily_spending (user_id, spend_date desc);

create trigger daily_spending_set_updated_at
before update on public.daily_spending
for each row execute function public.set_updated_at();

alter table public.daily_spending enable row level security;

create policy "Users can read their spending"
on public.daily_spending for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their spending"
on public.daily_spending for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their spending"
on public.daily_spending for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their spending"
on public.daily_spending for delete
to authenticated
using ((select auth.uid()) = user_id);
