'use client'

import { useState } from 'react'
import {
  archiveMonthlyTask,
  copyMonthlyTaskToNextMonth,
  createMonthlyTask,
  setMonthlyTaskCompletion,
} from '@/app/actions/monthly-tasks'
import { CompletionButton } from '@/components/completion-button'

type MonthlyTask = {
  id: string
  title: string
  completed: boolean
}

export function MonthlyTasks({
  month,
  monthLabel,
  tasks,
}: {
  month: string
  monthLabel: string
  tasks: MonthlyTask[]
}) {
  const [editing, setEditing] = useState(false)
  const completedTasks = tasks.filter((task) => task.completed).length

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">Monthly tasks</h2>
          <p className="mt-1 text-sm text-zinc-600">{completedTasks} of {tasks.length} completed for {monthLabel}</p>
        </div>
        <button
          aria-expanded={editing}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium"
          onClick={() => setEditing((value) => !value)}
          type="button"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <form action={createMonthlyTask} className="mt-5 flex gap-3">
        <input type="hidden" name="month" value={month} />
        <input
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2"
          maxLength={200}
          name="title"
          placeholder={`Add a task for ${monthLabel}`}
          required
        />
        <button className="shrink-0 rounded-lg bg-zinc-950 px-4 py-2 font-medium text-white">Add task</button>
      </form>

      {tasks.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-500">No tasks for this month yet.</p>
      ) : (
        <div className="mt-5 space-y-2">
          {tasks.map((task) => (
            <article className={`flex items-center gap-3 rounded-lg border p-3 ${editing ? 'flex-wrap sm:flex-nowrap' : ''} ${task.completed ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200'}`} key={task.id}>
              <CompletionButton
                action={setMonthlyTaskCompletion}
                completed={task.completed}
                fields={{ id: task.id, month }}
                itemLabel={task.title}
                size="small"
              />
              <p className={`min-w-0 flex-1 ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>{task.title}</p>

              {editing && (
                <div className="ml-12 flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto sm:w-auto sm:shrink-0">
                  <form action={copyMonthlyTaskToNextMonth}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="month" value={month} />
                    <button className="text-sm font-medium text-zinc-700 underline underline-offset-2">Add to next month</button>
                  </form>
                  <form action={archiveMonthlyTask}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="month" value={month} />
                    <button className="text-sm text-zinc-500 underline underline-offset-2">Archive</button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
