import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { setHabitCompletion } from '@/app/actions/entries'
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

  const [entries, streakEntries] = await Promise.all([
    entriesPromise,
    streakEntriesPromise,
  ])

  if (entries.error) throw new Error(`Could not load entries: ${entries.error.message}`)
  if (streakEntries.error) throw new Error(`Could not load streaks: ${streakEntries.error.message}`)

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
          This is a future day. You can view it, but commitments and extra wins cannot be selected yet.
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
              <form action={setHabitCompletion} className="flex items-center justify-between gap-4">
                <input type="hidden" name="habitId" value={habit.id} />
                <input type="hidden" name="entryDate" value={selectedDate} />
                <input type="hidden" name="completed" value={String(!completed)} />
                <div>
                  <h2 className={`font-semibold ${completed ? 'text-emerald-900' : 'text-zinc-950'}`}>{habit.name}</h2>
                  {habit.description && <p className="mt-1 text-sm text-zinc-600">{habit.description}</p>}
                  <p className="mt-2 text-xs font-medium text-amber-700" title="Current streak is calculated through today, or yesterday if today is not complete yet.">
                    🔥 {streak.current} {streak.current === 1 ? 'day' : 'days'} current · Best {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <button
                  aria-label={isFuture ? `Unavailable until ${displayDate(selectedDate)}: ${habit.name}` : `${completed ? 'Mark incomplete' : 'Mark complete'}: ${habit.name}`}
                  aria-pressed={completed}
                  className={`grid size-11 shrink-0 place-items-center rounded-full border text-xl font-bold disabled:cursor-not-allowed disabled:opacity-40 ${completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 bg-white text-transparent'}`}
                  disabled={isFuture}
                >
                  ✓
                </button>
              </form>
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
                <form action={setHabitCompletion} key={habit.id}>
                  <input type="hidden" name="habitId" value={habit.id} />
                  <input type="hidden" name="entryDate" value={selectedDate} />
                  <input type="hidden" name="completed" value={String(!completed)} />
                  <button
                    aria-pressed={completed}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${completed ? 'border-violet-600 bg-violet-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-violet-400'}`}
                    disabled={isFuture}
                    title={isFuture ? 'Extra wins cannot be selected for future days.' : habit.description ?? undefined}
                  >
                    {completed && <span aria-hidden="true">✓ </span>}{habit.name}
                  </button>
                </form>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
