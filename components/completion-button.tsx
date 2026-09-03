'use client'

import { useState } from 'react'

type CompletionButtonProps = {
  action: (formData: FormData) => Promise<void>
  completed: boolean
  disabled?: boolean
  fields: Record<string, string>
  itemLabel: string
  size?: 'small' | 'large'
  title?: string
  variant?: 'circle' | 'tag'
}

export function CompletionButton({
  action,
  completed,
  disabled = false,
  fields,
  itemLabel,
  size = 'large',
  title,
  variant = 'circle',
}: CompletionButtonProps) {
  const [pendingValue, setPendingValue] = useState<boolean | null>(null)
  const [animationRun, setAnimationRun] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const visualCompleted = pendingValue ?? completed
  const animationActive = visualCompleted && animationRun > 0

  async function submit(formData: FormData) {
    const nextCompleted = formData.get('completed') === 'true'
    setPendingValue(nextCompleted)
    setIsPending(true)

    if (nextCompleted) setAnimationRun((run) => run + 1)

    try {
      await action(formData)
    } finally {
      setPendingValue(null)
      setIsPending(false)
    }
  }

  const circleSize = size === 'small' ? 'size-9' : 'size-11 text-xl'
  const buttonClass = variant === 'tag'
    ? `fire-blast-button rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${visualCompleted ? 'border-violet-600 bg-violet-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-violet-400'}`
    : `fire-blast-button grid ${circleSize} shrink-0 place-items-center rounded-full border font-bold disabled:cursor-not-allowed disabled:opacity-40 ${visualCompleted ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300 bg-white'}`

  return (
    <form action={submit} className="relative shrink-0">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="completed" value={String(!visualCompleted)} />
      <button
        aria-label={`${disabled ? 'Unavailable' : visualCompleted ? 'Mark incomplete' : 'Mark complete'}: ${itemLabel}`}
        aria-pressed={visualCompleted}
        className={`${buttonClass} ${animationActive ? 'fire-blast-active' : ''}`}
        disabled={disabled || isPending}
        key={`${animationRun}-${visualCompleted}`}
        title={title}
      >
        {variant === 'tag' && <span className="relative z-10">{itemLabel}</span>}
        {visualCompleted && (
          <span
            aria-hidden="true"
            className={`fire-checkmark relative z-10 ${animationActive ? 'fire-checkmark-active' : ''} ${variant === 'tag' ? 'ml-1' : ''}`}
          >
            ✓
          </span>
        )}
      </button>
    </form>
  )
}
