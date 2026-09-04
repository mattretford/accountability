import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ThemePicker } from '@/components/theme-picker'
import { createClient } from '@/lib/supabase/server'
import { parseTheme } from '@/lib/theme'

export default async function ThemeSettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')

  const cookieStore = await cookies()
  const theme = parseTheme(cookieStore.get('app-theme')?.value)
  const night = cookieStore.get('app-night')?.value === 'true'

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Settings</p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-950">Change theme</h1>
        </div>
        <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href="/">Done</Link>
      </header>
      <ThemePicker initialNight={night} initialTheme={theme} />
    </main>
  )
}
