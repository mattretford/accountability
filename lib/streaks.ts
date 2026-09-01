import { shiftDate } from './dates'

export type Streak = {
  current: number
  longest: number
}

export function calculateStreak(
  completedDates: Iterable<string>,
  today: string,
): Streak {
  const dates = new Set(
    Array.from(completedDates).filter((date) => date <= today),
  )

  const sortedDates = Array.from(dates).sort()
  let longest = 0
  let run = 0
  let previous: string | null = null

  for (const date of sortedDates) {
    run = previous && shiftDate(previous, 1) === date ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = date
  }

  let cursor = dates.has(today) ? today : shiftDate(today, -1)
  let current = 0

  while (dates.has(cursor)) {
    current += 1
    cursor = shiftDate(cursor, -1)
  }

  return { current, longest }
}
