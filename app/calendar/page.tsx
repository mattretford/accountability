import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MonthlyTasks } from '@/components/monthly-tasks'
import { SettingsMenu } from '@/components/settings-menu'
import { monthDetails, shiftMonth, todayDate, validMonth } from '@/lib/dates'
import { formatGBP, sumCurrency } from '@/lib/money'
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
  const entriesPromise = habitIds.length
    ? supabase
        .from('habit_entries')
        .select('entry_date, habit_id')
        .eq('completed', true)
        .gte('entry_date', month.firstDate)
        .lte('entry_date', month.lastDate)
        .in('habit_id', habitIds)
    : { data: [], error: null }

  const spendingPromise = supabase
    .from('daily_spending')
    .select('amount')
    .eq('user_id', authData.user.id)
    .gte('spend_date', month.firstDate)
    .lte('spend_date', month.lastDate)

  const tasksPromise = supabase
    .from('monthly_tasks')
    .select('id, title, completed')
    .eq('user_id', authData.user.id)
    .eq('task_month', month.firstDate)
    .is('archived_at', null)
    .order('created_at')

  const [entries, spending, tasks] = await Promise.all([
    entriesPromise,
    spendingPromise,
    tasksPromise,
  ])

  if (entries.error) throw new Error(`Could not load calendar: ${entries.error.message}`)
  if (spending.error) throw new Error(`Could not load spending: ${spending.error.message}`)
  if (tasks.error) throw new Error(`Could not load monthly tasks: ${tasks.error.message}`)

  const monthlySpending = sumCurrency(
    spending.data?.map((record) => record.amount) ?? [],
  )
  const commitmentsByDate = new Map<string, number>()
  const extraWinsByDate = new Map<string, number>()
  entries.data?.forEach((entry) => {
    const counts = dailyHabitIds.has(entry.habit_id) ? commitmentsByDate : extraWinsByDate
    counts.set(entry.entry_date, (counts.get(entry.entry_date) ?? 0) + 1)
  })

  const trailingDays = (7 - ((month.leadingDays + month.daysInMonth) % 7)) % 7
  const cells = [
    ...Array.from({ length: month.leadingDays }, () => null),
    ...Array.from({ length: month.daysInMonth }, (_, index) => index + 1),
    ...Array.from({ length: trailingDays }, () => null),
  ]

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Calendar</p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-950">{month.label}</h1>
          <p className="mt-2 text-sm text-zinc-600">Daily commitment progress and extra wins</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/">Today</Link>
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/habits">Manage habits</Link>
          <SettingsMenu />
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
                  <svg
                    aria-label={`${completed} of ${dailyHabitIds.size} daily commitments completed`}
                    className="mt-3 size-8 -rotate-90"
                    role="img"
                    viewBox="0 0 32 32"
                  >
                    <circle className="calendar-ring-track fill-none" cx="16" cy="16" pathLength="100" r="11" strokeWidth="5" />
                    <circle
                      className="calendar-ring-progress fill-none"
                      cx="16"
                      cy="16"
                      pathLength="100"
                      r="11"
                      strokeDasharray={`${(completed / dailyHabitIds.size) * 100} 100`}
                      strokeLinecap="round"
                      strokeWidth="5"
                    />
                  </svg>
                )}
                {extraWins > 0 && <p className="mt-2 text-xs font-medium text-violet-700">+{extraWins} {extraWins === 1 ? 'win' : 'wins'}</p>}
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mt-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="font-semibold text-zinc-950">Monthly spending</h2>
          <p className="mt-1 text-sm text-zinc-600">Total recorded across {month.label}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-zinc-950">{formatGBP(monthlySpending)}</p>
      </section>

      <MonthlyTasks key={selectedMonth} month={selectedMonth} monthLabel={month.label} tasks={tasks.data} />
    </main>
  )
}
