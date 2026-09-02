import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import {
  archiveMonthlyTask,
  copyMonthlyTaskToNextMonth,
  createMonthlyTask,
  setMonthlyTaskCompletion,
} from '@/app/actions/monthly-tasks'
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
  const completedTasks = tasks.data.filter((task) => task.completed).length

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

      <section className="mt-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="font-semibold text-zinc-950">Monthly spending</h2>
          <p className="mt-1 text-sm text-zinc-600">Total recorded across {month.label}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-zinc-950">{formatGBP(monthlySpending)}</p>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">Monthly tasks</h2>
            <p className="mt-1 text-sm text-zinc-600">{completedTasks} of {tasks.data.length} completed for {month.label}</p>
          </div>
        </div>

        <form action={createMonthlyTask} className="mt-5 flex gap-3">
          <input type="hidden" name="month" value={selectedMonth} />
          <input
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2"
            maxLength={200}
            name="title"
            placeholder={`Add a task for ${month.label}`}
            required
          />
          <button className="rounded-lg bg-zinc-950 px-4 py-2 font-medium text-white">Add task</button>
        </form>

        {tasks.data.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-500">No tasks for this month yet.</p>
        ) : (
          <div className="mt-5 space-y-2">
            {tasks.data.map((task) => (
              <article className={`flex items-center gap-3 rounded-lg border p-3 ${task.completed ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200'}`} key={task.id}>
                <form action={setMonthlyTaskCompletion}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="month" value={selectedMonth} />
                  <input type="hidden" name="completed" value={String(!task.completed)} />
                  <button
                    aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
                    aria-pressed={task.completed}
                    className={`grid size-9 place-items-center rounded-full border font-bold ${task.completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 text-transparent'}`}
                  >
                    ✓
                  </button>
                </form>
                <p className={`min-w-0 flex-1 ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>{task.title}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <form action={copyMonthlyTaskToNextMonth}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="month" value={selectedMonth} />
                    <button className="text-sm font-medium text-zinc-700 underline underline-offset-2">Add to next month</button>
                  </form>
                  <form action={archiveMonthlyTask}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="month" value={selectedMonth} />
                    <button className="text-sm text-zinc-500 underline underline-offset-2">Archive</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
