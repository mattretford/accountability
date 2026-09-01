import { redirect } from 'next/navigation'
import { login, signup } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) redirect('/habits')

  const params = await searchParams

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Habit tracker</h1>
        <p className="mt-2 text-sm text-zinc-600">Sign in or create an account to manage your habits.</p>

        {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
        {params.message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{params.message}</p>}

        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-zinc-800">
            Email
            <input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="email" type="email" required />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Password
            <input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="password" type="password" minLength={6} required />
          </label>
          <div className="flex gap-3">
            <button className="flex-1 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white" formAction={login}>Sign in</button>
            <button className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800" formAction={signup}>Create account</button>
          </div>
        </form>
      </section>
    </main>
  )
}
