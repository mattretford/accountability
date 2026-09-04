import Link from 'next/link'
import { redirect } from 'next/navigation'
import { archiveHabit, createHabit, updateHabit } from '@/app/actions/habits'
import { SettingsMenu } from '@/components/settings-menu'
import { createClient } from '@/lib/supabase/server'
import type { HabitKind } from '@/lib/database.types'

type Habit = {
  id: string
  name: string
  description: string | null
  archived_at: string | null
  habit_kind: HabitKind
}

function HabitSection({
  title,
  description,
  kind,
  habits,
}: {
  title: string
  description: string
  kind: HabitKind
  habits: Habit[]
}) {
  return (
    <section className="mt-8">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>

      <form action={createHabit} className="mt-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="kind" value={kind} />
        <input className="rounded-lg border border-zinc-300 px-3 py-2" name="name" placeholder="Name" maxLength={100} required />
        <input className="rounded-lg border border-zinc-300 px-3 py-2" name="description" placeholder="Description (optional)" />
        <button className="rounded-lg bg-zinc-950 px-4 py-2 font-medium text-white">Add</button>
      </form>

      <div className="mt-4 space-y-3">
        {habits.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-zinc-600">None added yet.</p>}
        {habits.map((habit) => (
          <article className="rounded-xl border border-zinc-200 bg-white p-4" key={habit.id}>
            <form action={updateHabit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="id" value={habit.id} />
              <input className="rounded-lg border border-zinc-300 px-3 py-2" name="name" defaultValue={habit.name} maxLength={100} required />
              <input className="rounded-lg border border-zinc-300 px-3 py-2" name="description" defaultValue={habit.description ?? ''} placeholder="Description" />
              <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium">Save</button>
            </form>
            <form action={archiveHabit} className="mt-3 text-right">
              <input type="hidden" name="id" value={habit.id} />
              <button className="text-sm text-zinc-500 underline underline-offset-2">Archive</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  )
}

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect('/login')

  const { data: habits, error } = await supabase
    .from('habits')
    .select('id, name, description, archived_at, habit_kind')
    .eq('user_id', authData.user.id)
    .order('created_at')

  if (error) throw new Error(`Could not load habits: ${error.message}`)

  const dailyCommitments = habits.filter((habit) => !habit.archived_at && habit.habit_kind === 'daily_commitment')
  const extraWins = habits.filter((habit) => !habit.archived_at && habit.habit_kind === 'extra_win')
  const archivedHabits = habits.filter((habit) => habit.archived_at)

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-950">Habits</h1>
          <p className="mt-1 text-sm text-zinc-600">Commitments and extra wins for {authData.user.email}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/">Today</Link>
          <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/calendar">Calendar</Link>
          <SettingsMenu />
        </div>
      </header>

      <HabitSection title="Daily commitments" description="Things you intend to complete every day." kind="daily_commitment" habits={dailyCommitments} />
      <HabitSection title="Extra wins" description="Optional positives that are worth recording when they happen." kind="extra_win" habits={extraWins} />

      {archivedHabits.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-600">Archived</h2>
          <ul className="mt-3 space-y-2 text-zinc-500">
            {archivedHabits.map((habit) => <li className="flex justify-between rounded-lg bg-zinc-100 px-4 py-3" key={habit.id}><span>{habit.name}</span><span className="text-xs uppercase tracking-wide">{habit.habit_kind === 'extra_win' ? 'Extra win' : 'Daily'}</span></li>)}
          </ul>
        </section>
      )}
    </main>
  )
}
