'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function loginUrl(message: string, kind: 'error' | 'message' = 'error') {
  return `/login?${kind}=${encodeURIComponent(message)}`
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) redirect(loginUrl('Email and password are required.'))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect(loginUrl(error.message))
  redirect('/habits')
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || password.length < 6) {
    redirect(loginUrl('Enter an email and a password of at least 6 characters.'))
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) redirect(loginUrl(error.message))
  if (data.session) redirect('/habits')

  redirect(loginUrl('Check your email to confirm your account.', 'message'))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
