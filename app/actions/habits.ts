'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { HabitKind } from '@/lib/database.types'

async function authenticatedClient() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) redirect('/login')
  return { supabase, user: data.user }
}

function requiredText(formData: FormData, field: string) {
  return String(formData.get(field) ?? '').trim()
}

export async function createHabit(formData: FormData) {
  const name = requiredText(formData, 'name')
  const description = requiredText(formData, 'description')
  const kind = requiredText(formData, 'kind')
  if (!name || name.length > 100 || !isHabitKind(kind)) return

  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase.from('habits').insert({
    user_id: user.id,
    name,
    description: description || null,
    habit_kind: kind,
  })

  if (error) throw new Error(`Could not create habit: ${error.message}`)
  revalidatePath('/habits')
}

function isHabitKind(value: string): value is HabitKind {
  return value === 'daily_commitment' || value === 'extra_win'
}

export async function updateHabit(formData: FormData) {
  const id = requiredText(formData, 'id')
  const name = requiredText(formData, 'name')
  const description = requiredText(formData, 'description')
  if (!id || !name || name.length > 100) return

  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('habits')
    .update({ name, description: description || null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Could not update habit: ${error.message}`)
  revalidatePath('/habits')
}

export async function archiveHabit(formData: FormData) {
  const id = requiredText(formData, 'id')
  if (!id) return

  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Could not archive habit: ${error.message}`)
  revalidatePath('/habits')
}
