import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { setHabitCompletion } from '@/app/actions/entries'
import { setDailySpending } from '@/app/actions/spending'
import { CompletionButton } from '@/components/completion-button'
import { displayDate, shiftDate, todayDate, validDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { calculateStreak } from '@/lib/streaks'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect('/login')

  const params = await searchParams
  const selectedDate = validDate(params.date) ?? todayDate()

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, description, habit_kind')
    .eq('user_id', authData.user.id)
    .is('archived_at', null)
    .order('created_at')

  if (habitsError) throw new Error(`Could not load habits: ${habitsError.message}`)

  const dailyCommitments = habits.filter((habit) => habit.habit_kind === 'daily_commitment')
  const extraWins = habits.filter((habit) => habit.habit_kind === 'extra_win')
  const habitIds = habits.map((habit) => habit.id)
  const dailyCommitmentIds = dailyCommitments.map((habit) => habit.id)
  const currentDate = todayDate()

  const entriesPromise = habitIds.length
    ? supabase
        .from('habit_entries')
        .select('habit_id, completed')
        .eq('entry_date', selectedDate)
        .in('habit_id', habitIds)
    : { data: [], error: null }

  const streakEntriesPromise = dailyCommitmentIds.length
    ? supabase
        .from('habit_entries')
        .select('habit_id, entry_date')
        .eq('completed', true)
        .lte('entry_date', currentDate)
        .in('habit_id', dailyCommitmentIds)
    : { data: [], error: null }

  const spendingPromise = supabase
    .from('daily_spending')
    .select('amount')
    .eq('user_id', authData.user.id)
    .eq('spend_date', selectedDate)
    .maybeSingle()

  const [entries, streakEntries, spending] = await Promise.all([
    entriesPromise,
    streakEntriesPromise,
    spendingPromise,
  ])

  if (entries.error) throw new Error(`Could not load entries: ${entries.error.message}`)
  if (streakEntries.error) throw new Error(`Could not load streaks: ${streakEntries.error.message}`)
  if (spending.error) throw new Error(`Could not load spending: ${spending.error.message}`)

  const completedByHabit = new Map(
    entries.data?.map((entry) => [entry.habit_id, entry.completed]),
  )
  const completedCount = dailyCommitments.filter((habit) => completedByHabit.get(habit.id)).length
  const extraWinCount = extraWins.filter((habit) => completedByHabit.get(habit.id)).length
  const completedDatesByHabit = new Map<string, string[]>()
  streakEntries.data?.forEach((entry) => {
    const dates = completedDatesByHabit.get(entry.habit_id) ?? []
    dates.push(entry.entry_date)
    completedDatesByHabit.set(entry.habit_id, dates)
  })
  const streaksByHabit = new Map(
    dailyCommitments.map((habit) => [
      habit.id,
      calculateStreak(completedDatesByHabit.get(habit.id) ?? [], currentDate),
    ]),
  )
  const isToday = selectedDate === currentDate
  const isFuture = selectedDate > currentDate

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{isToday ? 'Today' : 'Daily checklist'}</p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-950">{displayDate(selectedDate)}</h1>
          <p className="mt-2 text-sm text-zinc-600">{completedCount} of {dailyCommitments.length} daily commitments completed</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/calendar">Calendar</Link>
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/habits">Manage habits</Link>
          <form action={logout}><button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">Sign out</button></form>
        </div>
      </header>

      <nav aria-label="Choose day" className="mt-8 flex items-center justify-between rounded-xl bg-zinc-100 p-2">
        <Link className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm" href={`/?date=${shiftDate(selectedDate, -1)}`}>← Previous</Link>
        {!isToday && <Link className="px-4 py-2 text-sm font-medium" href="/">Today</Link>}
        <Link className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm" href={`/?date=${shiftDate(selectedDate, 1)}`}>Next →</Link>
      </nav>

      {isFuture && (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This is a future day. You can view it, but commitments, extra wins, and spending cannot be recorded yet.
        </p>
      )}

      <section className="mt-8 space-y-3">
        {dailyCommitments.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-zinc-600">You don&apos;t have any daily commitments yet.</p>
            <Link className="mt-4 inline-block rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white" href="/habits">Create one</Link>
          </div>
        )}

        {dailyCommitments.map((habit) => {
          const completed = completedByHabit.get(habit.id) ?? false
          const streak = streaksByHabit.get(habit.id)!

          return (
            <article className={`rounded-xl border p-5 ${completed ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-white'}`} key={habit.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className={`font-semibold ${completed ? 'text-emerald-900 line-through' : 'text-zinc-950'}`}>{habit.name}</h2>
                  {habit.description && <p className="mt-1 text-sm text-zinc-600">{habit.description}</p>}
                  <p className="mt-2 text-xs font-medium text-amber-700" title="Current streak is calculated through today, or yesterday if today is not complete yet.">
                    🔥 {streak.current} {streak.current === 1 ? 'day' : 'days'} current · Best {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <CompletionButton
                  action={setHabitCompletion}
                  completed={completed}
                  disabled={isFuture}
                  fields={{ habitId: habit.id, entryDate: selectedDate }}
                  itemLabel={habit.name}
                  title={isFuture ? `Unavailable until ${displayDate(selectedDate)}` : undefined}
                />
              </div>
            </article>
          )
        })}
      </section>

      <section className="mt-10 border-t border-zinc-200 pt-8">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">Extra wins</h2>
          <p className="mt-1 text-sm text-zinc-600">Optional wins for this day · {extraWinCount} selected</p>
        </div>

        {extraWins.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No extra wins configured. <Link className="underline" href="/habits">Add one</Link>.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {extraWins.map((habit) => {
              const completed = completedByHabit.get(habit.id) ?? false

              return (
                <CompletionButton
                  action={setHabitCompletion}
                  completed={completed}
                  disabled={isFuture}
                  fields={{ habitId: habit.id, entryDate: selectedDate }}
                  itemLabel={habit.name}
                  key={habit.id}
                  title={isFuture ? 'Extra wins cannot be selected for future days.' : habit.description ?? undefined}
                  variant="tag"
                />
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-10 border-t border-zinc-200 pt-8">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">Daily spending</h2>
          <p className="mt-1 text-sm text-zinc-600">Record your total spending for this day in UK pounds.</p>
        </div>

        <form action={setDailySpending} className="mt-4 flex max-w-sm items-end gap-3">
          <input type="hidden" name="spendDate" value={selectedDate} />
          <label className="flex-1 text-sm font-medium text-zinc-800">
            Amount
            <span className="mt-1 flex overflow-hidden rounded-lg border border-zinc-300 bg-white focus-within:border-zinc-500">
              <span className="grid place-items-center border-r border-zinc-200 bg-zinc-50 px-3 text-zinc-600">£</span>
              <input
                className="min-w-0 flex-1 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-zinc-100"
                defaultValue={spending.data ? spending.data.amount.toFixed(2) : ''}
                disabled={isFuture}
                inputMode="decimal"
                max="9999999999.99"
                min="0"
                name="amount"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
              />
            </span>
          </label>
          <button className="rounded-lg bg-zinc-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={isFuture}>Save</button>
        </form>
      </section>
    </main>
  )
}
