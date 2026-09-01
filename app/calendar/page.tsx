import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { monthDetails, shiftMonth, todayDate, validMonth } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect('/login')

  const params = await searchParams
  const today = todayDate()
  const selectedMonth = validMonth(params.month) ?? today.slice(0, 7)
  const month = monthDetails(selectedMonth)

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, habit_kind')
    .eq('user_id', authData.user.id)
    .is('archived_at', null)

  if (habitsError) throw new Error(`Could not load habits: ${habitsError.message}`)

  const dailyHabitIds = new Set(habits.filter((habit) => habit.habit_kind === 'daily_commitment').map((habit) => habit.id))
  const habitIds = habits.map((habit) => habit.id)
  const entries = habitIds.length
    ? await supabase
        .from('habit_entries')
        .select('entry_date, habit_id')
        .eq('completed', true)
        .gte('entry_date', month.firstDate)
        .lte('entry_date', month.lastDate)
        .in('habit_id', habitIds)
    : { data: [], error: null }

  if (entries.error) throw new Error(`Could not load calendar: ${entries.error.message}`)

  const commitmentsByDate = new Map<string, number>()
  const extraWinsByDate = new Map<string, number>()
  entries.data?.forEach((entry) => {
    const counts = dailyHabitIds.has(entry.habit_id) ? commitmentsByDate : extraWinsByDate
    counts.set(entry.entry_date, (counts.get(entry.entry_date) ?? 0) + 1)
  })

  const cells = [
    ...Array.from({ length: month.leadingDays }, () => null),
    ...Array.from({ length: month.daysInMonth }, (_, index) => index + 1),
  ]

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Calendar</p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-950">{month.label}</h1>
          <p className="mt-2 text-sm text-zinc-600">Daily commitment progress and extra wins</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/">Today</Link>
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/habits">Manage habits</Link>
          <form action={logout}><button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">Sign out</button></form>
        </div>
      </header>

      <nav aria-label="Choose month" className="mt-8 flex items-center justify-between rounded-xl bg-zinc-100 p-2">
        <Link className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm" href={`/calendar?month=${shiftMonth(selectedMonth, -1)}`}>← Previous</Link>
        {selectedMonth !== today.slice(0, 7) && <Link className="px-4 py-2 text-sm font-medium" href="/calendar">This month</Link>}
        <Link className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm" href={`/calendar?month=${shiftMonth(selectedMonth, 1)}`}>Next →</Link>
      </nav>

      <section className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200" aria-label={month.label}>
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAYS.map((weekday) => (
            <div className="bg-zinc-100 px-1 py-3 text-center text-xs font-semibold text-zinc-600 sm:text-sm" key={weekday}>{weekday}</div>
          ))}

          {cells.map((day, index) => {
            if (day === null) return <div className="min-h-24 bg-zinc-50 sm:min-h-32" key={`empty-${index}`} />

            const date = `${selectedMonth}-${String(day).padStart(2, '0')}`
            const completed = commitmentsByDate.get(date) ?? 0
            const extraWins = extraWinsByDate.get(date) ?? 0
            const allCompleted = dailyHabitIds.size > 0 && completed === dailyHabitIds.size

            return (
              <Link
                className={`min-h-24 p-2 transition hover:bg-zinc-50 sm:min-h-32 sm:p-3 ${date === today ? 'ring-2 ring-inset ring-zinc-900' : ''} ${allCompleted ? 'bg-emerald-50' : 'bg-white'}`}
                href={`/?date=${date}`}
                key={date}
              >
                <span className={`inline-grid size-7 place-items-center rounded-full text-sm ${date === today ? 'bg-zinc-950 font-semibold text-white' : 'text-zinc-700'}`}>{day}</span>
                {dailyHabitIds.size > 0 && (
                  <div className="mt-3">
                    <p className={`text-xs font-medium sm:text-sm ${allCompleted ? 'text-emerald-700' : 'text-zinc-600'}`}>{completed}/{dailyHabitIds.size}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(completed / dailyHabitIds.size) * 100}%` }} />
                    </div>
                  </div>
                )}
                {extraWins > 0 && <p className="mt-2 text-xs font-medium text-violet-700">+{extraWins} {extraWins === 1 ? 'win' : 'wins'}</p>}
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
