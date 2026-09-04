'use client'

import { useState } from 'react'
import { THEMES, type ThemeId } from '@/lib/theme'

const COOKIE_AGE = 60 * 60 * 24 * 365

function setPreference(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_AGE}; samesite=lax`
}

export function ThemePicker({
  initialNight,
  initialTheme,
}: {
  initialNight: boolean
  initialTheme: ThemeId
}) {
  const [theme, setTheme] = useState(initialTheme)
  const [night, setNight] = useState(initialNight)

  function chooseTheme(nextTheme: ThemeId) {
    setTheme(nextTheme)
    setPreference('app-theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  function toggleNight() {
    const nextNight = !night
    setNight(nextNight)
    setPreference('app-night', String(nextNight))
    document.documentElement.setAttribute('data-mode', nextNight ? 'night' : 'light')
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-950">Palette</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {THEMES.map((option) => (
            <button
              aria-pressed={theme === option.id}
              className={`rounded-xl border px-4 py-4 text-left font-semibold ${theme === option.id ? 'border-emerald-600 bg-emerald-50' : 'border-zinc-300 bg-white'}`}
              key={option.id}
              onClick={() => chooseTheme(option.id)}
              type="button"
            >
              {option.name}
            </button>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Night mode</h2>
          <p className="mt-1 text-sm text-zinc-600">Use the darker version of the selected palette.</p>
        </div>
        <button
          aria-checked={night}
          aria-label="Night mode"
          className={`relative h-8 w-14 shrink-0 rounded-full border transition ${night ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300 bg-zinc-100'}`}
          onClick={toggleNight}
          role="switch"
          type="button"
        >
          <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${night ? 'left-7' : 'left-1'}`} />
        </button>
      </section>
    </div>
  )
}
